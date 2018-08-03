module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsProductsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string | string[]} appIds
         * @param {string | string[]} [productIds]
         * @param {any} [query]
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        find(appIds, productIds, query, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            query = Object.assign({
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'products.isDeleted': false
            }, query || {});

            if (productIds && !(productIds instanceof Array)) {
                productIds = [productIds];
            }

            if (productIds instanceof Array) {
                query['products._id'] = {
                    $in: productIds.map((productId) => this.Types.ObjectId(productId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$products'
                }, {
                    $match: query
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
         * @param {string} receptionistId
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        findByReceptionistId(appId, receptionistId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'products.isDeleted': false,
                'products.receptionist_ids': {
                    $in: [receptionistId]
                }
            };

            let aggregations = [
                {
                    $unwind: '$products'
                }, {
                    $match: query
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
            }).catch((err) => {
                console.log(err);
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

            let query = {
                '_id': this.Types.ObjectId(appId)
            };

            let updateOper = {
                $push: {
                    products: _product
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, productId.toHexString());
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
         * @param {any} product
         * @param {(appsProducts: Chatshier.Models.AppsProducts | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsProducts | null>}
         */
        update(appIds, productId, product, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            product = product || {};
            product.updatedTime = Date.now();

            let query = {
                '_id': {
                    $in: appIds
                },
                'products._id': productId
            };

            let updateOper = { $set: {} };
            for (let prop in product) {
                updateOper.$set['products.$.' + prop] = product[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appIds, productId);
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

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'products._id': this.Types.ObjectId(productId)
            };

            let updateOper = { $set: {} };
            for (let prop in product) {
                updateOper.$set['products.$.' + prop] = product[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
                }

                let aggregations = [
                    {
                        $unwind: '$products'
                    }, {
                        $match: query
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
