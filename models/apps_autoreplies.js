module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AutorepliesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * 輸入全部的 appId 取得該 App 所有自動回覆的資料
         *
         * @param {string|string[]} appIds
         * @param {string|string[]} [autoreplyIds]
         * @param {(appsAutoreplies: Chatshier.Models.AppsAutoreplies | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsAutoreplies | null>}
         */
        find(appIds, autoreplyIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'autoreplies.isDeleted': false
            };

            if (autoreplyIds) {
                if (!(autoreplyIds instanceof Array)) {
                    autoreplyIds = [autoreplyIds];
                }

                query['autoreplies._id'] = {
                    $in: autoreplyIds.map((autoreplyId) => this.Types.ObjectId(autoreplyId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$autoreplies' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        autoreplies: 1
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsAutoreplies = {};
                if (0 === results.length) {
                    return appsAutoreplies;
                }

                appsAutoreplies = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { autoreplies: {} };
                    Object.assign(output[app._id].autoreplies, this.toObject(app.autoreplies));
                    return output;
                }, {});
                return appsAutoreplies;
            }).then((appsAutoreplies) => {
                ('function' === typeof callback) && callback(appsAutoreplies);
                return appsAutoreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 找到 自動回覆未刪除的資料包，不含 apps 結構
         *
         * @param {string|string[]} appIds
         * @param {(appsAutoreplies: Chatshier.Models.Autoreplies | null) => any} [callback]
         * @return {Promise<Chatshier.Models.Autoreplies | null>}
         */
        findAutoreplies(appIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'autoreplies.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$autoreplies' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        autoreplies: 1
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let autoreplies = {};
                if (0 === results.length) {
                    return autoreplies;
                }

                autoreplies = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.autoreplies));
                    return output;
                }, {});
                return autoreplies;
            }).then((autoreplies) => {
                ('function' === typeof callback) && callback(autoreplies);
                return autoreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 輸入指定的 appId 新增一筆自動回覆的資料
         *
         * @param {string} appId
         * @param {any} postAutoreply
         * @param {(appsAutoreplies: Chatshier.Models.AppsAutoreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAutoreplies | null>}
         */
        insert(appId, postAutoreply, callback) {
            let autoreplyId = this.Types.ObjectId();
            postAutoreply._id = autoreplyId;
            postAutoreply.createdTime = postAutoreply.updatedTime = Date.now();

            return this.AppsModel.findById(appId).then((app) => {
                app.autoreplies.push(postAutoreply);
                return app.save();
            }).then(() => {
                return this.find(appId, autoreplyId);
            }).then((appsAutoreplies) => {
                ('function' === typeof callback) && callback(appsAutoreplies);
                return appsAutoreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 輸入指定的 appId 修改一筆自動回覆的資料
         *
         * @param {string} appId
         * @param {string} autoreplyId
         * @param {any} putAutoreply
         * @param {(appsAutoreplies: Chatshier.Models.AppsAutoreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAutoreplies | null>}
         */
        update(appId, autoreplyId, putAutoreply, callback) {
            putAutoreply._id = autoreplyId;
            putAutoreply.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'autoreplies._id': autoreplyId
            };

            let updateOper = { $set: {} };
            for (let prop in putAutoreply) {
                updateOper.$set['autoreplies.$.' + prop] = putAutoreply[prop];
            }

            return this.AppsModel.findOneAndUpdate(query, updateOper).then(() => {
                return this.find(appId, autoreplyId);
            }).then((appsAutoreplies) => {
                ('function' === typeof callback) && callback(appsAutoreplies);
                return appsAutoreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 輸入指定的 appId 刪除一筆自動回覆的資料
         *
         * @param {string} appId
         * @param {string} autoreplyId
         * @param {(appsAutoreplies: Chatshier.Models.AppsAutoreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAutoreplies | null>}
         */
        remove(appId, autoreplyId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId),
                'autoreplies._id': this.Types.ObjectId(autoreplyId)
            };

            let operate = {
                $set: {
                    'autoreplies.$.isDeleted': true,
                    'autoreplies.$.updatedTime': Date.now()
                }
            };

            return this.AppsModel.update(query, operate).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let aggregations = [
                    {
                        $unwind: '$autoreplies'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(appId),
                            'autoreplies._id': this.Types.ObjectId(autoreplyId)
                        }
                    }, {
                        $project: {
                            autoreplies: 1
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }
                    let appsAutoreplies = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { autoreplies: {} };
                        Object.assign(output[app._id].autoreplies, this.toObject(app.autoreplies));
                        return output;
                    }, {});
                    return appsAutoreplies;
                });
            }).then((appsAutoreplies) => {
                ('function' === typeof callback) && callback(appsAutoreplies);
                return appsAutoreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new AutorepliesModel();
})();
