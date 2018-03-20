module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');;

    function AppsChatroomsMessagesController() {}

    util.inherits(AppsChatroomsMessagesController, controllerCre.constructor);

    /**
     * 處理取得所有 App 及其 Chatroom 內的所有 Messages 請求
     */
    AppsChatroomsMessagesController.prototype.getAll = function(req, res, next) {
        return AppsChatroomsMessagesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            // 再根據所有使用者的 App ID 陣列清單取得對應的所有 Messager
            return new Promise((resolve, reject) => {
                appsChatroomsMessagesMdl.find(appIds, null, (appschatroomsMessages) => {
                    if (!appschatroomsMessages) {
                        reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appschatroomsMessages);
                });
            });
        }).then((appschatroomsMessages) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: appschatroomsMessages
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
     * 處理指定 AppId 及其 Chatroom 內的所有 Messages 請求
     */
    AppsChatroomsMessagesController.prototype.getAllByAppId = function(req, res, next) {
        return AppsChatroomsMessagesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsChatroomsMessagesMdl.find(appId, null, (chatroomMessages) => {
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
            res.status(500).json(json);
        });
    };

    return new AppsChatroomsMessagesController();
})();
