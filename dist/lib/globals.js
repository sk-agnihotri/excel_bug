require('colors');

GLOBAL.Promise = require('bluebird');

GLOBAL.fs = require('fs');

GLOBAL.path = require('path');

GLOBAL.winston = require('winston');

GLOBAL._ = require('lodash');

winston.level = 'debug';

GLOBAL.config = require('./config');

GLOBAL.db = require('./db-service');

GLOBAL.gs = require('./gs');

GLOBAL.Logger = require('./logger');
