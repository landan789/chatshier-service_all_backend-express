module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsTagsMdl = require('../models/apps_tags');

    function AppsTagsController() {}

    util.inherits(AppsTagsController, controllerCre.constructor);

    AppsTagsController.prototype.getAll = function(req, res) {
        return AppsTagsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            // 1. 根據 appId 清單去 tags model 抓取清單
            return new Promise((resolve, reject) => {
                appsTagsMdl.findTags(appIds, (appsTags) => {
                    if (!appsTags) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appsTags);
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

    AppsTagsController.prototype.postOne = function(req, res) {
        let appId = req.params.appid;

        // 建立並過濾用戶端傳過來的資料
        let postTagData = {
            text: req.body.text || '',
            type: req.body.type || appsTagsMdl.TypeEnum.CUSTOM,
            sets: req.body.sets || [''],
            setsType: req.body.setsType ? req.body.setsType : 0,
            order: req.body.order ? req.body.order : 0
        };

        return AppsTagsController.prototype.AppsRequestVerify(req).then(() => {
            // 1. 將 tag 資料插入至指定 appId 中
            return new Promise((resolve, reject) => {
                appsTagsMdl.insert(appId, postTagData, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_INSERT);
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
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTagsController.prototype.putOne = function(req, res) {
        let appId = req.params.appid;
        let tagId = req.params.tagid;

        // 建立並過濾用戶端傳過來的資料
        let putTagData = {
            type: req.body.type || appsTagsMdl.TypeEnum.CUSTOM,
            order: req.body.order ? req.body.order : 0
        };

        // 欲更新的資料只有是自定義型態才可變更名稱及資料
        if (appsTagsMdl.TypeEnum.CUSTOM === putTagData.type) {
            putTagData.text = req.body.text || '';
            putTagData.sets = req.body.sets || [''];
            putTagData.setsType = req.body.setsType ? req.body.setsType : 0;
        }

        return AppsTagsController.prototype.AppsRequestVerify(req).then(() => {
            // 1. 將 tag 資料更新至指定 appId 中
            return new Promise((resolve, reject) => {
                appsTagsMdl.update(appId, tagId, putTagData, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_UPDATE);
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
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTagsController.prototype.deleteOne = function(req, res) {
        let appId = req.params.appid;
        let tagId = req.params.tagid;

        return AppsTagsController.prototype.AppsRequestVerify(req).then(() => {
            // 1. 藉由 tags model 將指定的 tag 資料刪除
            return new Promise((resolve, reject) => {
                appsTagsMdl.remove(appId, tagId, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_REMOVE);
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
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AppsTagsController();
})();
