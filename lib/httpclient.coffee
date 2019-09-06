http = require  'request'
Promise = require 'bluebird'
# require('request-debug')(http)

cookieJar =  http.jar()
http = http.defaults
  jar:cookieJar
  debug: true

class HttpClient
  _handleErrors: (error) ->
    res = error
    message = ""

    if error.code is 'ETIMEDOUT'
      message = "Timeout" + if error.connect then " in remote connection" else " in remote operation"
      res = new Error message

    return res


  get: (relativePath, params = {}) ->
    new Promise (resolve, reject) =>
      @getStream relativePath, (error, response, body) =>
        if error
          reject @_handleErrors error
        else
          resolve body
      , params


  getStream: (relativePath, cb, params = {}) ->
    url = "#{config.tableauServer}/#{relativePath}"
    Logger.log "info", "GET: #{url}"
    http
      url: url
      qs: params
      headers: {Connection: 'keep-alive', "Accept-Language": "en_US"}
      timeout: 0
    , cb


  getReadStream: (relativePath, params = {}) ->
    url = "#{config.tableauServer}/#{relativePath}"
    Logger.log "info", "GET: #{url}"
    http.get
      url: url
      qs: params
      headers: {Connection: 'keep-alive', "Accept-Language": "en_US"}
      timeout: 0


  post: (relativePath, data, headers = {}) ->
    url = "#{config.tableauServer}/#{relativePath}"
    Logger.log "info", "POST: #{url}"
    allHeaders = _.assign {Connection: 'keep-alive', "Accept-Language": "en_US"}, headers
    new Promise (resolve, reject) =>
      http.post
        url: url
        form: data
        headers: allHeaders
        timeout: 0
      , (error, response, body) =>
        if error
          reject @_handleErrors error
        else
          resolve body

  setCookie: (key, value) ->
    cookie = http.cookie "#{key}=#{value}"
    cookieJar.setCookie cookie, "#{config.tableauServer}"


module.exports = new HttpClient()
