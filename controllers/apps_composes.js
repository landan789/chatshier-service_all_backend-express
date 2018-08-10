module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');

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
                        return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsComposes);
                });
            }).then((appsComposes) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsComposes
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let composeId = req.params.composeid;

            return this.appsRequestVerify(req).then(() => {
                return appsComposesMdl.find(appId, composeId).then((appsComposes) => {
                    if (!(appsComposes && appsComposes[appId])) {
                        return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsComposes);
                });
            }).then((appsComposes) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsComposes
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let isImmediately = !!req.body.isImmediately;

            let postCompose = {
                type: req.body.type || '',
                text: req.body.text || '',
                time: undefined !== req.body.time ? req.body.time : 0,
                status: !!req.body.status,
                conditions: req.body.conditions instanceof Array ? req.body.conditions : [],
                src: req.body.src || '',
                template_id: req.body.template_id || '',
                imagemap_id: req.body.imagemap_id || ''
            };

            return Promise.resolve().then(() => {
                // 檢查欲更新的群發發送時間比現在的時間還早的話不允許新增
                if (!isImmediately && (!postCompose.time || new Date(postCompose.time).getTime() < Date.now())) {
                    return Promise.reject(ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                }

                return this.appsRequestVerify(req).then(() => {
                    return appsComposesMdl.insert(appId, postCompose).then((appsComposes) => {
                        if (!appsComposes || (appsComposes && 0 === Object.keys(appsComposes).length)) {
                            return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_FIND);
                        }
                        return Promise.resolve(appsComposes);
                    });
                });
            }).then((appsComposes) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsComposes
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let composeId = req.params.composeid;
            let isImmediately = !!req.body.isImmediately;

            let putCompose = {};
            ('string' === typeof req.body.type) && (putCompose.type = req.body.type);
            ('string' === typeof req.body.text) && (putCompose.text = req.body.text);
            ('number' === typeof req.body.time) && (putCompose.time = req.body.time);
            (undefined !== req.body.status) && (putCompose.status = !!req.body.status);
            (req.body.conditions instanceof Array) && (putCompose.conditions = req.body.conditions);
            ('string' === typeof req.body.src) && (putCompose.src = req.body.src);
            ('string' === typeof req.body.template_id) && (putCompose.template_id = req.body.template_id);
            ('string' === typeof req.body.imagemap_id) && (putCompose.imagemap_id = req.body.imagemap_id);

            return this.appsRequestVerify(req).then(() => {
                if (!composeId) {
                    return Promise.reject(ERROR.COMPOSEID_WAS_EMPTY);
                }

                // 檢查欲更新的群發發送時間比現在的時間還早的話不允許更新
                if (!isImmediately && putCompose.status && (!putCompose.time || new Date(putCompose.time).getTime() < Date.now())) {
                    return Promise.reject(ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                }

                return appsComposesMdl.update(appId, composeId, putCompose).then((_appsComposes) => {
                    if (!_appsComposes) {
                        return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(_appsComposes);
                });
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        deleteOne(req, res) {
            let composeId = req.params.composeid;
            let appId = req.params.appid;

            return this.appsRequestVerify(req).then(() => {
                if (!composeId) {
                    return Promise.reject(ERROR.COMPOSEID_WAS_EMPTY);
                };
                return appsComposesMdl.find(appId, composeId);
            }).then((appsComposes) => {
                if (!appsComposes) {
                    return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_FIND);
                }

                let app = appsComposes[appId];
                let compose = app.composes[composeId];
                if (true === compose.status && new Date(compose.time).getTime() < new Date().getTime()) {
                    return Promise.reject(ERROR.APP_COMPOSE_TIME_MUST_BE_LATER_THAN_NOW);
                }

                return appsComposesMdl.remove(appId, composeId).then((appsCompose) => {
                    if (!appsCompose) {
                        return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsCompose);
                });
            }).then((appsCompose) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsCompose
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }

    return new AppsComposesController();
})();
