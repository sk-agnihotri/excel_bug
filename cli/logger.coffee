require 'colors'
winston = require 'winston'
winston.level = 'debug'

class Logger
  constructor: ->

    @logger = new (winston.Logger)
      transports: [
        new winston.transports.Console {level: 'debug'}
      ]
      exceptionHandlers: [
        new winston.transports.Console {level: 'debug'}
      ]

    @logger.stream =
      write: (message, encoding) =>
        @logger.info message

  log: (level, message, meta = {}) ->
    @logger.log level, message, meta

module.exports = new Logger()
