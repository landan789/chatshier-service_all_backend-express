module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';
    const AUTOREPLIES = 'autoreplies';
    class AutorepliesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
            this.AutorepliesModel = this.model(AUTOREPLIES, this.AutorepliesSchema);
            this.project = {
                createdTime: true,
                endedTime: true,
                isDeleted: true,
                startedTime: true,
                text: true,
                title: true,
                type: true,
                updatedTime: true
            };
        }
        find(appId, autoreplyIds, callback) {
            if (autoreplyIds && !(autoreplyIds instanceof Array)) {
                autoreplyIds = [autoreplyIds];
            }
            Promise.resolve().then(() => {
                if (!autoreplyIds) {
                    console.log(autoreplyIds);
                    let findQuery = {
                        '_id': this.Types.ObjectId(appId)
                    };
                    let aggregations = [
                        {
                            $unwind: '$autoreplies' // 只針對 document 處理
                        }, {
                            $match: findQuery
                        }, {
                            $project: {
                                // 篩選項目
                                autoreplies: {
                                    _id: '$autoreplies._id',
                                    createdTime: '$autoreplies.createdTime',
                                    endedTime: '$autoreplies.endedTime',
                                    isDeleted: '$autoreplies.isDeleted',
                                    startedTime: '$autoreplies.startedTime',
                                    text: '$autoreplies.text',
                                    title: '$autoreplies.title',
                                    type: '$autoreplies.type',
                                    updatedTime: '$autoreplies.updatedTime'
                                }
                            }
                        }
                    ];
                    return this.AppsModel.aggregate(aggregations).then((results) => {
                        if (0 === results.length) {
                            return Promise.reject(new Error('AUTOREPLY_IDS_NOT_FOUND'));
                        }
                        let appsAutoreplies = results.reduce((output, curr) => {
                            output[curr._id] = output[curr._id] || { autoreplies: {} };
                            Object.assign(output[curr._id].autoreplies, this.toObject(curr.autoreplies));
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
                            '_id': this.Types.ObjectId(appId),
                            'autoreplies._id': {
                                $in: autoreplyIds.map((autoreplyId) => this.Types.ObjectId(autoreplyId))
                            }
                        }
                    }, {
                        $project: {
                            // 篩選項目
                            autoreplies: {
                                _id: '$autoreplies._id',
                                createdTime: '$autoreplies.createdTime',
                                endedTime: '$autoreplies.endedTime',
                                isDeleted: '$autoreplies.isDeleted',
                                startedTime: '$autoreplies.startedTime',
                                text: '$autoreplies.text',
                                title: '$autoreplies.title',
                                type: '$autoreplies.type',
                                updatedTime: '$autoreplies.updatedTime'
                            }
                        }
                    }
                ];
                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error('AUTOREPLY_IDS_NOT_FOUND'));
                    }
                    let appsAutoreplies = results.reduce((output, curr) => {
                        output[curr._id] = output[curr._id] || { autoreplies: {} };
                        Object.assign(output[curr._id].autoreplies, this.toObject(curr.autoreplies));
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

        insert(appId, postautoreply, callback) {
            let autoreplyId = this.Types.ObjectId();
            let newAutoreply = {
                _id: autoreplyId,
                createdTime: postautoreply.createdTime,
                endedTime: postautoreply.endedTime || '',
                isDeleted: false,
                startedTime: postautoreply.startedTime || '',
                text: postautoreply.text || '',
                title: postautoreply.title || '',
                type: postautoreply.type || '',
                updatedTime: postautoreply.updatedTime || ''
            };
            return this.AppsModel.findById(appId).then((app) => {
                app.autoreplies.push(newAutoreply);
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
        update(appId, autoreplyId, putautoreply, callback) {
            let findQuery = {
                '_id': appId,
                'autoreplies._id': autoreplyId
            };
            putautoreply._id = autoreplyId;
            let updateOper = {
                $set: {
                    'autoreplies.$': putautoreply
                }
            };
            return this.AppsModel.findOneAndUpdate(findQuery, updateOper).then(() => {
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
+         * 刪除指定的 messager 資料 (只限內部聊天室 App)
+         *
+         * @param {string} appId
+         * @param {string} autoreplyId
+         * @param {(appsMessagers: any) => any} [callback]
+         * @returns {Promise<any>}
+         */
        remove(appId, autoreplyId, callback) {
            let findQuery = {
                '_id': appId,
                'autoreplies._id': autoreplyId
            };

            let updateOper = {
                $set: {
                    'autoreplies.$._id': autoreplyId,
                    'autoreplies.$.isDeleted': true
                }
            };
            return this.AppsModel.findOneAndUpdate(findQuery, updateOper).then(() => {
                return this.find(appId, autoreplyId);
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
            let findQuery = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                }
            };
            let aggregations = [
                {
                    $unwind: '$autoreplies' // 只針對 document 處理
                }, {
                    $match: findQuery
                }, {
                    $project: {
                        // 篩選項目
                        autoreplies: {
                            _id: '$autoreplies._id',
                            createdTime: '$autoreplies.createdTime',
                            endedTime: '$autoreplies.endedTime',
                            isDeleted: '$autoreplies.isDeleted',
                            startedTime: '$autoreplies.startedTime',
                            text: '$autoreplies.text',
                            title: '$autoreplies.title',
                            type: '$autoreplies.type',
                            updatedTime: '$autoreplies.updatedTime'
                        }
                    }
                }
            ];
            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error('AUTOREPLY_IDS_NOT_FOUND'));
                }
                let appsAutoreplies = results.reduce((output, curr) => {
                    Object.assign(output, this.toObject(curr.autoreplies));
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
