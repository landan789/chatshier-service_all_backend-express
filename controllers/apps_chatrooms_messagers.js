module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

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
                        return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsChatroomsMessagers);
                });
            }).then((appsChatroomsMessagers) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsChatroomsMessagers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
            !isNaN(parseInt(req.body.unRead, 10)) && (putMessager.unRead = parseInt(req.body.unRead, 10));
            !isNaN(parseInt(req.body.age, 10)) && (putMessager.age = parseInt(req.body.age, 10));
            ('string' === typeof req.body.email) && (putMessager.email = req.body.email.toLowerCase());
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
                    return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsChatroomsMessagers);
            }).then((data) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsChatroomsMessagersController();
})();
