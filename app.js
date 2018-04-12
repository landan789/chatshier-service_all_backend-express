let express = require('express');
let path = require('path');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let cors = require('cors');

let jwtHlp = require('./helpers/jwt');
let index = require('./routes/index');
let apiDatabase = require('./routes/api_database');
let apiSign = require('./routes/api_sign');
let app = express();

const CHATSHIER = require('./config/chatshier');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));

app.use(cors(CHATSHIER['CORS']));
app.use(cookieParser());

// API JWT 權限驗證
app.use('/api/*/users/:userid', jwtHlp.authenticate('HEADER', null));

// API
app.use('/api/database', apiDatabase);

app.use('/api/sign', apiSign);

module.exports = app;
