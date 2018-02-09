var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');

var appsMdl = require('../models/apps');
var usersMdl = require('../models/users');
var groupsMdl = require('../models/groups');
var appsTagsMdl = require('../models/apps_tags');

var apps = {};

apps.getAll = (req, res, next) => {

    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            var userId = req.params.userid;
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            };
            usersMdl.findUser(userId, (user) => {
                if (null === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        var groupIds = user.group_ids;
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(groupIds, (appIds) => {
                resolve(appIds);
                return;
            });
        });
    }).then((appIds) => {
        return new Promise((resolve, reject) => {
            appsMdl.findAppsByAppIds(appIds, (apps) => {
                if (null === apps || '' === apps || undefined === apps) {
                    apps = {};
                }
                resolve(apps);
            });
        });
    }).then((apps) => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: apps
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
}

apps.getOne = (req, res, next) => {
    var appId = req.params.appid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {

            if ('' === appId || null === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }

            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findAppIdsByUserId(userId, (data) => {
                var appIds = data;
                if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.findByAppId(appId, (data) => {
                var app = data;
                if ('' === app || null === app || undefined === app || (app instanceof Array && 0 === app.length)) {
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                resolve(app);
            });
        });
    }).then((data) => {
        var app = data;
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: app
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });

};

apps.postOne = (req, res, next) => {
    var userId = req.params.userid;
    var id1 = req.body.id1;
    var id2 = req.body.id2;
    var name = req.body.name;
    var secret = req.body.secret;
    var token1 = req.body.token1;
    var token2 = req.body.token2;
    var type = req.body.type;

    var postApp = {
        id1: undefined === req.body.id1 ? null : req.body.id1,
        id2: undefined === req.body.id2 ? null : req.body.id2,
        name: undefined === req.body.name ? null : req.body.name,
        secret: undefined === req.body.secret ? null : req.body.secret,
        token1: undefined === req.body.token1 ? null : req.body.token1,
        token2: undefined === req.body.token2 ? null : req.body.token2,
        type: undefined === req.body.type ? null : req.body.type,
        user_id: req.params.userid
    };
    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === id1 || null === id1 || undefined === id1) {
                reject(API_ERROR.ID1_WAS_EMPTY);
                return;
            }

            if ('' === name || null === name || undefined === name) {
                reject(API_ERROR.NAME_WAS_EMPTY);
                return;
            }

            if ('' === secret || null === secret || undefined === secret) {
                reject(API_ERROR.TYPE_WAS_EMPTY);
                return;
            }

            if ('' === token1 || null === token1 || undefined === token1) {
                reject(API_ERROR.TOKEN1_WAS_EMPTY);
                return;
            }

            if ('' === type || null === type || undefined === type) {
                reject(API_ERROR.TYPE_WAS_EMPTY);
                return;
            }

            resolve();
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.insertByUserid(userId, postApp, (result) => {
                if (!result) {
                    reject(API_ERROR.APP_FAILED_TO_INSERT);
                    return;
                }

                resolve(result);
            });
        });
    }).then((appId) => {
        return new Promise((resolve, reject) => {
            appsTagsMdl.insertDefaultTags(appId, (result) => {
                if (!result) {
                    reject(API_ERROR.APP_FAILED_TO_INSERT);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG
        }
        res.status(200).json(json);

    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
}
apps.putOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var id1 = req.body.id1;
    var id2 = req.body.id2;
    var name = req.body.name;
    var secret = req.body.secret;
    var token1 = req.body.token1;
    var token2 = req.body.token2;
    var type = req.body.type;

    var putApp = {
        id1: undefined === req.body.id1 ? null : req.body.id1,
        id2: req.body.id2 ? req.body.id2 : '',
        name: undefined === req.body.name ? null : req.body.name,
        secret: undefined === req.body.secret ? null : req.body.secret,
        token1: undefined === req.body.token1 ? null : req.body.token1,
        token2: undefined === req.body.token2 ? null : req.body.token2,
        type: undefined === req.body.type ? null : req.body.type,
        user_id: req.params.userid
    }

    // 前端未填入的訊息，不覆蓋
    for (var key in putApp) {
        if (null === putApp[key]) {
            delete putApp[key];
        }
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === id1 || null === id1 || undefined === id1) {
                reject(API_ERROR.ID1_WAS_EMPTY);
                return;
            }

            if ('' === name || null === name || undefined === name) {
                reject(API_ERROR.NAME_WAS_EMPTY);
                return;
            }

            if ('' === secret || null === secret || undefined === secret) {
                reject(API_ERROR.TYPE_WAS_EMPTY);
                return;
            }

            if ('' === token1 || null === token1 || undefined === token1) {
                reject(API_ERROR.TOKEN1_WAS_EMPTY);
                return;
            }

            if ('' === type || null === type || undefined === type) {
                reject(API_ERROR.TYPE_WAS_EMPTY);
                return;
            }

            resolve();
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findAppIdsByUserId(userId, (data) => {
                var appIds = data;
                if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.updateByAppId(appId, putApp, (data) => {
                if (false === data) {
                    reject(API_ERROR.APP_FAILED_TO_UPDATE);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
        }
        res.status(200).json(json);

    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
}

apps.deleteOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === appId || null === appId || undefined === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }


            resolve();
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findAppIdsByUserId(userId, (data) => {
                var appIds = data;
                if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.removeByAppId(appId, (result) => {
                if (false === result) {
                    reject(API_ERROR.APP_FAILED_TO_REMOVE);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG
        }
        res.status(200).json(json);

    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
}

module.exports = apps;