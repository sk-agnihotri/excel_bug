var ExcelDownloader, VizqlSession, WorkbookDownloader;

ExcelDownloader = require('../excel-downloader');

VizqlSession = require('../vizql-session');

WorkbookDownloader = (function() {
  function WorkbookDownloader() {}

  WorkbookDownloader.prototype._getUrlSetProvider = function(viewSet) {
    if (viewSet.views != null) {
      return function(view) {
        return [viewSet.workbookUrl, view.url];
      };
    } else if ((viewSet.viewUrl != null) && (viewSet.customViews != null)) {
      return function(customView) {
        return [viewSet.workbookUrl, viewSet.viewUrl, customView.url, customView.username];
      };
    }
  };

  WorkbookDownloader.prototype._getViewProvider = function(viewSet) {
    if (viewSet.views != null) {
      return viewSet.views;
    } else {
      return viewSet.customViews;
    }
  };

  WorkbookDownloader.prototype._getFileName = function(viewSet) {
    var ref;
    if ((viewSet != null ? (ref = viewSet.customViews) != null ? ref.length : void 0 : void 0) === 1) {
      return viewSet.customViews[0].name + " - " + viewSet.viewName;
    } else {
      return viewSet.customViewName + " - ALL VIEWS";
    }
  };

  WorkbookDownloader.prototype.download = function(viewSet) {
    var downloader, urlProvider;
    downloader = new ExcelDownloader(this._getFileName(viewSet));
    urlProvider = this._getUrlSetProvider(viewSet);
    return _.reduce(this._getViewProvider(viewSet), function(promise, view) {
      return promise.then(function() {
        var label, params;
        label = viewSet.workbookName + "/" + view.name;
        Logger.log("info", "Data retrieval for " + label + " initiated.");
        params = urlProvider(view);
        return VizqlSession.vizqlSession.apply(VizqlSession, params).then(function(downloadParams) {
          return downloader.download(downloadParams);
        }).then(function() {
          return Logger.log("info", "Data retrieval for view '" + label + "' finished.");
        });
      });
    }, Promise.resolve()).then(function() {
      var data;
      data = downloader.flush();
      if (data != null) {
        return {
          filename: downloader.getFileName(),
          data: data
        };
      } else {
        return null;
      }
    });
  };

  return WorkbookDownloader;

})();

module.exports = WorkbookDownloader;
