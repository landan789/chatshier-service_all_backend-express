module.exports = (function() {
    const passport = require('passport');
    const JwtStrategy = require('passport-jwt').Strategy;

    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');
    const CHATSHIER = require('../config/chatshier');
    const OF_GROUP = '的部門';

    let grecaptchaHlp = require('../helpers/grecaptcha');
    let ciperHlp = require('../helpers/cipher');
    let emailHlp = require('../helpers/email');
    let jwtHlp = require('../helpers/jwt');
    let fuseHlp = require('../helpers/fuse');
    let redisHlp = require('../helpers/redis');
    let domainHlp = require('../helpers/domain');

    let appsMdl = require('../models/apps');
    let appsChatroomsMdl = require('../models/apps_chatrooms');
    let appsFieldsMdl = require('../models/apps_fields');
    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');

    class SignController extends ControllerCore {
        constructor() {
            super();
            this.postSignin = this.postSignin.bind(this);
            this.postSignout = this.postSignout.bind(this);
            this.postSignup = this.postSignup.bind(this);
            this.postRefresh = this.postRefresh.bind(this);

            this.postResetPassword = this.postResetPassword.bind(this);
            this.postChangePassword = this.postChangePassword.bind(this);
            this.putChangePassword = this.putChangePassword.bind(this);
        }

        postSignin(req, res, next) {
            let token;
            let users;
            let userId;
            let user = {
                email: (req.body.email || '').toLowerCase(),
                password: req.body.password || ''
            };

            let domain = domainHlp.get(req.hostname);
            return Promise.resolve().then(() => {
                if (!user.email) {
                    return Promise.reject(ERROR.USER_EMAIL_WAS_EMPTY);
                };

                if (!user.password) {
                    return Promise.reject(ERROR.PASSWORD_WAS_EMPTY);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(void 0, user.email, (_users) => {
                        // If the user email deoes not exist then REST API can not sign up
                        if (!_users || (_users && 0 === Object.keys(_users).length)) {
                            reject(ERROR.USER_FAILED_TO_FIND);
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
                    return Promise.reject(ERROR.PASSWORD_WAS_INCORRECT);
                };
                // user password must never reponse to client
                users[userId].password = void 0;
                return Promise.resolve();
            }).then(() => {
                userId = Object.keys(users).shift() || '';
                token = jwtHlp.sign(userId);
                return Promise.resolve(token);
            }).then((token) => {
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNIN.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: domain,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };

                res.cookie('jwt', token, options);
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postSignout(req, res, next) {
            let domain = domainHlp.get(req.hostname);

            return Promise.resolve().then(() => {
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNOUT.MSG
                };
                let options = {
                    domain: domain,
                    maxAge: 0,
                    httpOnly: true,
                    expires: Date.now()
                };
                res.cookie('jwt', '', options);
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postSignup(req, res, next) {
            let token;
            let users;
            let userId;
            let groups;
            let groupId;
            let domain = domainHlp.get(req.hostname);
            let userName = req.body.name || '';
            let userEmail = (req.body.email || '').toLowerCase();

            return Promise.resolve().then(() => {
                if (!userName) {
                    return Promise.reject(ERROR.NAME_WAS_EMPTY);
                };

                if (!userEmail) {
                    return Promise.reject(ERROR.USER_EMAIL_WAS_EMPTY);
                };

                if (!req.body.password) {
                    return Promise.reject(ERROR.PASSWORD_WAS_EMPTY);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(void 0, userEmail, (users) => {
                        // If the user email exists then REST API can not insert any user
                        if (users && 0 < Object.keys(users).length) {
                            reject(ERROR.USER_EMAIL_HAD_BEEN_SIGNED_UP);
                            return;
                        };
                        resolve(users);
                    });
                });
            }).then(() => {
                userId = groupsMdl.Types.ObjectId().toHexString();
                let group = {
                    name: (req.body.name) + OF_GROUP
                };
                return new Promise((resolve, reject) => {
                    groupsMdl.insert(userId, group, (groups) => {
                        if (!groups) {
                            reject(ERROR.GROUP_FAILED_TO_INSERT);
                            return;
                        }
                        resolve(groups);
                    });
                });
            }).then((_groups) => {
                groups = _groups;
                groupId = Object.keys(groups).shift();
                let user = {
                    _id: userId,
                    name: req.body.name,
                    email: userEmail,
                    password: ciperHlp.encode(req.body.password),
                    group_ids: [groupId]
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

                // 群組新增處理完畢後，自動新增一個內部聊天室的 App
                let group = groups[groupId];
                let postApp = {
                    name: 'Chatshier - ' + group.name,
                    type: 'CHATSHIER',
                    group_id: groupId
                };
                return appsMdl.insert(postApp);
            }).then((apps) => {
                if (!apps || (apps && 0 === Object.keys(apps).length)) {
                    return Promise.reject(ERROR.APP_FAILED_TO_INSERT);
                }
                let appId = Object.keys(apps).shift() || '';

                // 為 App 創立一個 chatroom 並將 group 裡的 members 新增為 messagers

                // TODO 耦合性太高 chatroom 不因該 相依於 signup
                return appsChatroomsMdl.insert(appId).then((appsChatrooms) => {
                    if (!appsChatrooms) {
                        return Promise.reject(ERROR.APP_CHATROOM_FAILED_TO_INSERT);
                    }

                    // 將預設的客戶分類條件資料新增至 App 中
                    return appsFieldsMdl.insertDefaultFields(appId).then((appsFields) => {
                        if (!appsFields) {
                            return Promise.reject(ERROR.APP_FAILED_TO_INSERT);
                        }
                        return Promise.resolve(appsFields);
                    });
                });
            }).then(() => {
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNUP.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: domain,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postRefresh(req, res, next) {
            let token;
            let users;
            let domain = domainHlp.get(req.hostname);

            return Promise.resolve().then(() => {
                if (!req.params.userid) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(req.params.userid, void 0, (_users) => {
                        // If the user exists then REST API can not insert any user
                        users = _users;
                        if (!users) {
                            reject(ERROR.USER_FAILED_TO_FIND);
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
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNUP.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: domain,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postResetPassword(req, res) {
            let userEmail = (req.body.email || '').toLowerCase();
            let recaptchaResponse = req.body.recaptchaResponse;
            let domain = domainHlp.get(req.hostname);

            return Promise.resolve().then(() => {
                if (!userEmail) {
                    return Promise.reject(ERROR.USER_EMAIL_WAS_EMPTY);
                }

                if (!recaptchaResponse) {
                    return Promise.reject(ERROR.INVALID_REQUEST_BODY_DATA);
                }

                return grecaptchaHlp.verifyingUserResponse(recaptchaResponse);
            }).then((resJson) => {
                if (!resJson.success) {
                    return Promise.reject(ERROR.PASSWORD_FAILED_TO_RESET);
                }
                return usersMdl.find(void 0, userEmail);
            }).then((users) => {
                if (!users || (users && 1 !== Object.keys(users).length)) {
                    return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                }

                let userId = Object.keys(users)[0];
                let token = jwtHlp.sign(userId, 5 * 60 * 1000); // 使用者必須在 5 分鐘之內完成此次重設密碼動作
                let serverAddr = req.protocol + '://' + req.hostname + (req.subdomains.includes('fea') ? ':3002' : '');

                return emailHlp.sendResetPWMail(serverAddr, userEmail, token).then((result) => {
                    if (result.rejected.indexOf(userEmail) >= 0) {
                        return Promise.reject(ERROR.EMAIL_FAILED_TO_SEND);
                    }
                    return result;
                });
            }).then(() => {
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_RESET_PASSWORD.MSG
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postChangePassword(req, res, next) {
            let password = req.body.password;
            let newPassword = req.body.newPassword;
            let newPasswordCfm = req.body.newPasswordCfm;
            let userId = req.params.userid;
            let token;
            let domain = domainHlp.get(req.hostname);

            return Promise.resolve().then(() => {
                if (!password) {
                    return Promise.reject(ERROR.PASSWORD_WAS_EMPTY);
                } else if (!(newPassword && newPasswordCfm && newPassword === newPasswordCfm)) {
                    return Promise.reject(ERROR.NEW_PASSWORD_WAS_INCONSISTENT);
                }

                return usersMdl.find(userId).then((users) => {
                    if (!users || (users && 1 !== Object.keys(users).length)) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }

                    let user = users[userId];
                    if (ciperHlp.encode(password) !== user.password) {
                        return Promise.reject(ERROR.PASSWORD_WAS_INCORRECT);
                    }

                    let postUser = {
                        password: ciperHlp.encode(newPassword)
                    };
                    return usersMdl.update(userId, postUser).then((users) => {
                        if (!(users && users[userId])) {
                            return Promise.reject(ERROR.USER_FAILED_TO_UPDATE);
                        }
                        // user password must never reponse to client
                        users[userId].password = void 0;
                        token = jwtHlp.sign(userId);
                        return Promise.resolve(users);
                    });
                });
            }).then((users) => {
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_CHANGE_PASSWORD.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: domain,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putChangePassword(req, res, next) {
            let newPassword = req.body.newPassword;
            let newPasswordCfm = req.body.newPasswordCfm;
            let userId = req.params.userid;
            let token;
            let domain = domainHlp.get(req.hostname);

            return Promise.resolve().then(() => {
                if (!(newPassword && newPasswordCfm && newPassword === newPasswordCfm)) {
                    return Promise.reject(ERROR.NEW_PASSWORD_WAS_INCONSISTENT);
                }

                return usersMdl.find(userId).then((users) => {
                    if (!users || (users && 0 === Object.keys(users).length)) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }

                    let user = {
                        password: ciperHlp.encode(newPassword)
                    };
                    return usersMdl.update(userId, user).then((users) => {
                        if (!users || (users && 0 === Object.keys(users).length)) {
                            return Promise.reject(ERROR.USER_FAILED_TO_UPDATE);
                        }
                        // user password must never reponse to client
                        users[userId].password = void 0;
                        token = jwtHlp.sign(userId);
                        return Promise.resolve(users);
                    });
                });
            }).then((users) => {
                let suc = {
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_CHANGE_PASSWORD.MSG,
                    jwt: token,
                    data: users
                };
                let options = {
                    domain: domain,
                    maxAge: CHATSHIER.JWT.EXPIRES,
                    httpOnly: true,
                    expires: new Date(Date.now() + CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new SignController();
})();
