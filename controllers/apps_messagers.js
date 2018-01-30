module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const appsMessagersMdl = require('../models/apps_messagers');
    const usersMdl = require('../models/users');

    function AppsMessagersController() {}

    /**
     * 處理取得所有 App 及其所有 Messager 的請求
     */
    AppsMessagersController.prototype.getAll = function(req, res, next) {
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                // 先根據 userId 取得使用者所有設定的 app 清單
                usersMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appIds);
                });
            });
        }).then((appIds) => {
            // 再根據所有使用者的 App ID 陣列清單取得對應的所有 Messager
            return new Promise((resolve, reject) => {
                appsMessagersMdl.findAppMessagersByAppIds(appIds, (allAppMessagers) => {
                    if (!allAppMessagers) {
                        reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                        return;
                    }
                    resolve(allAppMessagers);
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
     * 處理指定 AppId 取得所有 Messager 的請求
     */
    AppsMessagersController.prototype.getAllByAppId = function(req, res, next) {
        let appId = req.params.appid;
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                // 先根據 userId 取得使用者所有設定的 app 清單
                usersMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    } else if (-1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }

                    appsMessagersMdl.findAppMessagersByAppId(appId, (messagers) => {
                        if (!messagers) {
                            reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                            return;
                        }
                        resolve(messagers);
                    });
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

    AppsMessagersController.prototype.getByAppIdByMessagerId = function(req, res, next) {
        let appId = req.params.appid;
        let msgerId = req.params.messagerid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                if (!msgerId) {
                    reject(API_ERROR.MESSAGERID_WAS_EMPTY);
                    return;
                }
                appsMessagersMdl.findByAppIdAndMessageId(appId, msgerId, (messager) => {
                    if (!messager) {
                        reject(API_ERROR.APP_MESSAGER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(messager);
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

    return new AppsMessagersController();
})();
