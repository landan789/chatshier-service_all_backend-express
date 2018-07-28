module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsCategoriesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
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
                        categories: true
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

                let aggregations = [
                    {
                        $unwind: '$categories'
                    }, {
                        $match: query
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
