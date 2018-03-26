var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');

var jwtHlp = require('./helpers/jwt');
var index = require('./routes/index');
var api = require('./routes/api');
var apiSign = require('./routes/api_sign');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));

app.use(cors());
app.use(cookieParser());

// API JWT 權限驗證
app.use('/api/*/users/:userid', jwtHlp.authenticate('HEADER', null));

// API
app.use('/api', api);

app.use('/api/sign', apiSign);

module.exports = app;
