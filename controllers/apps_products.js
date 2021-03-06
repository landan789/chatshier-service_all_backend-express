module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

    let appsProductsMdl = require('../models/apps_products');

    class AppsProductsController extends ControllerCore {
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
                return appsProductsMdl.find({ appIds: appIds }).then((appsProducts) => {
                    if (!appsProducts) {
                        return Promise.reject(ERROR.APP_PRODUCTS_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsProducts);
                });
            }).then((appsProducts) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let postProduct = {
                name: ('string' === typeof req.body.name) ? req.body.name : '',
                description: ('string' === typeof req.body.description) ? req.body.description : '',
                price: ('number' === typeof req.body.price) ? req.body.price : 0,
                quantity: ('number' === typeof req.body.quantity) ? req.body.quantity : 0,
                src: ('string' === typeof req.body.src) ? req.body.src : '',
                isOnShelf: !!req.body.isOnShelf,
                receptionist_ids: (req.body.receptionist_ids instanceof Array) ? req.body.receptionist_ids : []
            };
            ('string' === typeof req.body.type) && (postProduct.type = req.body.type);

            return this.appsRequestVerify(req).then(() => {
                if (!postProduct.name) {
                    return Promise.reject(ERROR.NAME_WAS_EMPTY);
                }
                return appsProductsMdl.insert(appId, postProduct);
            }).then((appsProducts) => {
                if (!appsProducts) {
                    return Promise.reject(ERROR.APP_PRODUCTS_FAILED_TO_INSERT);
                }
                return Promise.resolve(appsProducts);
            }).then((appsProducts) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let productId = req.params.productid;

            let putProduct = {};
            ('string' === typeof req.body.type) && (putProduct.type = req.body.type);
            ('string' === typeof req.body.name) && (putProduct.name = req.body.name);
            ('string' === typeof req.body.description) && (putProduct.description = req.body.description);
            ('number' === typeof req.body.price) && (putProduct.price = req.body.price);
            ('number' === typeof req.body.quantity) && (putProduct.quantity = req.body.quantity);
            ('string' === typeof req.body.src) && (putProduct.src = req.body.src);
            ('boolean' === typeof req.body.canAppoint) && (putProduct.canAppoint = req.body.canAppoint);
            ('boolean' === typeof req.body.isOnShelf) && (putProduct.isOnShelf = req.body.isOnShelf);
            (req.body.receptionist_ids instanceof Array) && (putProduct.receptionist_ids = req.body.receptionist_ids);

            return this.appsRequestVerify(req).then(() => {
                if ('string' === typeof putProduct.name && !putProduct.name) {
                    return Promise.reject(ERROR.NAME_WAS_EMPTY);
                }
                return appsProductsMdl.update(appId, productId, putProduct);
            }).then((appsProducts) => {
                if (!(appsProducts && appsProducts[appId])) {
                    return Promise.reject(ERROR.APP_PRODUCTS_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsProducts);
            }).then((appsProducts) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let productId = req.params.productid;

            return this.appsRequestVerify(req).then(() => {
                return appsProductsMdl.remove(appId, productId);
            }).then((appsProducts) => {
                if (!(appsProducts && appsProducts[appId])) {
                    return Promise.reject(ERROR.APP_PRODUCTS_FAILED_TO_REMOVE);
                }
                return Promise.resolve(appsProducts);
            }).then((appsProducts) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsProducts
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsProductsController();
})();
