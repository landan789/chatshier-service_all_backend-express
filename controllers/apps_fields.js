module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsFieldsMdl = require('../models/apps_fields');

    class AppsFieldsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                // 1. 根據 appId 清單去 Fields model 抓取清單
                return appsFieldsMdl.find(appIds).then((appsFields) => {
                    if (!appsFields) {
                        return Promise.reject(ERROR.APP_FIELD_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsFields);
                });
            }).then((appsFields) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsFields
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;

            // 建立並過濾用戶端傳過來的資料
            let postField = {
                text: req.body.text || '',
                type: req.body.type || appsFieldsMdl.FieldsTypes.CUSTOM,
                sets: req.body.sets || [''],
                setsType: req.body.setsType ? req.body.setsType : 0,
                order: req.body.order ? req.body.order : 0,
                canShowingOnForm: !!req.body.canShowingOnForm
            };

            return this.appsRequestVerify(req).then(() => {
                // 1. 將 field 資料插入至指定 appId 中
                return appsFieldsMdl.insert(appId, postField).then((appsFields) => {
                    if (!(appsFields && appsFields[appId])) {
                        return Promise.reject(ERROR.APP_FIELD_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsFields);
                });
            }).then((appsFields) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsFields
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let fieldId = req.params.fieldid;

            // 建立並過濾用戶端傳過來的資料
            let putField = {};
            ('number' === typeof req.body.order) && (putField.order = req.body.order);
            ('string' === typeof req.body.text) && (putField.text = req.body.text);
            (req.body.sets instanceof Array) && (putField.sets = req.body.sets);
            ('string' === typeof req.body.setsType) && (putField.setsType = req.body.setsType);
            ('boolean' === typeof req.body.canShowingOnForm) && (putField.canShowingOnForm = req.body.canShowingOnForm);

            return this.appsRequestVerify(req).then(() => {
                // 1. 將 field 資料更新至指定 appId 中
                return appsFieldsMdl.update(appId, fieldId, putField).then((appsFields) => {
                    if (!(appsFields && appsFields[appId])) {
                        return Promise.reject(ERROR.APP_FIELD_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsFields);
                });
            }).then((appsFields) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsFields
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let fieldId = req.params.fieldid;

            return this.appsRequestVerify(req).then(() => {
                // 1. 藉由 Fields model 將指定的 field 資料刪除
                return appsFieldsMdl.remove(appId, fieldId).then((appsFields) => {
                    if (!(appsFields && appsFields[appId])) {
                        return Promise.reject(ERROR.APP_FIELD_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsFields);
                });
            }).then((appsFields) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsFields
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsFieldsController();
})();
