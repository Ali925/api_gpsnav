'use strict';

var mysql      = require('mysql');
var dbConfig = require('../config/db.json');
var connection = mysql.createConnection(dbConfig);
var crypto = require('crypto');


module.exports = {
	users: require('./users.js')(connection, crypto),
	trace: require('./trace.js')(connection),
	sectors: require('./sectors.js')(connection)
}