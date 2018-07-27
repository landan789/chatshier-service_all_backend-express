module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class TemplatesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }
        /**
         * 輸入全部的 appId 取得該 App 所有 templates 的資料
         *
         * @param {string | string[]} appIds
         * @param {string | string[]} [templateIds]
         * @param {(appsTemplates: Chatshier.Models.AppsTemplates | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsTemplates | null>}
         */
        find(appIds, templateIds, callback) {
            let query = {
                'isDeleted': false,
                'templates.isDeleted': false
            };

            if (appIds) {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
                }

                query['_id'] = {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                };
            }

            if (templateIds) {
                if (!(templateIds instanceof Array)) {
                    templateIds = [templateIds];
                }

                query['templates._id'] = {
                    $in: templateIds.map((templateId) => this.Types.ObjectId(templateId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$templates' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        templates: true
                    }
                }, {
                    $sort: {
                        'templates.createdTime': -1 // 最晚建立的在最前頭
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsTemplates = {};
                if (0 === results.length) {
                    return appsTemplates;
                }

                appsTemplates = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { templates: {} };
                    Object.assign(output[app._id].templates, this.toObject(app.templates));
                    return output;
                }, {});
                return appsTemplates;
            }).then((appsTemplates) => {
                ('function' === typeof callback) && callback(appsTemplates);
                return appsTemplates;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
        * 找到 templates未刪除的資料包，不含 apps 結構
        *
        * @param {string|string[]} appIds
        * @param {(appsTemplates: Chatshier.Models.Templates | null) => any} [callback]
        * @return {Promise<Chatshier.Models.Templates | null>}
        */
        findTemplates(appIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'templates.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$templates' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        templates: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsTemplates = {};
                if (0 === results.length) {
                    return appsTemplates;
                }

                appsTemplates = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.templates));
                    return output;
                }, {});
                return appsTemplates;
            }).then((appsTemplates) => {
                ('function' === typeof callback) && callback(appsTemplates);
                return appsTemplates;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} postTemplate
         * @param {(appsTemplates: Chatshier.Models.AppsTemplates | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTemplates | null>}
         */
        insert(appId, postTemplate, callback) {
            let templateId = this.Types.ObjectId();
            postTemplate._id = templateId;
            return this.AppsModel.findById(appId).then((app) => {
                app.templates.push(postTemplate);
                return app.save();
            }).then(() => {
                return this.find(appId, templateId.toHexString());
            }).then((appsTemplates) => {
                ('function' === typeof callback) && callback(appsTemplates);
                return appsTemplates;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * @param {string} appId
         * @param {string} templateId
         * @param {any} putTemplate
         * @param {(appsTemplates: Chatshier.Models.AppsTemplates | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTemplates | null>}
         */
        update(appId, templateId, putTemplate, callback) {
            let query = {
                '_id': appId,
                'templates._id': templateId
            };

            putTemplate._id = templateId;
            let operate = {
                $set: {
                    'templates.$': putTemplate
                }
            };

            return this.AppsModel.findOneAndUpdate(query, operate).then(() => {
                return this.find(appId, templateId);
            }).then((appsTemplates) => {
                ('function' === typeof callback) && callback(appsTemplates);
                return appsTemplates;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 刪除一筆 template 的資料
         *
         * @param {string|string[]} appIds
         * @param {string} templateId
         * @param {(appsTemplates: Chatshier.Models.AppsTemplates | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTemplates | null>}
         */
        remove(appIds, templateId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'templates._id': this.Types.ObjectId(templateId)
            };

            let operate = {
                $set: {
                    'templates.$._id': templateId,
                    'templates.$.isDeleted': true
                }
            };

            return this.AppsModel.update(query, operate).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let aggregations = [
                    {
                        $unwind: '$templates'
                    }, {
                        $match: query
                    }, {
                        $project: {
                            templates: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }
                    let appsTemplates = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { templates: {} };
                        Object.assign(output[app._id].templates, this.toObject(app.templates));
                        return output;
                    }, {});
                    return appsTemplates;
                });
            }).then((appsTemplates) => {
                ('function' === typeof callback) && callback(appsTemplates);
                return appsTemplates;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new TemplatesModel();
})();
