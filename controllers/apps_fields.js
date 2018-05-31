module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
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
                return new Promise((resolve, reject) => {
                    appsFieldsMdl.find(appIds, void 0, (appsFields) => {
                        if (!appsFields) {
                            reject(API_ERROR.APP_FIELD_FAILED_TO_FIND);
                            return;
                        }
                        resolve(appsFields);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;

            // 建立並過濾用戶端傳過來的資料
            let postTagData = {
                text: req.body.text || '',
                type: req.body.type || appsFieldsMdl.FieldsTypes.CUSTOM,
                sets: req.body.sets || [''],
                setsType: req.body.setsType ? req.body.setsType : 0,
                order: req.body.order ? req.body.order : 0
            };

            return this.appsRequestVerify(req).then(() => {
                // 1. 將 field 資料插入至指定 appId 中
                return new Promise((resolve, reject) => {
                    appsFieldsMdl.insert(appId, postTagData, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_FIELD_FAILED_TO_INSERT);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let fieldId = req.params.fieldid;

            // 建立並過濾用戶端傳過來的資料
            let putTagData = {
                type: req.body.type || appsFieldsMdl.FieldsTypes.CUSTOM,
                order: req.body.order ? req.body.order : 0
            };

            // 欲更新的資料只有是自定義型態才可變更名稱及資料
            if (appsFieldsMdl.FieldsTypes.CUSTOM === putTagData.type) {
                putTagData.text = req.body.text || '';
                putTagData.sets = req.body.sets || [''];
                putTagData.setsType = req.body.setsType ? req.body.setsType : 0;
            }

            return this.appsRequestVerify(req).then(() => {
                // 1. 將 field 資料更新至指定 appId 中
                return new Promise((resolve, reject) => {
                    appsFieldsMdl.update(appId, fieldId, putTagData, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_FIELD_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let fieldId = req.params.fieldid;

            return this.appsRequestVerify(req).then(() => {
                // 1. 藉由 Fields model 將指定的 field 資料刪除
                return new Promise((resolve, reject) => {
                    appsFieldsMdl.remove(appId, fieldId, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_FIELD_FAILED_TO_REMOVE);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }
    }

    return new AppsFieldsController();
})();
