module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    function AppsChatroomsMessagersController() {}

    util.inherits(AppsChatroomsMessagersController, controllerCre.constructor);

    /**
     * 處理取得所有 Chatrooms
     */
    AppsChatroomsMessagersController.prototype.getOne = function(req, res, next) {
        let chatroomId = req.params.chatroomid;
        let messagerId = req.params.messagerid;

        return controllerCre.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;

            return appsChatroomsMessagersMdl.find(appIds, chatroomId, messagerId).then((appsChatroomsMessagers) => {
                if (!appsChatroomsMessagers) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }
                return appsChatroomsMessagers;
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

    return new AppsChatroomsMessagersController();
})();