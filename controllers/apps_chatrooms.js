module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
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
                        return Promise.reject(API_ERROR.APP_CHATROOMS_FAILED_TO_FIND);
                    }
                    return appsChatrooms;
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;

            let chatroom = {};
            (req.body.name && 'string' === typeof req.body.name) && (chatroom.name = req.body.name);

            return Promise.resolve().then(() => {
                if (0 === Object.keys(chatroom).length) {
                    return Promise.reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
                }
                return this.appsRequestVerify(req);
            }).then(() => {
                return appsChatroomsMdl.update(appId, chatroomId, chatroom).then((appsChatrooms) => {
                    if (!appsChatrooms || (appsChatrooms && 0 === Object.keys(appsChatrooms).length)) {
                        return Promise.reject(API_ERROR.APP_CHATROOMS_FAILED_TO_UPDATE);
                    }
                    return appsChatrooms;
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }
    }

    return new AppsChatroomsController();
})();
