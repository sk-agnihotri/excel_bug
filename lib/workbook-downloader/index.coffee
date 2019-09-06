ExcelDownloader = require '../excel-downloader'
VizqlSession = require '../vizql-session'

class WorkbookDownloader
  constructor: ->


  _getUrlSetProvider: (viewSet) ->
    if viewSet.views?
      (view) -> [viewSet.workbookUrl, view.url]
    else if viewSet.viewUrl? and viewSet.customViews?
      (customView) -> [viewSet.workbookUrl, viewSet.viewUrl, customView.url, customView.username]
    

  _getViewProvider: (viewSet) ->
    if viewSet.views? then viewSet.views else viewSet.customViews


  _getFileName: (viewSet) ->
    if viewSet?.customViews?.length is 1
      "#{viewSet.customViews[0].name} - #{viewSet.viewName}"
    else
      "#{viewSet.customViewName} - ALL VIEWS"


  download: (viewSet) ->
    downloader = new ExcelDownloader @_getFileName viewSet
    urlProvider = @_getUrlSetProvider viewSet

    _.reduce @_getViewProvider(viewSet), (promise, view) ->
      promise.then ->
        label = "#{viewSet.workbookName}/#{view.name}"
        Logger.log "info", "Data retrieval for #{label} initiated."
        params = urlProvider view
        VizqlSession.vizqlSession.apply(VizqlSession, params)
        .then (downloadParams) ->
          downloader.download downloadParams
        .then ->
          Logger.log "info", "Data retrieval for view '#{label}' finished."
    , Promise.resolve()
    .then ->
      data = downloader.flush()
      if data?
        filename: downloader.getFileName()
        data: data
      else null

module.exports = WorkbookDownloader
