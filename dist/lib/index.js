var App, ViewSet, WorkbookDownloader, app, error, error1;

require('./globals');

ViewSet = require('./view-set');

WorkbookDownloader = require('./workbook-downloader');

App = (function() {
  function App() {}

  App.prototype["do"] = function() {
    var viewSet;
    viewSet = new ViewSet();
    return viewSet.getViews().then(function(workbooks) {
      var workbookDownloader;
      viewSet.release();
      workbookDownloader = new WorkbookDownloader();
      return workbookDownloader.download(workbooks);
    })["catch"](function(error) {
      return winston.error(("Error: " + error).red);
    })["finally"](function() {
      return winston.info("All tasks are finished".green);
    });
  };

  return App;

})();

try {
  app = new App();
  app["do"]();
} catch (error1) {
  error = error1;
  winston.error("Error occured at this point, exiting the whole stuff...: " + error.message);
}
