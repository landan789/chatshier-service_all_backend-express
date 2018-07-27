module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsChatroomsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);

            this.project = {
                _id: '$categories._id',
                createdTime: '$categories.createdTime',
                updatedTime: '$categories.updatedTime',
                parent_id: '$categories.parent_id',
                name: '$categories.name',
                description: '$categories.description',
                products: {
                    $filter: {
                        input: '$categories.products',
                        as: 'product',
                        cond: {
                            $eq: [ '$$product.isDeleted', false ]
                        }
                    }
                }
            };
        }

        /**
         * @param {string | string[]} appIds
         * @param {string | string[]} [categoryIds]
         * @param {(appsCategories: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        find(appIds, categoryIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'categories.isDeleted': false
            };

            if (categoryIds && !(categoryIds instanceof Array)) {
                categoryIds = [categoryIds];
            }

            if (categoryIds instanceof Array) {
                query['categories._id'] = {
                    $in: categoryIds.map((categoryId) => this.Types.ObjectId(categoryId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$categories'
                }, {
                    $match: query
                }, {
                    $project: {
                        categories: this.project
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsCategories = {};
                if (0 === results.length) {
                    return appsCategories;
                }

                appsCategories = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { categories: {} };
                    Object.assign(output[app._id].categories, this.toObject(app.categories));

                    /** @type {Chatshier.Models.Category} */
                    let category = output[app._id].categories[app.categories._id];
                    category.products = Object.assign({}, this.toObject(app.categories.products));
                    return output;
                }, {});
                return appsCategories;
            }).then((appsCategories) => {
                ('function' === typeof callback) && callback(appsCategories);
                return appsCategories;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} [category]
         * @param {(appsCategories: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        insert(appId, category, callback) {
            let categoryId = this.Types.ObjectId();
            let _category = category || {};
            _category._id = categoryId;
            _category.createdTime = _category.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId)
            };

            let updateOper = {
                $push: {
                    categories: _category
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, categoryId.toHexString());
            }).then((appsCategories) => {
                ('function' === typeof callback) && callback(appsCategories);
                return appsCategories;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} categoryId
         * @param {any} category
         * @param {(appsCategories: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        update(appIds, categoryId, category, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            category = category || {};
            category.updatedTime = Date.now();

            let query = {
                '_id': {
                    $in: appIds
                },
                'categories._id': categoryId
            };

            let updateOper = { $set: {} };
            for (let prop in category) {
                updateOper.$set['categories.$.' + prop] = category[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appIds, categoryId);
            }).then((appsCategories) => {
                ('function' === typeof callback) && callback(appsCategories);
                return appsCategories;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} categoryId
         * @param {(appsCategories: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        remove(appIds, categoryId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let category = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'categories._id': this.Types.ObjectId(categoryId)
            };

            let updateOper = { $set: {} };
            for (let prop in category) {
                updateOper.$set['categories.$.' + prop] = category[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
                }

                let _project = Object.assign({}, this.project);
                _project.products = {
                    $filter: {
                        input: '$categories.products',
                        as: 'product',
                        cond: {
                            $eq: [ '$$product.isDeleted', true ]
                        }
                    }
                };

                let aggregations = [
                    {
                        $unwind: '$categories'
                    }, {
                        $match: query
                    }, {
                        $project: {
                            categories: _project
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsCategories = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsCategories = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { categories: {} };
                        Object.assign(output[app._id].categories, this.toObject(app.categories));
                        return output;
                    }, {});
                    return appsCategories;
                });
            }).then((appsCategories) => {
                ('function' === typeof callback) && callback(appsCategories);
                return appsCategories;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsChatroomsModel();
})();
