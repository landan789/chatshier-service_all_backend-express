module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
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
            AppsKeywordrepliesController.sendSuccess(res, data);
        }).catch((ERROR) => {
            AppsKeywordrepliesController.sendError(res, ERROR);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.getOne = function(req, res, next) {
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

                // 3. 找到指定的 appId 中的 keywordreply 資料
                appsKeywordrepliesMdl.findKeywordrepliesByAppIdByKeywordreplyId(appId, keywordreplyId, (data) => {
                    if (!appIds) {
                        reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            AppsKeywordrepliesController.sendSuccess(res, data);
        }).catch((ERROR) => {
            AppsKeywordrepliesController.sendError(res, ERROR);
        });
    };

    /**
     * @param {Request} req
     * @param {Response} res
     * @param {Function} next
     */
    AppsKeywordrepliesController.prototype.postOne = function(req, res, next) {
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {

            });
        }).then((data) => {
            AppsKeywordrepliesController.sendSuccess(res, data);
        }).catch((ERROR) => {
            AppsKeywordrepliesController.sendError(res, ERROR);
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

            });
        }).then((data) => {
            AppsKeywordrepliesController.sendSuccess(res, data);
        }).catch((ERROR) => {
            AppsKeywordrepliesController.sendError(res, ERROR);
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
            AppsKeywordrepliesController.sendSuccess(res, data);
        }).catch((ERROR) => {
            AppsKeywordrepliesController.sendError(res, ERROR);
        });
    };

    /**
     * @param {Response} res
     * @param {*} data
     */
    AppsKeywordrepliesController.sendSuccess = function(res, data) {
        let json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: data
        };
        res.status(200).json(json);
    };

    /**
     * @param {Response} res
     * @param {{ MSG: string, CODE: string }} ERROR
     */
    AppsKeywordrepliesController.sendError = function(res, ERROR) {
        let json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    };

    return new AppsKeywordrepliesController();
})();
