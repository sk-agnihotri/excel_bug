require './globals'

ViewSet = require './view-set'
WorkbookDownloader = require './workbook-downloader'

class App
  do: ->
    viewSet = new ViewSet()

    viewSet.getViews().then (workbooks) ->
      viewSet.release()
      workbookDownloader = new WorkbookDownloader()
      workbookDownloader.download workbooks
    .catch (error) ->
      winston.error "Error: #{error}".red
    .finally ->
      winston.info "All tasks are finished".green
  

try
  app = new App()
  app.do()
catch error
  winston.error "Error occured at this point, exiting the whole stuff...: #{error.message}"
