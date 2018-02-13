module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

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

    function AppsKeywordrepliesController() {}

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
        }).then((userId) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(userId.group_ids, (appIds) => {
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
                groupsMdl.findGroups(groupId, (groups) => {
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
    AppsKeywordrepliesController.prototype.getAll = function(req, res) {
        let userId = req.params.userid;
        let appId = req.params.appid;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findUser(userId, (data) => {
                    if (!data) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((userId) => {
            // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(userId.group_ids, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appId);
                });
            });
        }).then((appId) => {
            // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.findKeywordreplies(appId, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
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
    AppsKeywordrepliesController.prototype.getOne = function(req, res) {
        return paramsChecking(req.params).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsKeywordrepliesMdl.findKeywordreplies(appId, (data) => {
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
        return paramsChecking(req.params).then((checkedAppId) => {
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
            res.status(403).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
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

        return paramsChecking(req.params).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve) => {
                appsKeywordrepliesMdl.findKeywordreplies(appId, (keywordrepliesData) => resolve(keywordrepliesData));
            });
        }).then((oldKeywordrepliesData) => {
            // 4. 將 ID 從 message 欄位中的 keywordreply_ids 移除
            return new Promise((resolve, reject) => {
                let oldMessageId = cipher.createHashKey(oldKeywordrepliesData[keywordreplyId].keyword);
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
            res.status(403).json(json);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     */
    AppsKeywordrepliesController.prototype.deleteOne = function(req, res) {
        let keywordreplyId = req.params.keywordreplyid;
        let appId = '';

        return paramsChecking(req.params).then((checkedAppId) => {
            appId = checkedAppId;
            return new Promise((resolve, reject) => {
                // 3. 將原本的 keywordreply 資料撈出，將 ID 從 message 欄位中的 keywordreply_ids 移除
                appsKeywordrepliesMdl.findKeywordreplies(appId, (keywordrepliesData) => {
                    let messageId = cipher.createHashKey(keywordrepliesData[keywordreplyId].keyword);
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
            res.status(403).json(json);
        });
    };

    return new AppsKeywordrepliesController();
})();