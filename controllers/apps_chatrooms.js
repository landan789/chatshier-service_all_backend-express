module.exports = (function() {
    const ControllerCore = require('../cores/controller');

    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    let appsChatroomsMdl = require('../models/apps_chatrooms');

    class AppsChatroomsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
        }

        /**
         * 處理取得所有 Chatrooms
         */
        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                // 再根據所有使用者的 App ID 陣列清單取得對應的所有 Chatrooms
                return appsChatroomsMdl.find(appIds, null).then((appsChatrooms) => {
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
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }
    }

    return new AppsChatroomsController();
})();
