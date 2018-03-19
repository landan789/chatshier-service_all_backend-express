module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');

    function AppsKeywordrepliesController() {};

    util.inherits(AppsKeywordrepliesController, controllerCre.constructor);

    AppsKeywordrepliesController.prototype.getAll = function(req, res) {
        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.find(appIds, null, (appsKeywordreplies) => {
                    if (!appsKeywordreplies) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appsKeywordreplies);
                });
            });
        }).then((appsKeywordreplies) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: appsKeywordreplies
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

    AppsKeywordrepliesController.prototype.getOne = function(req, res) {
        let keywordreplyId = req.params.keywordreplyid;
        let appId = '';
        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.find(appId, keywordreplyId, (data) => {
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

    AppsKeywordrepliesController.prototype.postOne = function(req, res) {
        let postKeywordreply = {
            keyword: req.body.keyword || '',
            subKeywords: req.body.subKeywords || '',
            text: req.body.text || '',
            replyCount: req.body.replyCount ? req.body.replyCount : 0,
            status: req.body.status ? req.body.status : 0
        };
        var appId = '';
        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds.shift();
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.insert(appId, postKeywordreply, (appsKeywordreplies) => {
                    if (!appsKeywordreplies) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(appsKeywordreplies);
                });
            });
        }).then((appsKeywordreplies) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: appsKeywordreplies
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

    AppsKeywordrepliesController.prototype.putOne = function(req, res) {
        let keywordreplyId = req.params.keywordreplyid;
        let appId = '';
        let putKeywordreply = {
            keyword: req.body.keyword || '',
            subKeywords: req.body.subKeywords || '',
            text: req.body.text || '',
            replyCount: 0,
            status: req.body.status ? req.body.status : 0
        };

        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((appIds) => {
            appId = appIds.shift();
            return new Promise((resolve, reject) => {
                // 5. 更新指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.update(appId, keywordreplyId, putKeywordreply, (appsKeywordreplies) => {
                    if (!appsKeywordreplies) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_UPDATE);
                        return;
                    };
                    resolve(appsKeywordreplies);
                });
            });
        }).then((appsKeywordreplies) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: appsKeywordreplies
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

    AppsKeywordrepliesController.prototype.deleteOne = function(req, res) {
        let keywordreplyId = req.params.keywordreplyid;
        let appId;
        
        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds.shift();

            return new Promise((resolve, reject) => {
                // 4. 刪除指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.remove(appId, keywordreplyId, (appsKeywordreplies) => {
                    if (!appsKeywordreplies) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_REMOVE);
                        return;
                    }
                    resolve(appsKeywordreplies);
                });
            });
        }).then((appsKeywordreplies) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                data: appsKeywordreplies
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

    return new AppsKeywordrepliesController();
})();
