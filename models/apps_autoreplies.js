module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';
    const AUTOREPLIES = 'autoreplies';
    class AutorepliesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }
        find(appIds, autoreplyIds, callback) {
            if (autoreplyIds && !(autoreplyIds instanceof Array)) {
                autoreplyIds = [autoreplyIds];
            }
            if (appIds && !(appIds instanceof Array)) {
                appIds = [appIds];
            }
            return Promise.resolve().then(() => {
                if (!autoreplyIds) {
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
                        if (0 === results.length) {
                            let appsAutoreplies = {};
                            return Promise.resolve(appsAutoreplies);
                        }
                        let appsAutoreplies = results.reduce((output, app) => {
                            output[app._id] = output[app._id] || { autoreplies: {} };
                            Object.assign(output[app._id].autoreplies, this.toObject(app.autoreplies));
                            return output;
                        }, {});
                        return appsAutoreplies;
                    });
                };
                let aggregations = [
                    {
                        $unwind: '$autoreplies' // 只針對 autoreplies document 處理
                    }, {
                        $match: {
                            // 尋找符合 appId 及 autoreplyIds 的欄位
                            '_id': {
                                $in: appIds.map((appId) => this.Types.ObjectId(appId))
                            },
                            'autoreplies.isDeleted': false,
                            'autoreplies._id': {
                                $in: autoreplyIds.map((autoreplyId) => this.Types.ObjectId(autoreplyId))
                            }
                        }
                    }, {
                        $project: {
                            // 篩選項目
                            autoreplies: 1
                        }
                    }
                ];
                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        let appsAutoreplies = {};
                        return Promise.resolve(appsAutoreplies);
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

        insert(appId, postAutoreply, callback) {
            let autoreplyId = this.Types.ObjectId();
            postAutoreply._id = autoreplyId;
            return this.AppsModel.findById(appId).then((app) => {
                app.autoreplies.push(postAutoreply);
                return app.save();
            }).then(() => {
                return this.find(appId, autoreplyId);
            }).then((appsAutoreplies) => {
                console.log(appsAutoreplies);
                ('function' === typeof callback) && callback(appsAutoreplies);
                return Promise.resolve(appsAutoreplies);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };
        update(appId, autoreplyId, putAutoreply, callback) {
            let query = {
                '_id': appId,
                'autoreplies._id': autoreplyId
            };
            putAutoreply._id = autoreplyId;
            let operate = {
                $set: {
                    'autoreplies.$': putAutoreply
                }
            };
            return this.AppsModel.findOneAndUpdate(query, operate).then(() => {
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
         * 刪除指定的 messager 資料 (只限內部聊天室 App)
         *
         * @param {string|string[]} appIds
         * @param {string} autoreplyId
         * @param {(appsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        remove(appIds, autoreplyId, callback) {
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'autoreplies._id': autoreplyId
            };

            let operate = {
                $set: {
                    'autoreplies.$._id': autoreplyId,
                    'autoreplies.$.isDeleted': true
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
                            '_id': {
                                $in: appIds.map((appId) => this.Types.ObjectId(appId))
                            },
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
        findAutoreplies(appIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                }
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
                if (0 === results.length) {
                    return Promise.reject(new Error('AUTOREPLY_IDS_NOT_FOUND'));
                }
                let appsAutoreplies = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.autoreplies));
                    return output;
                }, {});
                return appsAutoreplies;
            }).then((appsAutoreplies) => {
                ('function' === typeof callback) && callback(appsAutoreplies);
                return Promise.resolve(appsAutoreplies);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        };
    }
    return new AutorepliesModel();
})();
