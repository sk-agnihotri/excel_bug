  
module.exports =
  decodeHexEscapes: (str) ->
    str.replace /\\x([0-9A-Fa-f]{2})/g, ->
      String.fromCharCode parseInt arguments[1], 16
