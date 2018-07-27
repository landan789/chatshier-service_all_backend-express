module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsCategoriesProductsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string} appId
         * @param {string} categoryId
         * @param {string | string[]} [productIds]
         * @param {boolean} [isDeleted=false]
         * @param {(appsCategoriesProducts: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        find(appId, categoryId, productIds, isDeleted, callback) {
            isDeleted = !!isDeleted;

            // 尋找符合的欄位
            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'categories.isDeleted': false
            };

            if (categoryId) {
                query['categories._id'] = this.Types.ObjectId(categoryId);
            }

            let project = {
                _id: '$categories._id',
                products: {
                    $filter: {
                        input: '$categories.products',
                        as: 'product',
                        cond: {
                            $and: [{
                                $eq: [ '$$product.isDeleted', isDeleted ]
                            }]
                        }
                    }
                }
            };

            if (productIds && !(productIds instanceof Array)) {
                productIds = [productIds];
            }

            if (productIds && 1 === productIds.length) {
                /** @type {any} */
                let _productId = this.Types.ObjectId(productIds[0]);
                project.products.$filter.cond.$and.push({
                    $eq: [ '$$product._id', _productId ]
                });
            }

            let aggregations = [{
                $unwind: '$categories'
            }, {
                $match: query
            }, {
                $project: {
                    categories: project
                }
            }];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsCategoriesProducts = {};
                if (0 === results.length) {
                    return appsCategoriesProducts;
                }

                appsCategoriesProducts = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = { categories: {} };
                    }
                    if (!output[app._id].categories[app.categories._id]) {
                        output[app._id].categories[app.categories._id] = { products: {} };
                    }

                    /** @type {Chatshier.Models.Category} */
                    let category = output[app._id].categories[app.categories._id];
                    category.products = Object.assign({}, this.toObject(app.categories.products));
                    return output;
                }, {});
                return appsCategoriesProducts;
            }).then((appsCategoriesProducts) => {
                ('function' === typeof callback) && callback(appsCategoriesProducts);
                return appsCategoriesProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} categoryId
         * @param {any} product
         * @param {(appsCategoriesProducts: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        insert(appId, categoryId, product, callback) {
            let productId = this.Types.ObjectId();
            product = product || {};
            product._id = productId;
            product.createdTime = product.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'categories._id': this.Types.ObjectId(categoryId)
            };

            let doc = {
                $push: {
                    'categories.$[category].products': product
                }
            };

            let options = {
                arrayFilters: [{
                    'category._id': this.Types.ObjectId(categoryId)
                }]
            };

            return this.AppsModel.update(query, doc, options).then(() => {
                return this.find(appId, categoryId, productId.toHexString());
            }).then((appsCategoriesProducts) => {
                ('function' === typeof callback) && callback(appsCategoriesProducts);
                return appsCategoriesProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} categoryId
         * @param {string} productId
         * @param {any} product
         * @param {(appsCategoriesProducts: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        update(appId, categoryId, productId, product, callback) {
            product = product || {};
            product.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'categories._id': this.Types.ObjectId(categoryId),
                'categories.isDeleted': false,
                'categories.products._id': this.Types.ObjectId(productId),
                'categories.products.isDeleted': false
            };

            let doc = { $set: {} };
            for (let prop in product) {
                doc.$set['categories.$[category].products.$[product].' + prop] = product[prop];
            }

            let options = {
                arrayFilters: [{
                    'category._id': this.Types.ObjectId(categoryId)
                }, {
                    'product._id': this.Types.ObjectId(productId)
                }]
            };

            return this.AppsModel.update(query, doc, options).then((result) => {
                if (!result.ok) {
                    return Promise.reject(result);
                }
                return this.find(appId, categoryId, productId);
            }).then((appsCategoriesProducts) => {
                ('function' === typeof callback) && callback(appsCategoriesProducts);
                return appsCategoriesProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} categoryId
         * @param {string} productId
         * @param {(AppsCategoriesProducts: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        remove(appId, categoryId, productId, callback) {
            let product = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'categories._id': this.Types.ObjectId(categoryId),
                'categories.isDeleted': false,
                'categories.products._id': this.Types.ObjectId(productId),
                'categories.products.isDeleted': false
            };

            let updateOper = { $set: {} };
            for (let prop in product) {
                updateOper.$set['categories.$[category].products.$[product].' + prop] = product[prop];
            }

            let options = {
                arrayFilters: [{
                    'category._id': categoryId
                }, {
                    'product._id': productId
                }]
            };

            return this.AppsModel.update(query, updateOper, options).then((result) => {
                if (!result.ok) {
                    return Promise.reject(result);
                }
                return this.find(appId, categoryId, productId, true);
            }).then((appsCategoriesProducts) => {
                ('function' === typeof callback) && callback(appsCategoriesProducts);
                return appsCategoriesProducts;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsCategoriesProductsModel();
})();
