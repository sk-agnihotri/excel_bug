var VizqlSession, http, utils;

http = require('../httpclient');

utils = require('../utils');

VizqlSession = (function() {
  function VizqlSession() {}

  VizqlSession.prototype._reportGenError = function() {
    return new Error("Error happened during Tableau report generation, support team contacted.");
  };

  VizqlSession.prototype._getValueFromEmbedResponse = function(key, body) {
    var ref, regexp, value;
    regexp = RegExp("\"?" + key + "\"?:\\s?(['\"])((?:.(?!\\1))*.?)\\1");
    value = (ref = body.match(regexp)) != null ? ref[2] : void 0;
    if (value != null) {
      return utils.decodeHexEscapes(value);
    } else {
      return value;
    }
  };

  VizqlSession.prototype._getBootstrapSessionUrl = function() {
    return this._vizqlRoot + "/bootstrapSession/sessions/" + this._sessionId;
  };

  VizqlSession.prototype._sendBootstrapRequest = function(body) {
    var headers, url;
    url = this._getBootstrapSessionUrl();
    headers = {
      "X-Tsi-Active-Tab": this._bootstrapParams.sheet_id,
      "Accept-Language": "en_US"
    };
    return http.post(url, this._bootstrapParams, headers);
  };

  VizqlSession.prototype._extractBootstrapParameters = function(body, width, height) {
    var ref;
    this._sessionId = this._getValueFromEmbedResponse('sessionid', body);
    if (!this._sessionId) {
      Logger.log("error", "Error, so dumping response...");
      Logger.log("debug", body);
      throw this._reportGenError();
    }
    this._vizqlRoot = (ref = this._getValueFromEmbedResponse('vizql_root', body)) != null ? ref : "/vizql";
    return this._bootstrapParams = {
      sheet_id: this._getValueFromEmbedResponse('sheetId', body),
      showParams: this._getValueFromEmbedResponse('showParams', body),
      h: height,
      w: width,
      language: this._getValueFromEmbedResponse('language', body),
      locale: this._getValueFromEmbedResponse('locale', body),
      metrics: "{\"scrollbar\": {\"w\": 17,\"h\": 17},\"qfixed\": {\"w\": 0,\"h\": 0},\"qslider\": {\"w\": 0,\"h\": 20},\"qreadout\": {\"w\": 0,\"h\": 26},\"cfixed\": {\"w\": 0,\"h\": 1},\"citem\": {\"w\": 0,\"h\": 17},\"cmdropdown\": {\"w\": 0,\"h\": 24},\"cmslider\": {\"w\": 0,\"h\": 38},\"cmpattern\": {\"w\": 0,\"h\": 22},\"hfixed\": {\"w\": 0,\"h\": 21},\"hitem\": {\"w\": 0,\"h\": 20}}"
    };
  };

  VizqlSession.prototype._getValueFromBootstrapResponse = function(key, body) {
    var ref, regexp, value;
    regexp = RegExp("\"" + key + "\":\"?([0-9A-F]+-\\d+:\\d+)\"?");
    value = (ref = body.match(regexp)) != null ? ref[1] : void 0;
    return value;
  };

  VizqlSession.prototype._getJsonFromBootstrapResponse = function(body) {
    var error, json1, json2, rawJson1, rawJson2, ref, ref1, regex;
    regex = /[^;]*;(\{[\s\S]*\})[^;]*;(\{[\s\S]*\})/;
    try {
      rawJson1 = (ref = body.match(regex)) != null ? ref[1] : void 0;
      rawJson2 = (ref1 = body.match(regex)) != null ? ref1[2] : void 0;
      json1 = JSON.parse(rawJson1);
      if (rawJson2 != null) {
        json2 = JSON.parse(rawJson2);
        _.assign(json1, json2);
      }
    } catch (error) {
      Logger.log("error", "Invalid json obtained during bootstrap. Reason may be in the dumped HTTP response.");
      Logger.log("debug", body);
      throw this._reportGenError();
    }
    return json1;
  };

  VizqlSession.prototype._getView = function(viewName) {
    var params;
    params = {
      ":embed": 'y',
      ":from_wg": 'true'
    };
    return http.get("views/" + viewName, params);
  };

  VizqlSession.prototype.vizqlSession = function(workbookUrl, viewUrl, customViewUrl, username, width, height) {
    var viewName;
    if (width == null) {
      width = 800;
    }
    if (height == null) {
      height = 600;
    }
    viewName = workbookUrl + "/" + viewUrl;
    if (customViewUrl != null) {
      viewName = viewName + "/" + username + "/" + customViewUrl;
    }
    Logger.log("info", "Bootstrap for " + viewName + " started.");
    return this._getView(viewName).then((function(_this) {
      return function(body) {
        if (!body) {
          Logger.log("error", "Unknown error in bootstrap process.");
          throw _this._reportGenError();
        }
        return _this._extractBootstrapParameters(body);
      };
    })(this)).then((function(_this) {
      return function() {
        return _this._sendBootstrapRequest();
      };
    })(this)).then((function(_this) {
      return function(body) {
        var newSessionId, obj, viewIds;
        newSessionId = _this._getValueFromBootstrapResponse('newSessionId', body);
        if (newSessionId != null) {
          _this._sessionId = newSessionId;
        }
        Logger.log("info", "Session ID: " + _this._sessionId);
        obj = _this._getJsonFromBootstrapResponse(body);
        viewIds = obj.worldUpdate.applicationPresModel.workbookPresModel.dashboardPresModel.viewIds;
        if (viewIds == null) {
          Logger.log("error", "Unknown error in bootstrap process.");
          throw _this._reportGenError();
        }
        Logger.log("info", "Bootstrap success for " + viewName);
        return {
          sessionId: _this._sessionId,
          viewIds: viewIds,
          view: viewUrl,
          workbook: workbookUrl,
          customview: customViewUrl,
          vizqlRoot: _this._vizqlRoot
        };
      };
    })(this));
  };

  return VizqlSession;

})();

module.exports = new VizqlSession();
