module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    // const cipher = require('../helpers/cipher');
    const appsComposesMdl = require('../models/apps_composes');
    // const appsMessagesMdl = require('../models/apps_messages');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');

    function AppsComposesController() {}

    /**
     * @param {Request} req
     * @param {Response} res
     * @param {Function} next
     */
    AppsComposesController.prototype.getAll = function(req, res, next) {
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };
        }).then(() => {
            // 1. 先用 userId 去 groups model 找到 appId 清單
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
                groupsMdl.findAppIds(groupIds, (appIds) => {
                    if (null === appIds || undefined === appIds || '' === appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                });
            });
        }).then((appIds) => {
            // 2. 再根據 appId 清單去 composes model 抓取清單
            return new Promise((resolve, reject) => {
                if (!appIds) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }

                appsComposesMdl.findAll(appIds, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(403).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.getOne = (req, res) => {
        let userId = req.params.userid;
        // let composeId = req.params.composeid;
        let appId = req.params.appid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
                return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
            };
        }).then(() => { // 取得目前user下所有groupIds
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
        }).then((user) => { // 判斷groups中是否有目前appId
            var groupIds = user.group_ids || [];
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(groupIds, (appIds) => {
                    if (!appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => { // 取得目前compose
            return new Promise((resolve, reject) => {
                appsComposesMdl.findOne(appId, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((compose) => {
            let result = compose !== undefined ? compose : {};
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
    AppsComposesController.prototype.postOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let userId = req.params.userid;
        let appId = req.params.appid;

        let status = req.body.status;
        let time = req.body.time;
        let type = req.body.type;
        let text = req.body.text;
        let postCompose = {
            type: type,
            text: text,
            time: time,
            status: status
        };

        let proceed = new Promise((resolve, reject) => {
            resolve();
        });
        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
                return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
            };
        }).then(() => { // 取得目前user下所有groupIds
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
        }).then((user) => { // 判斷groups中是否有目前appId
            var groupIds = user.group_ids || [];
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(groupIds, (appIds) => {
                    if (!appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => { // 新增compose到目前appId
            return new Promise((resolve, reject) => {
                appsComposesMdl.insert(appId, postCompose, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(result);
                });
            });
        }).then((compose) => {
            let result = compose !== undefined ? compose : {};
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
            res.status(403).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.putOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let userId = req.params.userid;
        let composeId = req.params.composeid;
        let appId = req.params.appid;
        let status = req.body.status;
        let time = req.body.time;
        let type = req.body.type;
        let text = req.body.text;
        let putComposesData = {
            type: type,
            text: text,
            time: time,
            status: status
        };

        let proceed = new Promise((resolve, reject) => {
            resolve();
        });

        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
                return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
            };

            if ('' === req.params.composeid || undefined === req.params.composeid || null === req.params.composeid) {
                return Promise.reject(API_ERROR.COMPOSEID_WAS_EMPTY);
            };
        }).then(() => { // 取得目前user下所有groupIds
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
        }).then((user) => { // 判斷groups中是否有目前appId
            var groupIds = user.group_ids || [];
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(groupIds, (appIds) => {
                    if (!appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => { // 取得目前appId下所有composes
            return new Promise((resolve, reject) => {
                appsComposesMdl.findComposes(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                        return;
                    }
                    let composeIds = Object.keys(data);
                    resolve(composeIds);
                });
            });
        }).then((composeIds) => { // 判斷appId中是否有目前composeId
            return new Promise((resolve, reject) => {
                if (false === composeIds.includes(composeId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_COMPOSE);
                    return;
                }
                resolve(composeId);
            });
        }).then((composeId) => { // 更新目前compose
            return new Promise((resolve, reject) => {
                appsComposesMdl.update(appId, composeId, putComposesData, (AppsCompose) => {
                    if (false === AppsCompose) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_UPDATE);
                    }
                    resolve(AppsCompose);
                });
            });
        }).then((AppsCompose) => {
            let result = AppsCompose !== undefined ? AppsCompose : {};
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
            res.status(403).json(json);
        });
    };
    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.deleteOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let userId = req.params.userid;
        let composeId = req.params.composeid;
        let appId = req.params.appid;

        let proceed = new Promise((resolve, reject) => {
            resolve();
        });

        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.appid || undefined === req.params.appid || null === req.params.appid) {
                return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
            };

            if ('' === req.params.composeid || undefined === req.params.composeid || null === req.params.composeid) {
                return Promise.reject(API_ERROR.COMPOSEID_WAS_EMPTY);
            };
        }).then(() => { // 取得目前user下所有groupIds
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
        }).then((user) => { // 判斷groups中是否有目前appId
            var groupIds = user.group_ids || [];
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(groupIds, (appIds) => {
                    if (!appIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => { // 取得目前appId下所有composes
            return new Promise((resolve, reject) => {
                appsComposesMdl.findComposes(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                        return;
                    }
                    let composeIds = Object.keys(data);
                    resolve(composeIds);
                });
            });
        }).then((composeIds) => { // 判斷appId中是否有目前composeId
            return new Promise((resolve, reject) => {
                if (false === composeIds.includes(composeId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_COMPOSE);
                    return;
                }
                resolve();
            });
        }).then(() => { // 刪除目前compose
            return new Promise((resolve, reject) => {
                appsComposesMdl.remove(appId, composeId, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_REMOVE);
                    }
                    resolve(result);
                });
            });
        }).then((AppsCompose) => {
            let result = AppsCompose !== undefined ? AppsCompose : {};
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
            res.status(403).json(json);
        });
    };

    return new AppsComposesController();
})();
