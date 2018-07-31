let express = require('express');
let compression = require('compression');
let path = require('path');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let cors = require('cors');

let jwtHlp = require('./helpers/jwt');
let routerHlp = require('./helpers/router');
let index = require('./routes/index');
let apiDatabase = require('./routes/api_database');
let apiSign = require('./routes/api_sign');
let apiBot = require('./routes/api_bot');
let webhookBot = require('./routes/webhook_bot');
let webhookPayment = require('./routes/webhook_payment');
let apiImage = require('./routes/api_image');

const CHATSHIER = require('./config/chatshier');

let corsCfg = { // the attributes of CORS must be lower case
    origin: CHATSHIER.CORS.ORIGIN,
    methods: CHATSHIER.CORS.METHODS,
    allowedHeaders: CHATSHIER.CORS.ALLOWED_HEADERS,
    credentials: CHATSHIER.CORS.CREDENTIALS
};

let app = express();
app.use(compression());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));

app.use(cors(corsCfg));
app.use(cookieParser());

app.use('/webhook', webhookBot);
app.use('/webhook-payment', webhookPayment);

// API JWT 權限驗證
app.use('/api/*/users/:userid', jwtHlp.authenticate);
app.use('/api/database', apiDatabase);
app.use('/api/sign', apiSign);
app.use('/api/bot', apiBot);
app.use('/api/image', apiImage);
app.use('/api/*', routerHlp.requestNotExistentApi);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);
app.use(/\/((?!api|webhook).)*/, routerHlp.requestNotExistentPath);

module.exports = app;
