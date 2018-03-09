module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const cipher = require('../helpers/cipher');
    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
    const appsMdl = require('../models/apps');
    const appsMessagesMdl = require('../models/apps_messages');
    const groupsMdl = require('../models/groups');
    const usersMdl = require('../models/users');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const DELETE = 'DELETE';
    function AppsKeywordrepliesController() {};

    util.inherits(AppsKeywordrepliesController, controllerCre.constructor);

    AppsKeywordrepliesController.prototype.getAll = function(req, res) {
        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.findKeywordreplies(appIds, (appsKeywordreplies) => {
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
                appsKeywordrepliesMdl.findOne(appId, keywordreplyId, (data) => {
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
        let postKeywordreplyData = {
            keyword: req.body.keyword || '',
            subKeywords: req.body.subKeywords || '',
            text: req.body.text || '',
            replyCount: req.body.replyCount ? req.body.replyCount : 0,
            status: req.body.status ? req.body.status : 0,
            createdTime: req.body.createdTime || Date.now(),
            updatedTime: req.body.updatedTime || Date.now(),
            isDeleted: 0
        };
        var appId = '';
        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.insert(appId, postKeywordreplyData, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(result);
                });
            });
        }).then((data) => {
            // 如果此筆資料屬於草稿階段，不需進行下面程序
            if (!postKeywordreplyData.status) {
                return true;
            }

            // 4. 取得該關鍵字生成的 messageId，比對關鍵字的文字(hash)是否存在
            return new Promise((resolve, reject) => {
                if (!data) {
                    reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_INSERT);
                }
                let messageId = data.messageId;
                let keywordreplyId = data.keywordreplyId;
                let srcKeywordreplyIds = [keywordreplyId];

                appsMessagesMdl.findKeywordreplyIds(appId, messageId, (destKeywordreplyIds) => {
                    if (destKeywordreplyIds) {
                        // 如果訊息資料存在將原本的關鍵字回覆清單串接起來
                        srcKeywordreplyIds = srcKeywordreplyIds.concat(destKeywordreplyIds || []);
                    }

                    // 5. 將關鍵字回覆清單更新到 app 的 message 裡
                    appsMessagesMdl.updateKeywordreplyIds(appId, messageId, srcKeywordreplyIds, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_INSERT);
                        }
                        resolve(data);
                    });
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
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

    AppsKeywordrepliesController.prototype.putOne = function(req, res) {
        let keywordreplyId = req.params.keywordreplyid;
        let appId = '';
        let putKeywordreplyData = {
            keyword: req.body.keyword || '',
            subKeywords: req.body.subKeywords || '',
            text: req.body.text || '',
            replyCount: 0,
            status: req.body.status ? req.body.status : 0,
            updatedTime: req.body.updatedTime || Date.now()
        };

        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve) => {
                appsKeywordrepliesMdl.findKeywordreplies(appId, (keywordrepliesData) => resolve(keywordrepliesData));
            });
        }).then((oldKeywordrepliesData) => {
            // 4. 將 ID 從 message 欄位中的 keywordreply_ids 移除
            return new Promise((resolve, reject) => {
                let oldMessageId = cipher.createHashKey(oldKeywordrepliesData[appId].keywordreplies[keywordreplyId].keyword);
                appsMessagesMdl.findKeywordreplyIds(appId, oldMessageId, (oldKeywordreplyIds) => {
                    if (!(oldKeywordreplyIds instanceof Array)) {
                        resolve();
                        return;
                    }

                    // 找到原本的 keywordreplyIds 清單中有無包含目標 keywordreplyId
                    let idx = oldKeywordreplyIds.indexOf(keywordreplyId);
                    if (idx >= 0) {
                        oldKeywordreplyIds.splice(idx, 1);
                        // 更新原本 message 中的 keywordreply_ids 欄位
                        appsMessagesMdl.updateKeywordreplyIds(appId, oldMessageId, oldKeywordreplyIds, () => {
                            resolve();
                        });
                    }
                    resolve();
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                // 5. 更新指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.update(appId, keywordreplyId, putKeywordreplyData, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_UPDATE);
                        return;
                    }

                    // 如果此筆資料屬於草稿階段，不需進行下面程序
                    if (!putKeywordreplyData.status) {
                        resolve(true);
                        return;
                    }

                    // 6. 更新 messages 欄位的 keywordreply_ids
                    let messageId = data.messageId;
                    appsMessagesMdl.findKeywordreplyIds(appId, messageId, (keywordreplyIds) => {
                        keywordreplyIds = keywordreplyIds || [];
                        keywordreplyIds.push(data.keywordreplyId);
                        appsMessagesMdl.updateKeywordreplyIds(appId, messageId, keywordreplyIds, (data) => {
                            resolve(data);
                        });
                    });
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
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

    AppsKeywordrepliesController.prototype.deleteOne = function(req, res) {
        let keywordreplyId = req.params.keywordreplyid;
        let appId = '';

        return AppsKeywordrepliesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve, reject) => {
                // 3. 將原本的 keywordreply 資料撈出，將 ID 從 message 欄位中的 keywordreply_ids 移除
                appsKeywordrepliesMdl.findKeywordreplies(appId, (keywordrepliesData) => {
                    let messageId = cipher.createHashKey(keywordrepliesData[appId].keywordreplies[keywordreplyId].keyword);
                    appsMessagesMdl.findKeywordreplyIds(appId, messageId, (keywordreplyIds) => {
                        if (!(keywordreplyIds instanceof Array)) {
                            resolve();
                            return;
                        }

                        let idx = keywordreplyIds.indexOf(keywordreplyId);
                        if (idx >= 0) {
                            keywordreplyIds.splice(idx, 1);
                            appsMessagesMdl.updateKeywordreplyIds(appId, messageId, keywordreplyIds, () => {
                                resolve();
                            });
                            return;
                        }
                        resolve();
                    });
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                // 4. 刪除指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.remove(appId, keywordreplyId, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_REMOVE);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
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

    return new AppsKeywordrepliesController();
})();
