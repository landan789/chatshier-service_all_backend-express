module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
    const appsMessagesMdl = require('../models/apps_messages');
    const usersMdl = require('../models/users');

    function AppsKeywordrepliesController() {}

    /**
     * @param {Request} req
     * @param {Response} res
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.getAll = function(req, res, next) {
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findAppIdsByUserId(userId, (data) => {
                    resolve(data);
                });
            });
        }).then((appIds) => {
            // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
            return new Promise((resolve, reject) => {
                if (!appIds) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }

                appsKeywordrepliesMdl.findKeywordrepliesByAppIds(appIds, (data) => {
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
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.getOne = function(req, res, next) {
        let appId = req.params.appid;
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findAppIdsByUserId(userId, (data) => {
                    resolve(data);
                });
            });
        }).then((appIds) => {
            return new Promise((resolve, reject) => {
                // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                if (!appIds) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                } else if (-1 === appIds.indexOf(appId)) {
                    // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                // 3. 找到指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.findKeywordrepliesByAppIdByKeywordreplyId(appId, (keywordrepliesData) => {
                    if (!keywordrepliesData) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                        return;
                    }
                    resolve(keywordrepliesData);
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
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.postOne = function(req, res, next) {
        let appId = req.params.appid;
        let userId = req.params.userid;

        let postKeywordreplyData = {
            keyword: req.body.keyword || '',
            subKeywords: req.body.subKeywords || '',
            content: req.body.content || '',
            replyCount: req.body.replyCount || 0,
            replyMessagers: req.body.replyMessagers || '',
            isDraft: req.body.isDraft || 0,
            createdTime: req.body.createdTime || Date.now(),
            updatedTime: req.body.updatedTime || Date.now()
        };

        let proceed = Promise.resolve();
        proceed.then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findAppIdsByUserId(userId, (data) => {
                    resolve(data);
                });
            });
        }).then((appIds) => {
            return new Promise((resolve, reject) => {
                // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                if (!appIds) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                } else if (-1 === appIds.indexOf(appId)) {
                    // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                // 3. 插入新的 keywordreply 資料至指定的 appId 中
                appsKeywordrepliesMdl.insertByAppId(appId, postKeywordreplyData, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_INSERT);
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            return new Promise((resolve, reject) => {
                if (!data) {
                    reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_INSERT);
                }
                let messageId = data.messageId;
                let keywordreplyId = data.keywordreplyId;
                let srcKeywordreplyIds = [keywordreplyId];

                // 4. 取得該 App 中目前所有訊息，比對關鍵字的文字(hash)是否存在
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
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.putOne = function(req, res, next) {
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                resolve();
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
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.deleteOne = function(req, res, next) {
        let appId = req.params.appid;
        let keywordreplyId = req.params.keywordreplyid;
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findAppIdsByUserId(userId, (data) => {
                    resolve(data);
                });
            });
        }).then((appIds) => {
            return new Promise((resolve, reject) => {
                // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                if (!appIds) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                } else if (-1 === appIds.indexOf(appId)) {
                    // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                // 3. 刪除指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.removeByAppIdByKeywordreplyId(appId, keywordreplyId, (data) => {
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
