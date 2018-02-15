module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    // const cipher = require('../helpers/cipher');
    const appsComposesMdl = require('../models/apps_composes');
    // const appsMessagesMdl = require('../models/apps_messages');
    const appsMdl = require('../models/apps');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    function AppsComposesController() {}

    /**
     * 使用者的 AppId 清單前置檢查程序
     *
     * @param {string} userId
     * @param {string} appId
     */
    let paramsChecking = function(params, req) {
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
                usersMdl.findUser(userId, (user) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(user.group_ids, params.userid, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_FAILED_TO_FIND);
                        return;
                    };
                    if (0 > appIds.indexOf(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    };
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
                groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
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
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.getOne = (req, res) => {
        return paramsChecking(req.params).then((checkedAppId) => {
            let appId = checkedAppId;
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
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.postOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');

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

        return paramsChecking(req.params).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                if (postCompose.time < Date.now()) {
                    reject(API_ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                };
                resolve(appId);
            });
        }).then((checkedAppId) => {
            let appId = checkedAppId;
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
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.putOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let composeId = req.params.composeid;
        let appId = '';
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

        return paramsChecking(req.params).then((checkedAppId) => {
            appId = checkedAppId;

            if (!composeId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有composes
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
        }).then(() => { // 更新目前compose
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
            res.status(500).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsComposesController.prototype.deleteOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let composeId = req.params.composeid;
        let appId = '';

        return paramsChecking(req.params, req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!composeId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };

            return new Promise((resolve, reject) => { // 取得目前appId下所有composes
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
            res.status(500).json(json);
        });
    };

    return new AppsComposesController();
})();
