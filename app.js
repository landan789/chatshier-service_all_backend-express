const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-adminsdk.json'); // firebase admin requires .json auth
const databaseURL = require('./config/firebase_admin_database_url');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');

var jwt = require('./middlewares/jwt');
var index = require('./routes/index');
var api = require('./routes/api');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));

app.use(cors());
app.use(cookieParser());

// Express 靜態 server
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// API JWT 權限驗證
app.use('/api/*/users/:userid', jwt.verify);

// API
app.use('/api', api);

module.exports = app;
