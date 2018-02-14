var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var usersMdl = require('../models/users');
var appsMdl = require('../models/apps');
var groupsMdl = require('../models/groups');
var appsAutorepliesMdl = require('../models/apps_autoreplies');
var appsAutoreplies = {};

appsAutoreplies.getAll = (req, res, next) => {
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
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
    }).then((data) => {
        var appIds = data;
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
        res.status(403).json(json);
    });
};

appsAutoreplies.getOne = (req, res, next) => {
    var appId = req.params.appid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
            return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
        };

        if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
            return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
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
                if (!appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
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
        res.status(403).json(json);
    });
};

appsAutoreplies.postOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var appId = req.params.appid;
    var userId = req.params.userid;
    var autoreply = {
        title: undefined === req.body.title ? '' : req.body.title,
        startedTime: undefined === req.body.startedTime ? 0 : req.body.startedTime,
        endedTime: undefined === req.body.endedTime ? 0 : req.body.endedTime,
        text: undefined === req.body.text ? '' : req.body.text
    };

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
            return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
        };

        if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
            return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
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
                if (!appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
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
        res.status(403).json(json);
    });
};

appsAutoreplies.putOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var appId = req.params.appid;
    var autoreplyId = req.params.autoreplyid;
    var userId = req.params.userid;
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

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
            return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
        };

        if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
            return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
        };

        if ('' === req.params.autoreplyid || undefined === req.params.autoreplyid || null === req.params.autoreplyid) {
            return Promise.reject(API_ERROR.AUTOREPLYID_WAS_EMPTY);
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
                if (!appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        });
    }).then(() => { // 取得目前appId下所有autoreplies
        return new Promise((resolve, reject) => {
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
        res.status(403).json(json);
    });
};

appsAutoreplies.deleteOne = (req, res, next) => {
    var appId = req.params.appid;
    var autoreplyId = req.params.autoreplyid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
            return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
        };

        if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
            return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
        };

        if ('' === req.params.autoreplyid || undefined === req.params.autoreplyid || null === req.params.autoreplyid) {
            return Promise.reject(API_ERROR.AUTOREPLYID_WAS_EMPTY);
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
                if (!appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        });
    }).then(() => { // 取得目前appId下所有autoreplies
        return new Promise((resolve, reject) => {
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
        res.status(403).json(json);
    });
};

module.exports = appsAutoreplies;
