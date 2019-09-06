http = require  '../httpclient'
xmlParser = require('xml2js').parseString

class Authenticate
  _parseXml: (xml) ->
    new Promise (resolve, reject) ->
      xmlParser xml, (error, result) ->
        if error
          Logger.log "info", "parseXml error...", error
          reject error
        else
          resolve result
    
  _getBuffer: (str) ->
    padded = if str.length % 2 then "0#{str}" else str
    new Buffer padded, 'hex'


  authenticateWithImpersonate: (uid) ->
    params = """
    <tsRequest>
      <credentials name="#{config.credentials.tableauAdminUsername}" password="#{config.credentials.tableauAdminPassword}" >
        <site contentUrl="" />
        <user id="#{uid}" />
      </credentials>
    </tsRequest>
    """
    @_authenticate params

  authenticate: (username, password) ->
    params = """
      <tsRequest>
        <credentials name="#{username}" password="#{password}" >
          <site contentUrl="" />
        </credentials>
      </tsRequest>
    """
    @_authenticate params


  _authenticate: (params) ->
    new Promise (resolve, reject) =>
      Logger.log "info", "Athentication started..."

      http.post 'api/2.0/auth/signin', params
      .then (respXml) =>
        @_parseXml(respXml).then (res) =>
          @authToken = res.tsResponse?.credentials?[0]?.$?.token

          if not @authToken?
            Logger.log "error", "Authentication failure"
            Logger.log "debug", respXml
            reject {status: 'PERMISSION_DENIED', message: "Authentication failed"}
          else
            http.setCookie "workgroup_session_id", @authToken
            Logger.log "info", "Authentication: success"
            resolve @authToken

  logout: ->
    new Promise (resolve, reject) =>
      if not @authToken
        Logger.log "info", "Not logged in"
      else
        Logger.log "info", "Logging out..."
        http.post 'api/2.0/auth/signout', {}, {'X-Tableau-Auth': @authToken}
        .then (respXml) =>
          if respXml isnt ''
            @_parseXml respXml
            .then (response) ->
              error = response?.tsResponse?.error?[0]
              errorMsg = if error? then "#{error.summary}: #{error.detail}" else "Unknown error"
              Promise.reject errorMsg
          else
            Logger.log "info", "Logged out."
            resolve()

  __injectConfig: (newConf) ->
    config = config

module.exports = new Authenticate()
