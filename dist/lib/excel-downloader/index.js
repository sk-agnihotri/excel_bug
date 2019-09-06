var Converter, ExcelDownloader, Globalize, StreamMeter, XLSX, http;

http = require('../httpclient');

Converter = require("csvtojson").Converter;

XLSX = require('xlsx');

StreamMeter = require("stream-meter");

Globalize = require('globalize');

Globalize.load(require("cldr-data/main/en/numbers"), require("cldr-data/supplemental/likelySubtags"));

ExcelDownloader = (function() {
  var _s2ab;

  function ExcelDownloader(_workbookName) {
    this._workbookName = _workbookName;
    this._http = http;
    this._filename = this._workbookName + ".xlsx";
    this._workbook = {
      SheetNames: [],
      Sheets: {}
    };
  }

  ExcelDownloader.prototype._inject = function(dependencies) {
    var ref;
    return this._http = (ref = dependencies.http) != null ? ref : this._http;
  };

  ExcelDownloader.prototype._getDelimiter = function() {
    var ref;
    return (ref = config.tableauCsvSeparator) != null ? ref : ';';
  };

  ExcelDownloader.prototype._pipeCvsToJson = function(readStream) {
    var columnNames, converter, fieldNames, meter, rowNum, ws;
    rowNum = 0;
    converter = new Converter({
      constructResult: false,
      noheader: true,
      delimiter: this._getDelimiter()
    });
    columnNames = null;
    fieldNames = null;
    ws = {};
    meter = StreamMeter(config.maxCSVSize);
    return new Promise((function(_this) {
      return function(resolve, reject) {
        readStream.pipe(meter).pipe(converter);
        meter.on('data', function(data) {
          return data;
        });
        meter.on('error', function() {
          return reject({
            status: 'TOO_BIG_FILE',
            message: "Report size exceeded the supported maximum (" + (config.maxCSVSize / 1024 / 1024) + " mb)"
          });
        });
        converter.on("record_parsed", function(jsonObj) {
          var cell_ref, colName, colNum, j, len;
          if (rowNum === 0) {
            Logger.log("info", "Report has been generated. Started downloading and processing CSV data...");
            columnNames = _this._getColumnNames(jsonObj);
            fieldNames = _this._getFieldNames(jsonObj);
            _this._addHeader(columnNames, ws);
          } else {
            for (colNum = j = 0, len = columnNames.length; j < len; colNum = ++j) {
              colName = columnNames[colNum];
              cell_ref = XLSX.utils.encode_cell({
                c: colNum,
                r: rowNum
              });
              ws[cell_ref] = _this._getCell(jsonObj[fieldNames[colNum]]);
            }
          }
          return rowNum++;
        });
        return converter.on('end_parsed', function() {
          var range;
          if ((columnNames != null) && rowNum > 0) {
            range = {
              s: {
                c: 0,
                r: 0
              },
              e: {
                c: columnNames.length,
                r: rowNum
              }
            };
            ws['!ref'] = XLSX.utils.encode_range(range);
            Logger.log("info", "CSV data has been downloaded and processed.");
          }
          return resolve(ws);
        });
      };
    })(this));
  };

  ExcelDownloader.prototype._getCsvAsWorksheet = function(url) {
    var stream;
    stream = this._http.getReadStream(url);
    stream.on('data', function(data) {
      return data;
    });
    return this._pipeCvsToJson(stream)["catch"](function(err) {
      stream.abort();
      return Promise.reject(err);
    });
  };

  ExcelDownloader.prototype._addHeader = function(columnNames, sheet) {
    var cell, cell_ref, colName, colNum, j, len, results;
    results = [];
    for (colNum = j = 0, len = columnNames.length; j < len; colNum = ++j) {
      colName = columnNames[colNum];
      cell = {
        v: colName,
        t: 's'
      };
      cell_ref = XLSX.utils.encode_cell({
        c: colNum,
        r: 0
      });
      results.push(sheet[cell_ref] = cell);
    }
    return results;
  };

  ExcelDownloader.prototype._convertToDate = function(val) {
    var regex, value;
    regex = /^\d{1,2}\/\d{1,2}\/\d{4}\W\d{1,2}:\d{1,2}:\d{1,2}\W[a,A,p,P][m,M]$/;
    value = val.match(regex);
    if (value === null) {
      return null;
    } else {
      return new Date(val);
    }
  };

  ExcelDownloader.prototype._parseAsPureNumber = function(val) {
    var parsed, regex;
    regex = /^[+-]?[\d,\.]+[eE]?[\d\+\-]*$/;
    if (val === null || val === void 0 || !val.match(regex)) {
      return null;
    }
    parsed = Globalize('en').numberParser()(val);
    if (parsed === null || _.isNaN(parsed)) {
      return null;
    } else {
      return parsed;
    }
  };

  ExcelDownloader.prototype._parseAsCurrency = function(val) {
    var match, noDollar, regex;
    regex = /^[+-]?\$([\W\w]*)/;
    match = val != null ? val.match(regex) : null;
    if (match != null) {
      noDollar = val.replace('$', '');
      return this._parseAsPureNumber(noDollar);
    } else {
      return null;
    }
  };

  ExcelDownloader.prototype._parseAsPercentage = function(val) {
    if ((val != null ? val[val.length - 1] : void 0) === '%') {
      return this._parseAsPureNumber(val.substring(0, val.length - 1));
    } else {
      return null;
    }
  };

  ExcelDownloader.prototype._parseAsNumberInParenthesis = function(val) {
    var ref, regex, res;
    regex = /^\((.*)\)$/;
    res = this._parseAsNumber((ref = val.match(regex)) != null ? ref[1] : void 0);
    if (res !== null) {
      return -res;
    } else {
      return null;
    }
  };

  ExcelDownloader.prototype._parseAsNumber = function(val) {
    var res;
    res = this._parseAsCurrency(val);
    if (res !== null) {
      return res;
    }
    res = this._parseAsPercentage(val);
    if (res !== null) {
      return res;
    }
    return this._parseAsPureNumber(val);
  };

  ExcelDownloader.prototype._getCell = function(val) {
    var cell, date, num;
    cell = {
      v: val,
      t: 's'
    };
    if (typeof cell.v === 'number') {
      cell.t = 'n';
      return cell;
    }
    date = this._convertToDate(cell.v);
    if (date !== null) {
      cell.t = 'd';
      cell.v = date;
      return cell;
    }
    num = this._parseAsNumber(val);
    if (num === null) {
      num = this._parseAsNumberInParenthesis(val);
    }
    if (num !== null) {
      cell.t = 'n';
      cell.v = num;
      return cell;
    }
    return cell;
  };

  ExcelDownloader.prototype._getColumnNames = function(jsonObj) {
    return _.values(jsonObj);
  };

  ExcelDownloader.prototype._getFieldNames = function(jsonObj) {
    return _.keys(jsonObj);
  };

  ExcelDownloader.prototype._createSheetFromJson = function(json) {
    var cell_ref, colName, colNum, columnNames, data, fieldNames, j, k, len, len1, range, ref, rowNum, ws;
    if (!(json != null ? json[0] : void 0)) {
      return null;
    }
    columnNames = this._getColumnNames(json[0]);
    fieldNames = this._getFieldNames(json[0]);
    ws = {};
    range = {
      s: {
        c: 0,
        r: 0
      },
      e: {
        c: columnNames.length,
        r: json.length - 1
      }
    };
    this._addHeader(columnNames, ws);
    ref = _.tail(json);
    for (rowNum = j = 0, len = ref.length; j < len; rowNum = ++j) {
      data = ref[rowNum];
      for (colNum = k = 0, len1 = columnNames.length; k < len1; colNum = ++k) {
        colName = columnNames[colNum];
        cell_ref = XLSX.utils.encode_cell({
          c: colNum,
          r: rowNum + 1
        });
        ws[cell_ref] = this._getCell(data[fieldNames[colNum]]);
      }
    }
    ws['!ref'] = XLSX.utils.encode_range(range);
    return ws;
  };

  _s2ab = function(s) {
    var buf, i, j, len, v, view;
    buf = new ArrayBuffer(s.length);
    view = new Uint8Array(buf);
    for (i = j = 0, len = view.length; j < len; i = ++j) {
      v = view[i];
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  };

  ExcelDownloader.prototype._createBinaryString = function(workbook, wopts) {
    var buf, i, j, len, v, view, wbout;
    wbout = XLSX.write(workbook, {
      bookType: "xlsx",
      cellDates: true,
      type: 'binary'
    });
    buf = new Buffer(wbout.length);
    view = new Uint8Array(buf);
    for (i = j = 0, len = view.length; j < len; i = ++j) {
      v = view[i];
      buf[i] = wbout.charCodeAt(i) & 0xFF;
    }
    return buf;
  };

  ExcelDownloader.prototype.download = function(params) {
    return _.reduce(params.viewIds, (function(_this) {
      return function(promise, viewId, viewName) {
        return promise.then(function() {
          var url;
          Logger.log("info", "Generating " + _this._workbookName + " - " + params.view + " - " + viewName + "...");
          url = params.vizqlRoot + "/exportcrosstab/sessions/" + params.sessionId + "/views/" + viewId + "?charset=utf8&download=true";
          return _this._getCsvAsWorksheet(url).then(function(ws) {
            var escViewName;
            if ((ws != null) && _.keys(ws).length > 0) {
              escViewName = _.escape(viewName);
              _this._workbook.SheetNames.push(escViewName);
              _this._workbook.Sheets[escViewName] = ws;
              return Logger.log("info", "Excel sheet generated for " + _this._workbookName + " - " + params.view + " - " + viewName);
            } else {
              return Logger.log("error", "No data downloaded for " + viewName);
            }
          });
        });
      };
    })(this), Promise.resolve());
  };

  ExcelDownloader.prototype.flush = function() {
    var msg, res;
    if (this._workbook.SheetNames.length > 0) {
      res = this._createBinaryString(this._workbook);
      Logger.log("info", "File " + this._filename + " generated.");
      return res;
    } else {
      msg = "File " + this._filename + ": nothing to write (no data added to file)";
      Logger.log("error", msg);
      throw {
        status: 'EMPTY_REPORT',
        message: msg
      };
      return null;
    }
  };

  ExcelDownloader.prototype.getFileName = function() {
    return this._filename;
  };

  return ExcelDownloader;

})();

module.exports = ExcelDownloader;
