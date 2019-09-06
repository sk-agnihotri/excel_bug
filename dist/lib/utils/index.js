module.exports = {
  decodeHexEscapes: function(str) {
    return str.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
      return String.fromCharCode(parseInt(arguments[1], 16));
    });
  }
};
