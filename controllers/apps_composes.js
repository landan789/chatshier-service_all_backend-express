module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsComposesMdl = require('../models/apps_composes');

    function AppsComposesController() {}
    util.inherits(AppsComposesController, controllerCre.constructor);

    AppsComposesController.prototype.getAll = function(req, res, next) {
        return AppsComposesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
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
    };

    AppsComposesController.prototype.getOne = (req, res) => {
        let composeId = req.params.composeid;
        let appIds = '';
        return AppsComposesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
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
    };

    AppsComposesController.prototype.postOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        let postCompose = {
            type: req.body.type,
            text: req.body.text,
            time: req.body.time,
            status: !!req.body.status,
            ageRange: '' === req.body.age ? [] : req.body.age,
            gender: req.body.gender,
            field_ids: req.body.tag_ids
        };
        return AppsComposesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appId = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsComposesMdl.insert(appId, postCompose, (result) => {
                    if (!result) {
                        reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                        return;
                    }
                    resolve(result);
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
    };

    AppsComposesController.prototype.putOne = (req, res) => {
        let composeId = req.params.composeid;
        let appId = '';
        let putComposesData = {
            type: req.body.type,
            text: req.body.text,
            time: req.body.time,
            status: !!req.body.status,
            ageRange: '' === req.body.age ? [] : req.body.age,
            gender: req.body.gender,
            field_ids: req.body.tag_ids
        };
        return AppsComposesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            if (!composeId) {
                return Promise.reject(API_ERROR.COMPOSEID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => {
                appsComposesMdl.update(appId, composeId, putComposesData, (AppsCompose) => {
                    if (!AppsCompose) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_UPDATE);
                        return;
                    }
                    resolve(AppsCompose);
                });
            });
        }).then((AppsCompose) => {
            let result = AppsCompose !== undefined ? AppsCompose : {};
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
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
    };

    AppsComposesController.prototype.deleteOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let composeId = req.params.composeid;
        let appId = '';
        return AppsComposesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!composeId) {
                return Promise.reject(API_ERROR.COMPOSEID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => {
                appsComposesMdl.remove(appId, composeId, (result) => {
                    if (!result) {
                        reject(API_ERROR.APP_COMPOSE_FAILED_TO_REMOVE);
                        return;
                    }
                    resolve(result);
                });
            });
        }).then((AppsCompose) => {
            let result = AppsCompose !== undefined ? AppsCompose : {};
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
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
    };

    return new AppsComposesController();
})();