var HttpClient, Promise, cookieJar, http;

http = require('request');

Promise = require('bluebird');

cookieJar = http.jar();

http = http.defaults({
  jar: cookieJar,
  debug: true
});

HttpClient = (function() {
  function HttpClient() {}

  HttpClient.prototype._handleErrors = function(error) {
    var message, res;
    res = error;
    message = "";
    if (error.code === 'ETIMEDOUT') {
      message = "Timeout" + (error.connect ? " in remote connection" : " in remote operation");
      res = new Error(message);
    }
    return res;
  };

  HttpClient.prototype.get = function(relativePath, params) {
    if (params == null) {
      params = {};
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.getStream(relativePath, function(error, response, body) {
          if (error) {
            return reject(_this._handleErrors(error));
          } else {
            return resolve(body);
          }
        }, params);
      };
    })(this));
  };

  HttpClient.prototype.getStream = function(relativePath, cb, params) {
    var url;
    if (params == null) {
      params = {};
    }
    url = config.tableauServer + "/" + relativePath;
    Logger.log("info", "GET: " + url);
    return http({
      url: url,
      qs: params,
      headers: {
        Connection: 'keep-alive',
        "Accept-Language": "en_US"
      },
      timeout: 0
    }, cb);
  };

  HttpClient.prototype.getReadStream = function(relativePath, params) {
    var url;
    if (params == null) {
      params = {};
    }
    url = config.tableauServer + "/" + relativePath;
    Logger.log("info", "GET: " + url);
    return http.get({
      url: url,
      qs: params,
      headers: {
        Connection: 'keep-alive',
        "Accept-Language": "en_US"
      },
      timeout: 0
    });
  };

  HttpClient.prototype.post = function(relativePath, data, headers) {
    var allHeaders, url;
    if (headers == null) {
      headers = {};
    }
    url = config.tableauServer + "/" + relativePath;
    Logger.log("info", "POST: " + url);
    allHeaders = _.assign({
      Connection: 'keep-alive',
      "Accept-Language": "en_US"
    }, headers);
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return http.post({
          url: url,
          form: data,
          headers: allHeaders,
          timeout: 0
        }, function(error, response, body) {
          if (error) {
            return reject(_this._handleErrors(error));
          } else {
            return resolve(body);
          }
        });
      };
    })(this));
  };

  HttpClient.prototype.setCookie = function(key, value) {
    var cookie;
    cookie = http.cookie(key + "=" + value);
    return cookieJar.setCookie(cookie, "" + config.tableauServer);
  };

  return HttpClient;

})();

module.exports = new HttpClient();
