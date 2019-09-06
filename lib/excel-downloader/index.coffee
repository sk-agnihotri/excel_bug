http = require  '../httpclient'
Converter = require("csvtojson").Converter
XLSX = require 'xlsx'
StreamMeter = require "stream-meter"

Globalize = require 'globalize'
Globalize.load require( "cldr-data/main/en/numbers" ),
  require( "cldr-data/supplemental/likelySubtags" )

class ExcelDownloader
  constructor: (@_workbookName) ->
    @_http = http
    @_filename = "#{@_workbookName}.xlsx"

    @_workbook =
      SheetNames: []
      Sheets: {}


  _inject: (dependencies) ->
    @_http = dependencies.http ? @_http


  _getDelimiter: ->
    config.tableauCsvSeparator ? ';'


  _pipeCvsToJson: (readStream) ->
    rowNum = 0
    converter = new Converter
      constructResult: false
      noheader: true
      delimiter: @_getDelimiter()

    columnNames = null
    fieldNames = null
    ws = {}
    meter = StreamMeter config.maxCSVSize

    new Promise (resolve, reject) =>
      readStream.pipe(meter).pipe(converter)
      
      meter.on 'data', (data) -> return data

      meter.on 'error', ->
        reject {status: 'TOO_BIG_FILE', message: "Report size exceeded the supported maximum (#{config.maxCSVSize / 1024 / 1024} mb)"}

      converter.on "record_parsed", (jsonObj) =>
        if rowNum is 0
          Logger.log "info", "Report has been generated. Started downloading and processing CSV data..."
          columnNames = @_getColumnNames jsonObj
          fieldNames = @_getFieldNames jsonObj
          @_addHeader columnNames, ws
        else
          for colName, colNum in columnNames
            cell_ref = XLSX.utils.encode_cell {c: colNum, r: rowNum}
            ws[cell_ref] = @_getCell jsonObj[fieldNames[colNum]]

        rowNum++

      converter.on 'end_parsed', ->
        if  columnNames? and rowNum > 0
          range =
            s: {c: 0, r: 0}
            e: {c: columnNames.length, r: rowNum }

          ws['!ref'] = XLSX.utils.encode_range range
          Logger.log "info", "CSV data has been downloaded and processed."
        resolve ws


  _getCsvAsWorksheet: (url) ->
    stream = @_http.getReadStream url

    stream.on 'data', (data) -> return data

    @_pipeCvsToJson stream
    .catch (err) ->
      stream.abort()
      Promise.reject err


  _addHeader: (columnNames, sheet) ->
    for colName, colNum in columnNames
      cell = {v: colName, t: 's'}

      cell_ref = XLSX.utils.encode_cell {c: colNum, r: 0}
      sheet[cell_ref] = cell


  _convertToDate: (val) ->
    regex = /^\d{1,2}\/\d{1,2}\/\d{4}\W\d{1,2}:\d{1,2}:\d{1,2}\W[a,A,p,P][m,M]$/
    value = val.match regex
    if value is null then null else new Date val


  _parseAsPureNumber: (val) ->
    regex = /^[+-]?[\d,\.]+[eE]?[\d\+\-]*$/
    if val is null or val is undefined or not val.match regex then return null
    parsed = Globalize('en').numberParser() val
    if parsed is null or _.isNaN parsed then null else parsed


  _parseAsCurrency: (val) ->
    regex = /^[+-]?\$([\W\w]*)/
    match = if val? then val.match regex else null

    if match?
      noDollar = val.replace '$', ''
      @_parseAsPureNumber noDollar
    else null


  _parseAsPercentage: (val) ->
    if val?[val.length - 1] is '%'
      @_parseAsPureNumber val.substring 0, val.length - 1
    else null


  _parseAsNumberInParenthesis: (val) ->
    regex = /^\((.*)\)$/
    res =  @_parseAsNumber (val.match regex)?[1]
    if res isnt null then (- res) else null


  _parseAsNumber: (val) ->
    res = @_parseAsCurrency val
    if res isnt null then return res

    res = @_parseAsPercentage val
    if res isnt null then return res

    return @_parseAsPureNumber val


  _getCell: (val) ->
    cell =
      v: val
      t: 's'
  
    if typeof cell.v is 'number'
      cell.t = 'n'
      return cell

    date = @_convertToDate cell.v

    if date isnt null
      cell.t = 'd'
      cell.v = date
      return cell

    num = @_parseAsNumber val

    if num is null then num = @_parseAsNumberInParenthesis val

    if num isnt null
      cell.t = 'n'
      cell.v = num
      return cell

    return cell


  _getColumnNames: (jsonObj) ->
    _.values jsonObj


  _getFieldNames: (jsonObj) ->
    _.keys jsonObj


  _createSheetFromJson: (json) ->
    if not json?[0] then return null
    columnNames = @_getColumnNames json[0]
    fieldNames = @_getFieldNames json[0]
    ws = {}

    range =
      s: {c: 0, r: 0}
      e: {c: columnNames.length, r: json.length - 1 }
    @_addHeader columnNames, ws

    for data, rowNum in _.tail json
      for colName, colNum in columnNames
        cell_ref = XLSX.utils.encode_cell {c: colNum, r: rowNum + 1}
        ws[cell_ref] = @_getCell data[fieldNames[colNum]]

    ws['!ref'] = XLSX.utils.encode_range range
    return ws


  _s2ab = (s) ->
    buf = new ArrayBuffer s.length
    view = new Uint8Array buf

    for v, i in view
      view[i] = s.charCodeAt(i) & 0xFF
    
    return buf


  _createBinaryString: (workbook, wopts) ->
    wbout = XLSX.write workbook, {bookType: "xlsx", cellDates: true, type: 'binary'}
    buf = new Buffer wbout.length
    view = new Uint8Array buf

    for v, i in view
      buf[i] = wbout.charCodeAt(i) & 0xFF

    return buf

        
  download: (params) ->
    _.reduce params.viewIds, (promise, viewId, viewName) =>
      promise.then =>
        Logger.log "info", "Generating #{@_workbookName} - #{params.view} - #{viewName}..."
        url = "#{params.vizqlRoot}/exportcrosstab/sessions/#{params.sessionId}/views/#{viewId}?charset=utf8&download=true"
        @_getCsvAsWorksheet(url).then (ws) =>
          if ws? and _.keys(ws).length > 0
            # Escape sheet name for this bug: https://github.com/SheetJS/js-xlsx/issues/376
            escViewName = _.escape(viewName)
            @_workbook.SheetNames.push escViewName
            @_workbook.Sheets[escViewName] = ws
            Logger.log "info", "Excel sheet generated for #{@_workbookName} - #{params.view} - #{viewName}"
          else
            Logger.log "error",  "No data downloaded for #{viewName}"
    , Promise.resolve()


  flush: ->
    if @_workbook.SheetNames.length > 0
      res = @_createBinaryString @_workbook
      Logger.log "info", "File #{@_filename} generated."
      return res
    else
      msg = "File #{@_filename}: nothing to write (no data added to file)"
      Logger.log "error", msg
      throw {status: 'EMPTY_REPORT', message: msg}
      return null

  getFileName: -> @_filename

module.exports = ExcelDownloader
