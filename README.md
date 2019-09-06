# tableau-extract

Download Tableau reports in Excel format, by using their Tableau urls. Currently, you can extract custom views only.

## Install

```
npm install -g starschema-tableau-excel-extractor
```

## Usage

```
tableau-extract  -u tableauUsername -p tableauPassword -s csvSeparator http://example.mytableau.com/#/views/MyWorkbook/MyView/myself/mycustomview
```

Full usage:

```
tableau-extract --help
```

All the above parameters are mandatory. 
