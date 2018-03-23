module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    var appsAutorepliesMdl = require('../models/apps_autoreplies');

    function AppsAutorepliesController() {};

    util.inherits(AppsAutorepliesController, controllerCre.constructor);

    AppsAutorepliesController.prototype.getAll = (req, res, next) => {
        return AppsAutorepliesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.find(appIds, null, (data) => {
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
        var appId = '';
        var autoreplyId = req.params.autoreplyid;
        return AppsAutorepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsAutorepliesMdl.find(appId, autoreplyId, (appsAutoreplies) => {
                    if (false === appsAutoreplies || undefined === appsAutoreplies || '' === appsAutoreplies) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appsAutoreplies);
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

        return AppsAutorepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
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
            text: undefined === req.body.text ? '' : req.body.text
        };

        // 前端未填入的訊息，不覆蓋
        for (var key in autoreply) {
            if (null === autoreply[key]) {
                delete autoreply[key];
            }
        }
        return AppsAutorepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!autoreplyId) {
                return Promise.reject(API_ERROR.AUTOREPLYID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有autoreplies
                appsAutorepliesMdl.findAutoreplies(appId, (data) => {
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

        return AppsAutorepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!autoreplyId) {
                return Promise.reject(API_ERROR.AUTOREPLYID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有autoreplies
                appsAutorepliesMdl.findAutoreplies(appId, (data) => {
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
                appsAutorepliesMdl.remove(appId, autoreplyId, (data) => {
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
