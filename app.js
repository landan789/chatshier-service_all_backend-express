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

// Express 靜態 server
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
// pp.use('/api/sign', apiSign);

// API JWT 權限驗證
app.use('/api/*/users/:userid', jwt2.verify);
let jwt = require('jsonwebtoken');
const passport = require('passport');
let JwtStrategy = require('passport-jwt').Strategy;
let ExtractJwt = require('passport-jwt').ExtractJwt;
var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'secret';
opts.issuer = 'accounts.examplesoft.com';
opts.audience = 'yoursite.net';
console.log(opts);
passport.use(new JwtStrategy(opts, function(jwtPayload, done) {
    console.log(jwtPayload);
    return done(null, jwtPayload);
}));

// API
app.use('/api', api);

app.use('/other', passport.authenticate('jwt', { session: false }),
    function(req, res) {
    }
);

// facebook connection
app.get('/webhook/:webhookId', function(req, res) {
    if ('verify_token' === req.query['hub.verify_token']) {
        console.log('Validating webhook');
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error('Failed validation. Make sure the validation tokens match.');
        res.sendStatus(500);
    }
}); // app.get-->facebook webhook


module.exports = app;