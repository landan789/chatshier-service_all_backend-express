var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');

var jwtHlp = require('./helpers/jwt');
var index = require('./routes/index');
var apiDatabase = require('./routes/api_database');
var apiSign = require('./routes/api_sign');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
let corsOptions = {
    origin: [
        'http://service.fea.chatshier.com:8080' // allow the website of client can access back-end service.chatshier 
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization']
};
  
app.use(cors(corsOptions));
app.use(cookieParser());

// API JWT 權限驗證
app.use('/api/*/users/:userid', jwtHlp.authenticate('HEADER', null));

// API
app.use('/api/database', apiDatabase);

app.use('/api/sign', apiSign);

module.exports = app;
