module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const CHATSHIER = require('../config/chatshier');
    let ciperHlp = require('../helpers/cipher');
    let usersMdl = require('../models/users_');
    let jwt = require('jsonwebtoken');

    class SigninController {
        postOne(req, res, next) {
            let token;
            let users;
            let user = {
                email: req.body.email || '',
                password: req.body.password || ''
            };

            return Promise.resolve().then(() => {
                if (!req.body.email) {
                    return Promise.reject(API_ERROR.EMAIL_WAS_EMPTY);
                };

                if (!req.body.password) {
                    return Promise.reject(API_ERROR.PASSWORD_WAS_EMPTY);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(null, req.body.email, (_users) => {
                        // If the user email exists then REST API can not insert any user
                        if (!_users) {
                            reject(API_ERROR.USER_FAILED_TO_FIND);
                        };
                        users = _users;
                        resolve(users);
                    });
                });
            }).then(() => {
                let userId = Object.keys(users).shift();
                let user = users[userId];
                if (ciperHlp.encode(req.body.password) !== user.password) {
                    return Promise.reject(API_ERROR.PASSWORD_WAS_WRONG);
                };
                // user password must never reponse to client
                users[userId].password = ''; 
                return Promise.resolve();
            }).then(() => {
                let userId = Object.keys(users).shift();
                let payload = {
                    sub: CHATSHIER.JWT.SUBJECT,
                    iss: CHATSHIER.JWT.ISSUER,
                    adu: CHATSHIER.JWT.AUDIENCE,
                    exp: Date.now() + CHATSHIER.JWT.EXPIRE_TIME, // jwt expires after 1 hour
                    iat: Date.now(),
                    uid: userId
                };
                token = jwt.sign(payload, CHATSHIER.JWT.SECRET);
                return Promise.resolve(token);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNIN.MSG,
                    jwt: token,
                    data: users
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG
                };
                res.status(500).json(json);
            });
        }
    };
    let signinController = new SigninController();
    return signinController;
})();
