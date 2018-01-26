module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages_');
    const usersMdl = require('../models/users');

    function AppsChatroomsMessagesController() {}

    /**
     * 處理取得所有 App 及其 Chatroom 內的所有 Messages 請求
     */
    AppsChatroomsMessagesController.prototype.getAll = function(req, res, next) {
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
                appsChatroomsMessagesMdl.findChatroomMessagesByAppIds(appIds, (chatroomMessages) => {
                    if (!chatroomMessages) {
                        reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                        return;
                    }
                    resolve(chatroomMessages);
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
     * 處理指定 AppId 及其 Chatroom 內的所有 Messages 請求
     */
    AppsChatroomsMessagesController.prototype.getAllByAppId = function(req, res, next) {
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

                    appsChatroomsMessagesMdl.findChatroomMessagesByAppId(appId, (chatroomMessages) => {
                        if (!chatroomMessages) {
                            reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                            return;
                        }
                        resolve(chatroomMessages);
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

    return new AppsChatroomsMessagesController();
})();
