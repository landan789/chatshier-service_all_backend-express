module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const util = require('util');

    const controllerCre = require('../cores/controller');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    const consumersMdl = require('../models/consumers');

    function ConsumersController() {}
    util.inherits(ConsumersController, controllerCre.constructor);

    ConsumersController.prototype.getAll = (req, res, next) => {
        return controllerCre.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return appsChatroomsMessagersMdl.findPlatformUids(appIds, false);
        }).then((platformUids) => {
            platformUids = platformUids || [];
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
    };

    ConsumersController.prototype.getOne = (req, res, next) => {
        let platformUid = req.params.platformuid;

        return controllerCre.AppsRequestVerify(req).then(() => {
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
    };

    ConsumersController.prototype.update = (req, res, next) => {
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

        return controllerCre.AppsRequestVerify(req).then(() => {
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
    };

    return new ConsumersController();
})();
