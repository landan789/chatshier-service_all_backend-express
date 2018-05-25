module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsComposesMdl = require('../models/apps_composes');

    class AppsComposesController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsComposesMdl.find(appIds, null, (data) => {
                        if (undefined === data || null === data || '' === data) {
                            reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                            return;
                        }
                        resolve(data);
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
        }

        getOne(req, res) {
            let composeId = req.params.composeid;
            let appIds;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appIds = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsComposesMdl.find(appIds, composeId, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((compose) => {
                let result = compose !== undefined ? compose : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: result
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let isImmediately = !!req.body.isImmediately;

            let postCompose = {
                type: req.body.type,
                text: req.body.text,
                time: req.body.time,
                status: !!req.body.status,
                conditions: req.body.conditions
            };

            return Promise.resolve().then(() => {
                // 檢查欲更新的群發發送時間比現在的時間還早的話不允許新增
                if (!isImmediately && (!postCompose.time || new Date(postCompose.time).getTime() < Date.now())) {
                    return Promise.reject(API_ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                }

                return this.appsRequestVerify(req).then(() => {
                    return appsComposesMdl.insert(appId, postCompose).then((appsComposes) => {
                        if (!appsComposes || (appsComposes && 0 === Object.keys(appsComposes).length)) {
                            return Promise.reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                        }
                        return appsComposes;
                    });
                });
            }).then((compose) => {
                let result = compose !== undefined ? compose : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: result
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let composeId = req.params.composeid;

            let putCompose = {};
            ('string' === typeof req.body.type) && (putCompose.type = req.body.type);
            ('string' === typeof req.body.text) && (putCompose.text = req.body.text);
            ('number' === typeof req.body.time) && (putCompose.time = req.body.time);
            (undefined !== req.body.status) && (putCompose.status = !!req.body.status);
            (req.body.conditions instanceof Array) && (putCompose.conditions = req.body.conditions);
            ('number' === typeof req.body.availableCount) && (putCompose.availableCount = req.body.availableCount);
            ('number' === typeof req.body.successCount) && (putCompose.successCount = req.body.successCount);

            return this.appsRequestVerify(req).then(() => {
                if (!composeId) {
                    return Promise.reject(API_ERROR.COMPOSEID_WAS_EMPTY);
                };

                // 檢查欲更新的群發發送時間比現在的時間還早的話不允許更新
                if (putCompose.time && new Date(putCompose.time).getTime() < Date.now()) {
                    return Promise.reject(API_ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                }

                return appsComposesMdl.update(appId, composeId, putCompose).then((_appsComposes) => {
                    if (!_appsComposes) {
                        return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_UPDATE);
                    }
                    return _appsComposes;
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE,
                    data: data
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        };

        deleteOne(req, res) {
            let composeId = req.params.composeid;
            let appId = req.params.appid;

            return this.appsRequestVerify(req).then(() => {
                if (!composeId) {
                    return Promise.reject(API_ERROR.COMPOSEID_WAS_EMPTY);
                };
                return appsComposesMdl.find(appId, composeId);
            }).then((appsComposes) => {
                if (!appsComposes) {
                    return Promise.reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                }

                let app = appsComposes[appId];
                let compose = app.composes[composeId];
                if (new Date(compose.time).getTime() < new Date().getTime()) {
                    return Promise.reject(API_ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                }

                return appsComposesMdl.remove(appId, composeId).then((appsCompose) => {
                    if (!appsCompose) {
                        return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_REMOVE);
                    }
                    return appsCompose;
                });
            }).then((appsCompose) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsCompose
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        };
    }

    return new AppsComposesController();
})();
