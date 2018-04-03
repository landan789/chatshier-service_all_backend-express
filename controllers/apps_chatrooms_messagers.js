module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    function AppsChatroomsMessagersController() {}

    util.inherits(AppsChatroomsMessagersController, controllerCre.constructor);

    AppsChatroomsMessagersController.prototype.getAll = function(req, res, next) {
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

    AppsChatroomsMessagersController.prototype.update = function(req, res, next) {
        let useUid = !!req.query.use_uid;
        let appId = req.params.appid;
        let chatroomId = req.params.chatroomid;
        let messagerId = req.params.messagerid;
        let platformUid = useUid ? messagerId : '';

        let putMessager = {};
        (undefined !== req.body.assigned_ids) && (putMessager.assigned_ids = req.body.assigned_ids);
        (undefined !== req.body.unRead) && (putMessager.unRead = req.body.unRead);

        return controllerCre.AppsRequestVerify(req).then(() => {
            if (useUid) {
                return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, platformUid, putMessager);
            }
            return appsChatroomsMessagersMdl.update(appId, chatroomId, messagerId, putMessager);
        }).then((appsChatroomsMessagers) => {
            if (!appsChatroomsMessagers) {
                return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_UPDATE);
            }
            return appsChatroomsMessagers;
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