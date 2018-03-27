module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const CHATSHIER = require('../config/chatshier');
    let ciperHlp = require('../helpers/cipher');
    let usersMdl = require('../models/users');
    var jwtHlp = require('../helpers/jwt');

    class SignController {
        postSignin(req, res, next) {
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
                    usersMdl.find(null, req.body.email, (users) => {
                        // If the user email exists then REST API can not insert any user
                        if (0 < Object.keys(users).length) {
                            reject(API_ERROR.USER_EMAIL_HAD_BEEN_SIGNED_UP);
                            return;
                        };
                        resolve();
                    });
                });
            }).then(() => {
                let userId = Object.keys(users).shift() || '';
                let user = users[userId];
                // The encoded user password from front end must match to the user password in database
                if (ciperHlp.encode(req.body.password) !== user.password) {
                    return Promise.reject(API_ERROR.PASSWORD_WAS_INCORRECT);
                };
                // user password must never reponse to client
                users[userId].password = '';
                return Promise.resolve();
            }).then(() => {
                let userId = Object.keys(users).shift();
                token = jwtHlp.sign(userId);
                return Promise.resolve(token);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNIN.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: CHATSHIER.COOKIE.DOMAIN,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        postSignout(req, res, next) {
            let token;
            let users;
            return Promise.resolve().then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNOUT.MSG,
                    jwt: '',
                    data: {}
                };
                let options = {
                    domain: CHATSHIER.COOKIE.DOMAIN,
                    maxAge: 0,
                    httpOnly: true,
                    expires: new Date(Date.now() - CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }
        postSignup(req, res, next) {
            let token;
            let users;
            return Promise.resolve().then(() => {
                if (!req.body.name) {
                    return Promise.reject(API_ERROR.NAME_WAS_EMPTY);
                };

                if (!req.body.email) {
                    return Promise.reject(API_ERROR.EMAIL_WAS_EMPTY);
                };

                if (!req.body.password) {
                    return Promise.reject(API_ERROR.PASSWORD_WAS_EMPTY);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(null, req.body.email, (users) => {
                        // If the user email exists then REST API can not insert any user
                        if (0 < Object.keys(users).length) {
                            reject(API_ERROR.USER_EMAIL_HAD_BEEN_SIGNED_UP);
                            return;
                        };
                        resolve();
                    });
                });
            }).then(() => {
                let user = {
                    name: req.body.name,
                    email: req.body.email,
                    password: ciperHlp.encode(req.body.password)
                };
                return new Promise((resolve, reject) => {
                    usersMdl.insert(user, (_users) => {
                        users = _users;
                        resolve(users);
                    });
                });
            }).then(() => {
                let userId = Object.keys(users).shift() || '';
                token = jwtHlp.sign(userId);
                return Promise.resolve(token);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNUP.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: CHATSHIER.COOKIE.DOMAIN,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        postRefresh(req, res, next) {
            let token;
            let users;
            return Promise.resolve().then(() => {
                if (!req.params.userid) {
                    return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(req.body.userid, null, (_users) => {
                        // If the user exists then REST API can not insert any user
                        users = _users;
                        if (!users) {
                            reject(API_ERROR.USER_FAILED_TO_FIND);
                            return;
                        };
                        resolve();
                    });
                });
            }).then(() => {
                let userId = Object.keys(users).shift() || '';
                token = jwtHlp.sign(userId);
                return Promise.resolve(token);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNUP.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: CHATSHIER.COOKIE.DOMAIN,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

    };
    return new SignController();
})();
