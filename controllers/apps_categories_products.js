module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsCategoriesProductsMdl = require('../models/apps_categories_products');

    class AppsChatroomsMessagersController extends ControllerCore {
        constructor() {
            super();
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let categoryId = req.params.categoryid;

            let postProduct = {
                name: ('string' === typeof req.body.name) ? req.body.name : '',
                description: ('string' === typeof req.body.description) ? req.body.description : '',
                price: ('number' === typeof req.body.price) ? req.body.price : 0,
                quantity: ('number' === typeof req.body.quantity) ? req.body.quantity : 0,
                src: ('string' === typeof req.body.src) ? req.body.src : '',
                isOnShelves: !!req.body.isOnShelves
            };

            return this.appsRequestVerify(req).then(() => {
                return appsCategoriesProductsMdl.insert(appId, categoryId, postProduct);
            }).then((appsCategoriesProducts) => {
                if (!appsCategoriesProducts) {
                    return Promise.reject(API_ERROR.APP_CATEGORIES_PRODUCTS_FAILED_TO_INSERT);
                }
                return Promise.resolve(appsCategoriesProducts);
            }).then((appsCategoriesProducts) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsCategoriesProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let categoryId = req.params.categoryid;
            let productId = req.params.productid;

            let putProduct = {};
            ('string' === typeof req.body.name) && (putProduct.name = req.body.name);
            ('string' === typeof req.body.description) && (putProduct.description = req.body.description);
            ('number' === typeof req.body.price) && (putProduct.price = req.body.price);
            ('number' === typeof req.body.quantity) && (putProduct.quantity = req.body.quantity);
            ('string' === typeof req.body.src) && (putProduct.src = req.body.src);
            ('boolean' === typeof req.body.isOnShelves) && (putProduct.isOnShelves = req.body.isOnShelves);

            return this.appsRequestVerify(req).then(() => {
                return appsCategoriesProductsMdl.update(appId, categoryId, productId, putProduct);
            }).then((appsCategoriesProducts) => {
                if (!appsCategoriesProducts) {
                    return Promise.reject(API_ERROR.APP_CATEGORIES_PRODUCTS_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsCategoriesProducts);
            }).then((appsCategoriesProducts) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsCategoriesProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let categoryId = req.params.categoryid;
            let productId = req.params.productid;

            return this.appsRequestVerify(req).then(() => {
                return appsCategoriesProductsMdl.remove(appId, categoryId, productId);
            }).then((appsCategoriesProducts) => {
                if (!appsCategoriesProducts) {
                    return Promise.reject(API_ERROR.APP_CATEGORIES_PRODUCTS_FAILED_TO_REMOVE);
                }
                return Promise.resolve(appsCategoriesProducts);
            }).then((appsCategoriesProducts) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsCategoriesProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsChatroomsMessagersController();
})();
