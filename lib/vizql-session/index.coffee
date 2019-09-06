http = require  '../httpclient'
utils = require '../utils'

class VizqlSession
  _reportGenError: ->
    new Error "Error happened during Tableau report generation, support team contacted."


  _getValueFromEmbedResponse: (key, body) ->
    regexp = ///"?#{key}"?:\s?(['"])((?:.(?!\1))*.?)\1///
    value = (body.match regexp)?[2]
    if value? then utils.decodeHexEscapes(value) else value

  _getBootstrapSessionUrl: ->
    "#{@_vizqlRoot}/bootstrapSession/sessions/#{@_sessionId}"


  _sendBootstrapRequest: (body) ->
    url = @_getBootstrapSessionUrl()

    headers =
      "X-Tsi-Active-Tab": @_bootstrapParams.sheet_id
      "Accept-Language": "en_US"

    http.post url, @_bootstrapParams, headers


  _extractBootstrapParameters: (body, width, height) ->
    @_sessionId = @_getValueFromEmbedResponse 'sessionid', body

    if not @_sessionId
      Logger.log "error", "Error, so dumping response..."
      Logger.log "debug", body
      throw @_reportGenError()

    @_vizqlRoot = @_getValueFromEmbedResponse('vizql_root', body) ? "/vizql"

    @_bootstrapParams =
      sheet_id: @_getValueFromEmbedResponse 'sheetId', body
      showParams: @_getValueFromEmbedResponse 'showParams', body
      h: height
      w: width
      language: @_getValueFromEmbedResponse 'language', body
      locale: @_getValueFromEmbedResponse 'locale', body
      metrics: "{\"scrollbar\": {\"w\": 17,\"h\": 17},\"qfixed\": {\"w\": 0,\"h\": 0},\"qslider\": {\"w\": 0,\"h\": 20},\"qreadout\": {\"w\": 0,\"h\": 26},\"cfixed\": {\"w\": 0,\"h\": 1},\"citem\": {\"w\": 0,\"h\": 17},\"cmdropdown\": {\"w\": 0,\"h\": 24},\"cmslider\": {\"w\": 0,\"h\": 38},\"cmpattern\": {\"w\": 0,\"h\": 22},\"hfixed\": {\"w\": 0,\"h\": 21},\"hitem\": {\"w\": 0,\"h\": 20}}"


  _getValueFromBootstrapResponse: (key, body) ->
    regexp = ///"#{key}":"?([0-9A-F]+-\d+:\d+)"?///
    value = (body.match regexp)?[1]
    return value


  # TODO Not a general solution
  _getJsonFromBootstrapResponse: (body) ->
    regex = /[^;]*;(\{[\s\S]*\})[^;]*;(\{[\s\S]*\})/

    try
      rawJson1 = (body.match regex)?[1]
      rawJson2 = (body.match regex)?[2]
      json1 = JSON.parse rawJson1

      if rawJson2?
        json2 = JSON.parse rawJson2
        _.assign json1, json2
    catch
      Logger.log "error", "Invalid json obtained during bootstrap. Reason may be in the dumped HTTP response."
      Logger.log "debug", body
      throw @_reportGenError()

    return json1

  _getView: (viewName) ->
    params =
      ":embed": 'y'
      ":from_wg": 'true'
    http.get "views/#{viewName}", params


  vizqlSession: (workbookUrl, viewUrl, customViewUrl, username, width=800, height=600) ->
    viewName = "#{workbookUrl}/#{viewUrl}"
    if customViewUrl? then viewName = "#{viewName}/#{username}/#{customViewUrl}"
    Logger.log "info", "Bootstrap for #{viewName} started."

    @_getView viewName
    .then (body) =>
      if not body
        Logger.log "error", "Unknown error in bootstrap process."
        throw @_reportGenError()
      @_extractBootstrapParameters body
    .then =>
      @_sendBootstrapRequest()
    .then (body) =>
      newSessionId = @_getValueFromBootstrapResponse 'newSessionId', body

      if newSessionId?
        @_sessionId = newSessionId

      Logger.log "info", "Session ID: #{@_sessionId}"
      obj = @_getJsonFromBootstrapResponse body
      viewIds = obj.worldUpdate.applicationPresModel.workbookPresModel.dashboardPresModel.viewIds

      if not viewIds?
        Logger.log "error", "Unknown error in bootstrap process."
        throw @_reportGenError()

      Logger.log "info", "Bootstrap success for #{viewName}"
      
      sessionId: @_sessionId
      viewIds: viewIds
      view: viewUrl
      workbook: workbookUrl
      customview: customViewUrl
      vizqlRoot: @_vizqlRoot

module.exports = new VizqlSession()
