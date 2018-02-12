module.exports = (function() {
    let API_ERROR = require('../config/api_error');
    let API_SUCCESS = require('../config/api_success');

    let appsMdl = require('../models/apps');
    let userMdl = require('../models/users');
    let appsGreetingsMdl = require('../models/apps_greetings');

    function AppsGreetingsController() {}

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.getAll = (req, res) => {
        let userId = req.params.userid;
        let proceed = new Promise((resolve, reject) => {
            resolve();
        });
        proceed
            .then(() => { // 取得目前user下所有appIds
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    userMdl.findUser(userId, (user) => {
                        let appIds = user.app_ids;
                        if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                            reject(API_ERROR.APPID_WAS_EMPTY);
                            return;
                        }
                        resolve(appIds);
                    });
                });
            })
            .then((appIds) => { // 取得appIds下所有greetings
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.findAll(appIds, (data) => {
                        if (null === data || '' === data || undefined === data) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                            return;
                        }
                        resolve(data);
                    });
                });
            })
            .then((greetings) => {
                let result = greetings !== undefined ? greetings : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: result
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(403).json(json);
            });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.getOne = (req, res) => {
        let userId = req.params.userid;
        let appId = req.params.appid;

        let proceed = Promise.resolve();
        proceed.then(() => { // 取得目前user下所有appIds
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    let appIds = user.app_ids || [];

                    // 判斷user中是否有目前appId
                    if (!appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve(appIds);
                });
            });
        }).then(() => { // 取得目前greeting
            return new Promise((resolve, reject) => {
                appsGreetingsMdl.find(appId, (appGreetings) => {
                    if (!appGreetings) {
                        reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appGreetings);
                });
            });
        }).then((appGreetings) => {
            let result = appGreetings || {};
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: result
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            let json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(403).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.postOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let userId = req.params.userid;
        let appId = req.params.appid;

        let type = req.body.type;
        let text = req.body.text;
        let postGreeting = {
            type: type,
            text: text
        };

        let proceed = new Promise((resolve, reject) => {
            resolve();
        });
        proceed
            .then(() => { // 取得目前user下所有appIds
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    userMdl.findUser(userId, (user) => {
                        let appIds = user.app_ids;
                        if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                            reject(API_ERROR.APPID_WAS_EMPTY);
                            return;
                        }
                        resolve(appIds);
                    });
                });
            })
            .then((appIds) => { // 判斷user中是否有目前appId
                return new Promise((resolve, reject) => {
                    if (false === appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            })
            .then(() => { // 新增greeting到目前appId
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.insert(appId, postGreeting, (result) => {
                        if (false === result) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_INSERT);
                            return;
                        }
                        resolve(result);
                    });
                });
            })
            .then((greeting) => {
                let result = greeting !== undefined ? greeting : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: result
                };
                res.status(200).json(json);
            })
            .catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(403).json(json);
            });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.deleteOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let userId = req.params.userid;
        let greetingId = req.params.greetingid;
        let appId = req.params.appid;

        let proceed = new Promise((resolve, reject) => {
            resolve();
        });

        proceed
            .then(() => { // 取得目前user下所有appIds
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    userMdl.findUser(userId, (user) => {
                        let appIds = user.app_ids;
                        if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                            reject(API_ERROR.APPID_WAS_EMPTY);
                            return;
                        }
                        resolve(appIds);
                    });
                });
            })
            .then((appIds) => { // 判斷user中是否有目前appId
                return new Promise((resolve, reject) => {
                    if (false === appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            })
            .then(() => { // 取得目前appId下所有greetings
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.findGreetings(appId, (data) => {
                        if (null === data || '' === data || undefined === data) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                            return;
                        }
                        let greetingIds = Object.keys(data);
                        resolve(greetingIds);
                    });
                });
            })
            .then((greetingIds) => { // 判斷appId中是否有目前greetingId
                return new Promise((resolve, reject) => {
                    if (false === greetingIds.includes(greetingId)) {
                        reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_RICHMENU);
                        return;
                    }
                    resolve();
                });
            })
            .then(() => { // 刪除目前greeting
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.remove(appId, greetingId, (result) => {
                        if (false === result) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_REMOVE);
                        }
                        resolve(result);
                    });
                });
            })
            .then((greeting) => {
                let result = greeting !== undefined ? greeting : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: result
                };
                res.status(200).json(json);
            })
            .catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(403).json(json);
            });
    };

    return new AppsGreetingsController();
}());
