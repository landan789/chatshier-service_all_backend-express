module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');

    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    let appsFieldsMdl = require('../models/apps_fields');

    class ConsumersFormController extends ControllerCore {
        constructor() {
            super();
            this.getAllRequiredData = this.getAllRequiredData.bind(this);
            this.putOne = this.putOne.bind(this);
        }

        getAllRequiredData(req, res) {
            let appId = req.params.appid;
            let platformUid = req.params.platformuid;

            let response = {
                fields: {},
                messager: {}
            };

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(ERROR.APPID_WAS_EMPTY);
                }

                if (!platformUid) {
                    return Promise.reject(ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return Promise.all([
                    appsFieldsMdl.find(appId),
                    appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid)
                ]);
            }).then(([ appsFields, appsChatroomsMessagers ]) => {
                if (!(appsFields && appsFields[appId])) {
                    return Promise.reject(ERROR.APP_FIELD_FAILED_TO_FIND);
                }

                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                }

                let fields = appsFields[appId].fields;
                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let chatroomId = Object.keys(chatrooms).shift() || '';
                let messager = Object.values(chatrooms[chatroomId].messagers).shift() || {};

                Object.assign(response.fields, fields);
                Object.assign(response.messager, messager);
                return Promise.resolve(response);
            }).then(() => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: response
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let platformUid = req.params.platformuid;

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(ERROR.APPID_WAS_EMPTY);
                }

                if (!platformUid) {
                    return Promise.reject(ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid);
            }).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                }

                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let putMessager = {};
                ('string' === typeof req.body.name) && (putMessager.namings = { [platformUid]: req.body.name });
                ('string' === typeof req.body.email) && (putMessager.email = req.body.email.toLowerCase());
                ('string' === typeof req.body.phone) && (putMessager.phone = req.body.phone);
                ('string' === typeof req.body.county) && (putMessager.county = req.body.county);
                ('string' === typeof req.body.district) && (putMessager.district = req.body.district);
                ('string' === typeof req.body.address) && (putMessager.address = req.body.address);
                ('string' === typeof req.body.birthday) && (putMessager.birthday = req.body.birthday);
                ('string' === typeof req.body.gender) && (putMessager.gender = req.body.gender);
                !isNaN(parseInt(req.body.age, 10)) && (putMessager.age = parseInt(req.body.age, 10));
                ('object' === typeof req.body.custom_fields) && (putMessager.custom_fields = req.body.custom_fields);

                return Promise.all(Object.keys(chatrooms).map((chatroomId) => {
                    return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, platformUid, putMessager).then((_appsChatroomsMessagers) => {
                        if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_UPDATE);
                        }
                        return Promise.resolve(_appsChatroomsMessagers);
                    });
                }));
            }).then(() => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new ConsumersFormController();
})();
