module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsMdl = require('../models/apps');
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
                /** @type {Chatshier.Models.Fields} */
                fields: {},
                messager: {}
            };

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
                }

                if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return appsFieldsMdl.find(appId);
            }).then((appsFields) => {
                if (!(appsFields && appsFields[appId])) {
                    return Promise.reject(API_ERROR.APP_FIELD_FAILED_TO_FIND);
                }
                Object.assign(response.fields, appsFields[appId].fields);
                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid);
            }).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }

                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let chatroomId = Object.keys(chatrooms).shift() || '';
                let messager = Object.values(chatrooms[chatroomId].messagers).shift() || {};
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
                    return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
                }

                if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid);
            }).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }

                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let putMessager = {};
                ('string' === typeof req.body.name) && (putMessager.namings = { [platformUid]: req.body.name });
                ('string' === typeof req.body.email) && (putMessager.email = req.body.email);
                ('string' === typeof req.body.address) && (putMessager.address = req.body.address);

                return Promise.all(Object.keys(chatrooms).map((chatroomId) => {
                    return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, platformUid, putMessager).then((_appsChatroomsMessagers) => {
                        if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                            return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_UPDATE);
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
