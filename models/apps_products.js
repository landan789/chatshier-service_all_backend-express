module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsProductsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @typedef ProductQuery
         * @property {string | string[]} appIds
         * @property {string | string[]} [productIds]
         * @property {string} [type]
         * @property {boolean | null} [isOnShelf]
         * @param {ProductQuery} query
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        find({ appIds, productIds, type, isOnShelf }, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'products.isDeleted': false
            };
            ('string' === typeof type) && (match['products.type'] = type);
            ('boolean' === typeof isOnShelf) && (match['products.isOnShelf'] = isOnShelf);

            if (productIds && !(productIds instanceof Array)) {
                productIds = [productIds];
            }

            if (productIds instanceof Array) {
                match['products._id'] = {
                    $in: productIds.map((productId) => this.Types.ObjectId(productId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$products'
                }, {
                    $match: match
                }, {
                    $project: {
                        products: true
                    }
                }, {
                    $sort: {
                        'products.createdTime': -1 // 最晚建立的在最前頭
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsProducts = {};
                if (0 === results.length) {
                    return appsProducts;
                }

                appsProducts = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { products: {} };
                    Object.assign(output[app._id].products, this.toObject(app.products));
                    return output;
                }, {});
                return appsProducts;
            }).then((appsProducts) => {
                ('function' === typeof callback) && callback(appsProducts);
                return appsProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} [product]
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        insert(appId, product, callback) {
            let productId = this.Types.ObjectId();
            let _product = product || {};
            _product._id = productId;
            _product.createdTime = _product.updatedTime = Date.now();

            let conditions = {
                '_id': this.Types.ObjectId(appId)
            };

            let doc = {
                $push: {
                    products: _product
                }
            };

            return this.AppsModel.update(conditions, doc).then(() => {
                let query = {
                    appIds: appId,
                    productId: productId.toHexString()
                };
                return this.find(query);
            }).then((appsProducts) => {
                ('function' === typeof callback) && callback(appsProducts);
                return appsProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} productId
         * @param {any} product
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        update(appId, productId, product, callback) {
            product = product || {};
            product.updatedTime = Date.now();

            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'products._id': this.Types.ObjectId(productId)
            };

            let doc = { $set: {} };
            for (let prop in product) {
                doc.$set['products.$.' + prop] = product[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                let query = {
                    appIds: appId,
                    productIds: productId
                };
                return this.find(query);
            }).then((appsProducts) => {
                ('function' === typeof callback) && callback(appsProducts);
                return appsProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} productId
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        remove(appIds, productId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let product = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let conditions = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'products._id': this.Types.ObjectId(productId)
            };

            let doc = { $set: {} };
            for (let prop in product) {
                doc.$set['products.$.' + prop] = product[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
                }

                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$products'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            products: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsProducts = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsProducts = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { products: {} };
                        Object.assign(output[app._id].products, this.toObject(app.products));
                        return output;
                    }, {});
                    return appsProducts;
                });
            }).then((appsProducts) => {
                ('function' === typeof callback) && callback(appsProducts);
                return appsProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsProductsModel();
})();
