module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsCategoriesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @typedef CategoryQuery
         * @property {string | string[]} appIds
         * @property {string | string[]} [categoryIds]
         * @property {string} [type]
         * @param {CategoryQuery} query
         * @param {(appsCategories: Chatshier.Models.AppsCategories | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsCategories | null>}
         */
        find({ appIds, categoryIds, type }, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'categories.isDeleted': false
            };
            ('string' === typeof type) && (match['categories.type'] = type);

            if (categoryIds && !(categoryIds instanceof Array)) {
                categoryIds = [categoryIds];
            }

            if (categoryIds instanceof Array) {
                match['categories._id'] = {
                    $in: categoryIds.map((categoryId) => this.Types.ObjectId(categoryId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$categories'
                }, {
                    $match: match
                }, {
                    $project: {
                        categories: true
                    }
                }, {
                    $sort: {
                        'receptionists.createdTime': -1 // 最晚建立的在最前頭
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

            let conditions = {
                '_id': this.Types.ObjectId(appId)
            };

            let doc = {
                $push: {
                    categories: _category
                }
            };

            return this.AppsModel.update(conditions, doc).then(() => {
                let query = {
                    appIds: appId,
                    categoryIds: categoryId.toHexString()
                };
                return this.find(query);
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

            let conditions = {
                '_id': {
                    $in: appIds
                },
                'categories._id': categoryId
            };

            let doc = { $set: {} };
            for (let prop in category) {
                doc.$set['categories.$.' + prop] = category[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                let query = {
                    appIds: appIds,
                    categoryIds: categoryId
                };
                return this.find(query);
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

            let conditions = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'categories._id': this.Types.ObjectId(categoryId)
            };

            let doc = { $set: {} };
            for (let prop in category) {
                doc.$set['categories.$.' + prop] = category[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
                }

                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$categories'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            categories: true
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

    return new AppsCategoriesModel();
})();
