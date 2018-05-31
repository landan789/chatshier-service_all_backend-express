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
                return appsComposesMdl.find(appIds).then((appsComposes) => {
                    if (!appsComposes) {
                        return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                    }
                    return appsComposes;
                });
            }).then((appsComposes) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsComposes
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let composeId = req.params.composeid;

            return this.appsRequestVerify(req).then(() => {
                return appsComposesMdl.find(appId, composeId).then((appsComposes) => {
                    if (!(appsComposes && appsComposes[appId])) {
                        return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                    }
                    return appsComposes;
                });
            }).then((appsComposes) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsComposes
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
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
                            return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
                        }
                        return appsComposes;
                    });
                });
            }).then((appsComposes) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsComposes
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
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
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE,
                    data: data
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
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
                    return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_FIND);
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
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsCompose
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        };
    }

    return new AppsComposesController();
})();
