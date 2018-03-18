module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsMessagersMdl = require('../models/apps_messagers');

    let instance = new AppsMessagersController();

    function AppsMessagersController() {}

    util.inherits(AppsMessagersController, controllerCre.constructor);

    /**
     * 處理取得所有 App 及其所有 Messager 的請求
     */
    AppsMessagersController.prototype.getAllMessagers = function(req, res) {
        let appId = req.params.appid;

        return AppsMessagersController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            // 再根據所有使用者的 App ID 陣列清單取得對應的所有 Messager
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsMessagersMdl.find(appId || appIds, null, (appsMessagers) => {
                    if (!appsMessagers) {
                        reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appsMessagers);
                });
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

    AppsMessagersController.prototype.getMessager = function(req, res) {
        let msgerId = req.params.messagerid;
        return AppsMessagersController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            return new Promise((resolve, reject) => {
                let appId = checkedAppId;
                if (!msgerId) {
                    reject(API_ERROR.MESSAGERID_WAS_EMPTY);
                    return;
                }
                appsMessagersMdl.findMessager(appId, msgerId, (messager) => {
                    if (!messager) {
                        reject(API_ERROR.APP_MESSAGER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(messager);
                });
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

    /**
     * 處理更新 messager 基本資料的 API 請求
     */
    AppsMessagersController.prototype.updateMessager = function(req, res) {
        let msgerId = req.params.messagerid;
        let appId = '';

        return AppsMessagersController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            if (!msgerId) {
                return Promise.reject(API_ERROR.MESSAGERID_WAS_EMPTY);
            }

            // 只允許更新 API 可編輯的屬性
            let messagerData = {};
            ('string' === typeof req.body.photo) && (messagerData.photo = req.body.photo);
            ('number' === typeof req.body.age) && (messagerData.age = req.body.age);
            ('string' === typeof req.body.email) && (messagerData.email = req.body.email);
            ('string' === typeof req.body.phone) && (messagerData.phone = req.body.phone);
            ('string' === typeof req.body.gender) && (messagerData.gender = req.body.gender);
            ('string' === typeof req.body.remark) && (messagerData.remark = req.body.remark);
            req.body.assigned && (messagerData.assigned = req.body.assigned);
            req.body.custom_tags && (messagerData.custom_tags = req.body.custom_tags);

            return new Promise((resolve, reject) => {
                appsMessagersMdl.replaceMessager(appId, msgerId, messagerData, (messager) => {
                    if (!messager) {
                        reject(API_ERROR.APP_MESSAGER_FAILED_TO_UPDATE);
                        return;
                    }
                    resolve(messager);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
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

    return instance;
})();
