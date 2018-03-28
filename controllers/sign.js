module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const CHATSHIER = require('../config/chatshier');

    const ciperHlp = require('../helpers/cipher');
    const jwtHlp = require('../helpers/jwt');
    const fuseHlp = require('../helpers/fuse');
    const redisHlp = require('../helpers/redis');
    const usersMdl = require('../models/users');

    class SignController {
        postSignin(req, res, next) {
            let token;
            let users;
            let userId;
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
                        // If the user email deoes not exist then REST API can not sign up
                        if (0 === Object.keys(_users).length) {
                            reject(API_ERROR.USER_FAILED_TO_FIND);
                            return;
                        };
                        users = _users;
                        resolve(users);
                    });
                });
            }).then(() => {
                userId = Object.keys(users).shift() || '';
                let user = users[userId];
                // The encoded user password from front end must match to the user password in database
                if (ciperHlp.encode(req.body.password) !== user.password) {
                    return Promise.reject(API_ERROR.PASSWORD_WAS_INCORRECT);
                };
                // user password must never reponse to client
                users[userId].password = '';
                return Promise.resolve();
            }).then(() => {
                userId = Object.keys(users).shift();
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
            }).then((users) => {
                // 更新 user fuzzy search 清單，使搜尋時可找到此 user
                fuseHlp.updateUsers(users);

                let redisReqBody = JSON.stringify({
                    users: users,
                    eventName: redisHlp.EVENTS.UPDATE_FUSE_USERS
                });
                return redisHlp.publish(redisHlp.CHANNELS.REDIS_API_CHANNEL, redisReqBody).then(() => {
                    return users;
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
                    usersMdl.find(req.params.userid, null, (_users) => {
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
