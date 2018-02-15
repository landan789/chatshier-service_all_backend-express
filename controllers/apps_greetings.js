module.exports = (function() {
    let API_ERROR = require('../config/api_error');
    let API_SUCCESS = require('../config/api_success');

    let appsMdl = require('../models/apps');
    let usersMdl = require('../models/users');
    var groupsMdl = require('../models/groups');
    let appsGreetingsMdl = require('../models/apps_greetings');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    function AppsGreetingsController() {}

    /**
     * 使用者的 AppId 清單前置檢查程序
     *
     * @param {string} userId
     * @param {string} appId
     */
    let paramsChecking = function(params) {
        let appId = params.appid;
        let userId = params.userid;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                if (!appId) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                };
                usersMdl.findUser(userId, (data) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!data) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(user.group_ids, params.userid, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    } else if (appId && -1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsMdl.findByAppId(appId, (apps) => {
                    if (null === apps || undefined === apps || '' === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(apps);
                });
            });
        }).then((apps) => {
            var app = Object.values(apps)[0];
            var groupId = app.group_id;
            return new Promise((resolve, reject) => {
                groupsMdl.findGroups(groupId, params.userid, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(API_ERROR.GROUP_FAILED_TO_FIND);
                        return;
                    };
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var group = Object.values(groups)[0];
            var members = group.members;

            var userIds = Object.values(members).map((member) => {
                if (0 === member.isDeleted) {
                    return member.user_id;
                }
            });

            var index = userIds.indexOf(userId);

            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            };

            var member = Object.values(members)[index];

            if (0 === member.status) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
            };

            if (READ === member.type) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
            };
            return appId;
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.getAll = (req, res) => {
        let userId = req.params.userid;
        let proceed = new Promise((resolve, reject) => {
            resolve();
        });
        proceed.then(() => {
            if (!req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(userId, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids || [];
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
                    if (null === appIds || undefined === appIds || '' === appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                });
            });
        }).then((appIds) => { // 取得appIds下所有greetings
            return new Promise((resolve, reject) => {
                appsGreetingsMdl.findAll(appIds, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((greetings) => {
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
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.getOne = (req, res) => {
        return paramsChecking(req.params).then((checkedAppId) => {
            let appId = checkedAppId;
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
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.postOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let type = req.body.type;
        let text = req.body.text;
        let postGreeting = {
            type: type,
            text: text
        };
        return paramsChecking(req.params).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsGreetingsMdl.insert(appId, postGreeting, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_GREETING_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(result);
                });
            });
        }).then((greeting) => {
            let result = greeting !== undefined ? greeting : {};
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: result
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            let json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsGreetingsController.prototype.deleteOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let greetingId = req.params.greetingid;
        let appId = '';

        return paramsChecking(req.params).then((checkedAppId) => {
            appId = checkedAppId;

            if (!greetingId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有greetings
                appsGreetingsMdl.findGreetings(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                        return;
                    }
                    let greetingIds = Object.keys(data);
                    resolve(greetingIds);
                });
            });
        }).then((greetingIds) => { // 判斷appId中是否有目前greetingId
            return new Promise((resolve, reject) => {
                if (false === greetingIds.includes(greetingId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_GREETING);
                    return;
                }
                resolve();
            });
        }).then(() => { // 刪除目前greeting
            return new Promise((resolve, reject) => {
                appsGreetingsMdl.remove(appId, greetingId, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_GREETING_FAILED_TO_REMOVE);
                    }
                    resolve(result);
                });
            });
        }).then((greeting) => {
            let result = greeting !== undefined ? greeting : {};
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                data: result
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            let json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AppsGreetingsController();
}());
