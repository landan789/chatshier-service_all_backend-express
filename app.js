var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var formData = require("express-form-data");
var cors = require('cors');

var jwt = require('./middlewares/jwt');
var index = require('./routes/index');
var api = require('./routes/api');
var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
// need raw buffer for signature validation
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(formData.parse({
    autoFiles: true
}));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
app.use(cors());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // to import css and javascript
app.use('/', index);
app.use('/api/*/users/:userid', jwt.verify); // API 權限驗證
app.use('/api', api);
//facebook connection
app.get('/webhook/:webhookId', function(req, res) {
    if (req.query['hub.verify_token'] === 'verify_token') {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
}); //app.get-->facebook webhook

app.use('/', (err, req, res, next) => {
    console.log('aaaa');
    console.log(err);
});

module.exports = app;