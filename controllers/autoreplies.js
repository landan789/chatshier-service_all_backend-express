var API_ERROR = require('../config/apiError');
var API_SUCCESS = require('../config/apiSuccess');
var userMdl = require('../models/users');
var autorepliesMdl = require('../models/autoreplies');
var autoreplies = {};

autoreplies.getAll = function(req, res, next) {
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                userMdl.findAppIdsByUserId(userId, (data) => {
                    var appIds = data;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                        return;
                    }

                    resolve();

                });
            });

        })
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                    } else {
                        resolve(data);
                    }
                })
            });
        })
        .then((data) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
                "data": data
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

autoreplies.get = function(req, res, next) {
    var appId = req.params.appid;
    var autoreplyId = req.params.autoreplyid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                userMdl.findAppIdsByUserId(userId, (data) => {
                    var appIds = data;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                        reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                        return;
                    }

                    resolve();

                });
            });

        })
        .then(() => {
            return new Promise((resolve, reject) => {
                autorepliesMdl.findOne(appId,autoreplyId,(data) => {
                    resolve(data);
                });
            });
        })
        .then((data) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
                "data": data
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

autoreplies.post = function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var appId = req.params.appid;
    var userId = req.params.userid;
    var dataObj = {
        name: req.body.name,
        start: req.body.start,
        end: req.body.end,
        content: req.body.content,
        delete: 0
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                userMdl.findAppIdsByUserId(userId, (data) => {
                    var appIds = data;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                        reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                        return;
                    }

                    resolve();

                });
            });

        })
        .then(() => {
            return new Promise((resolve, reject) => {
                autorepliesMdl.insert(appId, dataObj, (autorepliesid) => {
                    resolve(autorepliesid);
                });
            });
        })
        .then((data) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_INSERTED_SUCCESS.MSG,
                "data": data
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

autoreplies.put = function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var appId = req.params.appid;
    var autoreplyId = req.params.autoreplyid;
    var userId = req.params.userid;
    var dataObj = {
        appId: appId,
        autoreplyId: autoreplyId,
        name: req.body.name,
        start: req.body.start,
        end: req.body.end,
        content: req.body.content
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                userMdl.findAppIdsByUserId(userId, (data) => {
                    var appIds = data;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                        reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                        return;
                    }

                    resolve();

                });
            });

        })
        .then(() => {
            return new Promise((resolve, reject) => {
                autorepliesMdl.update(appId, autoreplyId, dataObj, () => {
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_UPDATED_SUCCESS.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

autoreplies.delete = function(req, res, next) {
    var appId = req.params.appid;
    var autoreplyId = req.params.autoreplyid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                userMdl.findAppIdsByUserId(userId, (data) => {
                    var appIds = data;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                        reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then((data) => {
            return new Promise((resolve, reject) => {
                autorepliesMdl.removeByAutoreplyId(appId, autoreplyId, (data) => {
                    if(data === false) {
                        reject('刪除失敗');
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_DELETED_SUCCESS.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

module.exports = autoreplies;