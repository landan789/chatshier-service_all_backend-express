module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let botSvc = require('../services/bot');
    let appsMdl = require('../models/apps');
    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    let consumersMdl = require('../models/consumers');

    class ConsumersController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.putOne = this.putOne.bind(this);
        }

        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsChatroomsMessagersMdl.find(appIds);
            }).then((appsChatroomsMessagers) => {
                let platformUids = [];
                for (let appId in appsChatroomsMessagers) {
                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    for (let chatroomId in chatrooms) {
                        let messagers = chatrooms[chatroomId].messagers;
                        for (let messagerId in messagers) {
                            let messager = messagers[messagerId];
                            platformUids.push(messager.platformUid);
                        }
                    }
                }

                return consumersMdl.find(platformUids).then((consumers) => {
                    if (!consumers) {
                        return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_FIND);
                    }
                    return consumers;
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

        getOne(req, res, next) {
            let platformUid = req.params.platformuid;

            return this.appsRequestVerify(req).then(() => {
                return consumersMdl.find(platformUid).then((consumers) => {
                    if (!consumers) {
                        return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_FIND);
                    }
                    return consumers;
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

        putOne(req, res, next) {
            let platformUid = req.params.platformuid;

            // 只允許更新 API 可編輯的屬性
            let consumer = {};
            ('string' === typeof req.body.photo) && (consumer.photo = req.body.photo);
            ('number' === typeof req.body.age) && (consumer.age = req.body.age);
            ('string' === typeof req.body.email) && (consumer.email = req.body.email);
            ('string' === typeof req.body.phone) && (consumer.phone = req.body.phone);
            ('string' === typeof req.body.gender) && (consumer.gender = req.body.gender);
            ('string' === typeof req.body.remark) && (consumer.remark = req.body.remark);
            req.body.custom_fields && (consumer.custom_fields = req.body.custom_fields);

            return this.appsRequestVerify(req).then(() => {
                if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return consumersMdl.replace(platformUid, consumer).then((consumers) => {
                    if (!consumers) {
                        return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_UPDATE);
                    }
                    return consumers;
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

    return new ConsumersController();
})();
