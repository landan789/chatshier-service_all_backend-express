module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsChatroomsMdl = require('../models/apps_chatrooms');

    class AppsChatroomsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.putOne = this.putOne.bind(this);
        }

        /**
         * 處理取得所有 Chatrooms
         */
        getAll(req, res) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                // 再根據所有使用者的 App ID 陣列清單取得對應的所有 Chatrooms
                return appsChatroomsMdl.find(appIds).then((appsChatrooms) => {
                    if (!appsChatrooms) {
                        return Promise.reject(ERROR.APP_CHATROOMS_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsChatrooms);
                });
            }).then((appsChatrooms) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsChatrooms
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;

            let chatroom = {};
            (req.body.name && 'string' === typeof req.body.name) && (chatroom.name = req.body.name);

            return Promise.resolve().then(() => {
                if (0 === Object.keys(chatroom).length) {
                    return Promise.reject(ERROR.INVALID_REQUEST_BODY_DATA);
                }
                return this.appsRequestVerify(req);
            }).then(() => {
                return appsChatroomsMdl.update(appId, chatroomId, chatroom).then((appsChatrooms) => {
                    if (!appsChatrooms || (appsChatrooms && 0 === Object.keys(appsChatrooms).length)) {
                        return Promise.reject(ERROR.APP_CHATROOMS_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsChatrooms);
                });
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsChatroomsController();
})();
