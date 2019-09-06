var Logger, winston;

require('colors');

winston = require('winston');

winston.level = 'debug';

Logger = (function() {
  function Logger() {
    this.logger = new winston.Logger({
      transports: [
        new winston.transports.Console({
          level: 'debug'
        })
      ],
      exceptionHandlers: [
        new winston.transports.Console({
          level: 'debug'
        })
      ]
    });
    this.logger.stream = {
      write: (function(_this) {
        return function(message, encoding) {
          return _this.logger.info(message);
        };
      })(this)
    };
  }

  Logger.prototype.log = function(level, message, meta) {
    if (meta == null) {
      meta = {};
    }
    return this.logger.log(level, message, meta);
  };

  return Logger;

})();

module.exports = new Logger();
