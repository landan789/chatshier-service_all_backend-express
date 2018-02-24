module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');
    var usersMdl = require('../models/users');
    var appsMdl = require('../models/apps');
    var groupsMdl = require('../models/groups');
    var appsAutorepliesMdl = require('../models/apps_autoreplies');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const DELETE = 'DELETE';
    function AppsAutorepliesController() {};

    /**
     * 使用者的 AppId 清單前置檢查程序
     */
    let _paramsCheckingGetAll = function(params) {
        let appId = params.appid;
        let userId = params.userid;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
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
                    resolve(appIds);
                });
            });
        });
    };

    /**
     * 使用者的 AppId 清單前置檢查程序
     */
    let _requestChecking = function(req) {
        let appId = req.params.appid;
        let userId = req.params.userid;
        let method = req.method;

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
                groupsMdl.findAppIds(user.group_ids, userId, (appIds) => {
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
                groupsMdl.findGroups(groupId, userId, (groups) => {
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

            var member = members[Object.keys(members)[index]];

            if (0 === member.status) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
            };

            if (READ === member.type && (POST === method || PUT === method || DELETE === method)) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
            };
            return appId;
        });
    };

    AppsAutorepliesController.prototype.getAll = (req, res, next) => {
        return _paramsCheckingGetAll(req.params).then((appIds) => {
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.findByAppIds(appIds, (data) => {
                    if (undefined === data || null === data || '' === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            let apps = data;
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: apps
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsAutorepliesController.prototype.getOne = (req, res, next) => {
        return _requestChecking(req).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.find(appId, (data) => {
                    if (false === data || undefined === data || '' === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((appsAutoreplies) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: appsAutoreplies
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsAutorepliesController.prototype.postOne = (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        var autoreply = {
            title: undefined === req.body.title ? '' : req.body.title,
            startedTime: undefined === req.body.startedTime ? 0 : req.body.startedTime,
            endedTime: undefined === req.body.endedTime ? 0 : req.body.endedTime,
            text: undefined === req.body.text ? '' : req.body.text
        };

        return _requestChecking(req).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.insert(appId, autoreply, (appsAutoreplies) => {
                    if (null === appsAutoreplies || undefined === appsAutoreplies || '' === appsAutoreplies) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(appsAutoreplies);
                });
            });
        }).then((appsAutoreplies) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: appsAutoreplies
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsAutorepliesController.prototype.putOne = (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        var appId = req.params.appid;
        var autoreplyId = req.params.autoreplyid;
        var autoreply = {
            title: undefined === req.body.title ? '' : req.body.title,
            startedTime: undefined === req.body.startedTime ? 0 : req.body.startedTime,
            endedTime: undefined === req.body.endedTime ? 0 : req.body.endedTime,
            text: undefined === req.body.text ? '' : req.body.text,
            isDeleted: 0
        };

        // 前端未填入的訊息，不覆蓋
        for (var key in autoreply) {
            if (null === autoreply[key]) {
                delete autoreply[key];
            }
        }
        return _requestChecking(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!autoreplyId) {
                return Promise.reject(API_ERROR.AUTOREPLYID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有autoreplies
                appsAutorepliesMdl.findAutorepliesByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    let autoreplyIds = Object.keys(data);
                    resolve(autoreplyIds);
                });
            });
        }).then((autoreplyIds) => { // 判斷appId中是否有目前autoreplyId
            return new Promise((resolve, reject) => {
                if (false === autoreplyIds.includes(autoreplyId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.update(appId, autoreplyId, autoreply, (data) => {
                    if (undefined === data || null === data || '' === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_UPDATE);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((appsAutoreplies) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: appsAutoreplies
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsAutorepliesController.prototype.deleteOne = (req, res, next) => {
        let autoreplyId = req.params.autoreplyid;
        let appId = '';

        return _requestChecking(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!autoreplyId) {
                return Promise.reject(API_ERROR.AUTOREPLYID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有autoreplies
                appsAutorepliesMdl.findAutorepliesByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    let autoreplyIds = Object.keys(data);
                    resolve(autoreplyIds);
                });
            });
        }).then((autoreplyIds) => { // 判斷appId中是否有目前autoreplyId
            return new Promise((resolve, reject) => {
                if (false === autoreplyIds.includes(autoreplyId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.removeByAppIdByAutoreplyId(appId, autoreplyId, (data) => {
                    if (false === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_REMOVE);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((appsAutoreplies) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                data: appsAutoreplies
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AppsAutorepliesController();
}());
