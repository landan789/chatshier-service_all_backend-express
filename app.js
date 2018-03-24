const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-adminsdk.json'); // firebase admin requires .json auth
const databaseURL = require('./config/firebase_admin_database_url');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

const CHATSHIER = require('./config/chatshier');

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');

var jwt2 = require('./middlewares/jwt');
var jwt = require('./middlewares/jwt_');
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
app.use('/api/*/users/:userid', jwt2.verify);

// API
app.use('/api', api);

app.use('/api/sign', apiSign);

app.use('/other', jwt.authenticate('HEADER'));
app.use('/other', (req, res, next) => {
    res.send(202);
});

module.exports = app;
