var Authenticate, http, xmlParser;

http = require('../httpclient');

xmlParser = require('xml2js').parseString;

Authenticate = (function() {
  function Authenticate() {}

  Authenticate.prototype._parseXml = function(xml) {
    return new Promise(function(resolve, reject) {
      return xmlParser(xml, function(error, result) {
        if (error) {
          Logger.log("info", "parseXml error...", error);
          return reject(error);
        } else {
          return resolve(result);
        }
      });
    });
  };

  Authenticate.prototype._getBuffer = function(str) {
    var padded;
    padded = str.length % 2 ? "0" + str : str;
    return new Buffer(padded, 'hex');
  };

  Authenticate.prototype.authenticateWithImpersonate = function(uid) {
    var params;
    params = "<tsRequest>\n  <credentials name=\"" + config.credentials.tableauAdminUsername + "\" password=\"" + config.credentials.tableauAdminPassword + "\" >\n    <site contentUrl=\"\" />\n    <user id=\"" + uid + "\" />\n  </credentials>\n</tsRequest>";
    return this._authenticate(params);
  };

  Authenticate.prototype.authenticate = function(username, password) {
    var params;
    params = "<tsRequest>\n  <credentials name=\"" + username + "\" password=\"" + password + "\" >\n    <site contentUrl=\"\" />\n  </credentials>\n</tsRequest>";
    return this._authenticate(params);
  };

  Authenticate.prototype._authenticate = function(params) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        Logger.log("info", "Athentication started...");
        return http.post('api/2.0/auth/signin', params).then(function(respXml) {
          return _this._parseXml(respXml).then(function(res) {
            var ref, ref1, ref2, ref3;
            _this.authToken = (ref = res.tsResponse) != null ? (ref1 = ref.credentials) != null ? (ref2 = ref1[0]) != null ? (ref3 = ref2.$) != null ? ref3.token : void 0 : void 0 : void 0 : void 0;
            if (_this.authToken == null) {
              Logger.log("error", "Authentication failure");
              Logger.log("debug", respXml);
              return reject({
                status: 'PERMISSION_DENIED',
                message: "Authentication failed"
              });
            } else {
              http.setCookie("workgroup_session_id", _this.authToken);
              Logger.log("info", "Authentication: success");
              return resolve(_this.authToken);
            }
          });
        });
      };
    })(this));
  };

  Authenticate.prototype.logout = function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        if (!_this.authToken) {
          return Logger.log("info", "Not logged in");
        } else {
          Logger.log("info", "Logging out...");
          return http.post('api/2.0/auth/signout', {}, {
            'X-Tableau-Auth': _this.authToken
          }).then(function(respXml) {
            if (respXml !== '') {
              return _this._parseXml(respXml).then(function(response) {
                var error, errorMsg, ref, ref1;
                error = response != null ? (ref = response.tsResponse) != null ? (ref1 = ref.error) != null ? ref1[0] : void 0 : void 0 : void 0;
                errorMsg = error != null ? error.summary + ": " + error.detail : "Unknown error";
                return Promise.reject(errorMsg);
              });
            } else {
              Logger.log("info", "Logged out.");
              return resolve();
            }
          });
        }
      };
    })(this));
  };

  Authenticate.prototype.__injectConfig = function(newConf) {
    var config;
    return config = config;
  };

  return Authenticate;

})();

module.exports = new Authenticate();
