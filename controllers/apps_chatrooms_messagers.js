module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    class AppsChatroomsMessagersController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.putOne = this.putOne.bind(this);
        }

        getAll(req, res, next) {
            let chatroomId = req.params.chatroomid;
            let messagerId = req.params.messagerid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;

                return appsChatroomsMessagersMdl.find(appIds, chatroomId, messagerId).then((appsChatroomsMessagers) => {
                    if (!appsChatroomsMessagers) {
                        return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                    }
                    return appsChatroomsMessagers;
                });
            }).then((appsChatroomsMessagers) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsChatroomsMessagers
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;
            let messagerId = req.params.messagerid;
            let useUid = !!req.query.use_uid;
            let platformUid = useUid ? messagerId : '';

            // 只允許更新 API 可編輯的屬性，且傳送的型別必須嚴謹
            let putMessager = {};
            ('number' === typeof req.body.unRead) && (putMessager.unRead = req.body.unRead);
            ('number' === typeof req.body.age) && (putMessager.age = req.body.age);
            ('string' === typeof req.body.email) && (putMessager.email = req.body.email);
            ('string' === typeof req.body.phone) && (putMessager.phone = req.body.phone);
            ('string' === typeof req.body.gender) && (putMessager.gender = req.body.gender);
            ('string' === typeof req.body.remark) && (putMessager.remark = req.body.remark);
            ('object' === typeof req.body.namings) && (putMessager.namings = req.body.namings);
            ('object' === typeof req.body.custom_fields) && (putMessager.custom_fields = req.body.custom_fields);
            (req.body.assigned_ids instanceof Array) && (putMessager.assigned_ids = req.body.assigned_ids);
            (req.body.tags instanceof Array) && (putMessager.tags = req.body.tags);

            return this.appsRequestVerify(req).then(() => {
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
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        }
    }

    return new AppsChatroomsMessagersController();
})();
