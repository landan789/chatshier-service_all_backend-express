module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');
    let appsCategoriesMdl = require('../models/apps_categories');

    class AppsCategoriesModel extends ControllerCore {
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
                return appsCategoriesMdl.find(appIds).then((appsCategories) => {
                    if (!appsCategories) {
                        return Promise.reject(API_ERROR.APP_CATEGORY_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsCategories);
                });
            }).then((appsCategories) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsCategories
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;

            // 建立並過濾用戶端傳過來的資料
            let postCategory = {
                parent_id: req.body.parent_id,
                class: req.body.class,
                description: req.body.description
            };

            return this.appsRequestVerify(req).then(() => {
                return appsCategoriesMdl.insert(appId, postCategory).then((appsCategories) => {
                    if (!(appsCategories && appsCategories[appId])) {
                        return Promise.reject(API_ERROR.APP_CATEGORY_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsCategories);
                });
            }).then((appsCategories) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsCategories
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let categoryId = req.params.categoryid;

            let putCategory = {};
            ('string' === typeof req.body.parent_id) && (putCategory.parent_id = req.body.parent_id);
            ('string' === typeof req.body.class) && (putCategory.class = req.body.class);
            ('string' === typeof req.body.description) && (putCategory.description = req.body.description);

            return this.appsRequestVerify(req).then(() => {
                return appsCategoriesMdl.update(appId, categoryId, putCategory).then((appsCategories) => {
                    if (!(appsCategories && appsCategories[appId])) {
                        return Promise.reject(API_ERROR.APP_CATEGORY_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsCategories);
                });
            }).then((appsCategories) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsCategories
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let categoryId = req.params.categoryid;

            return this.appsRequestVerify(req).then(() => {
                return appsCategoriesMdl.remove(appId, categoryId).then((appsCategories) => {
                    if (!(appsCategories && appsCategories[appId])) {
                        return Promise.reject(API_ERROR.APP_CATEGORY_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsCategories);
                });
            }).then((appsCategories) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsCategories
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
})();
