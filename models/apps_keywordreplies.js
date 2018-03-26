module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';
    const KEYWORDREPLIES = 'keywordreplies';
    class AppsKeywordrepliesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        };
        find(appIds, keywordreplyIds, callback) {
            if (keywordreplyIds && !(keywordreplyIds instanceof Array)) {
                keywordreplyIds = [keywordreplyIds];
            }
            if (appIds && !(appIds instanceof Array)) {
                appIds = [appIds];
            }
            return Promise.resolve().then(() => {
                if (!keywordreplyIds) {
                    let query = {
                        '_id': {
                            $in: appIds.map((appId) => this.Types.ObjectId(appId))
                        },
                        'keywordreplies.isDeleted': false
                    };
                    let aggregations = [
                        {
                            $unwind: '$keywordreplies' // 只針對 document 處理
                        }, {
                            $match: query
                        }, {
                            $project: {
                                // 篩選項目
                                keywordreplies: 1
                            }
                        }
                    ];
                    return this.AppsModel.aggregate(aggregations).then((results) => {
                        if (0 === results.length) {
                            let appsKeywordreplies = {};
                            return Promise.resolve(appsKeywordreplies);
                        }
                        let appsKeywordreplies = results.reduce((output, app) => {
                            output[app._id] = output[app._id] || { keywordreplies: {} };
                            Object.assign(output[app._id].keywordreplies, this.toObject(app.keywordreplies));
                            return output;
                        }, {});
                        return appsKeywordreplies;
                    });
                }
                let aggregations = [
                    {
                        $unwind: '$keywordreplies' // 只針對 autoreplies document 處理
                    }, {
                        $match: {
                            // 尋找符合 appId 及 autoreplyIds 的欄位
                            '_id': {
                                $in: appIds.map((appId) => this.Types.ObjectId(appId))
                            },
                            'keywordreplies._id': {
                                $in: keywordreplyIds.map((keywordreplyId) => this.Types.ObjectId(keywordreplyId))
                            },
                            'keywordreplies.isDeleted': false
                        }
                    }, {
                        $project: {
                            // 篩選項目
                            keywordreplies: 1
                        }
                    }
                ];
                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        let appsKeywordreplies = {};
                        return Promise.resolve(appsKeywordreplies);
                    }
                    let appsKeywordreplies = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { keywordreplies: {} };
                        Object.assign(output[app._id].keywordreplies, this.toObject(app.keywordreplies));
                        return output;
                    }, {});
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        insert(appId, postKeywordreply, callback) {
            let keywordreplyId = this.Types.ObjectId();
            postKeywordreply._id = keywordreplyId;
            return this.AppsModel.findById(appId).then((app) => {
                app.keywordreplies.push(postKeywordreply);
                return app.save();
            }).then(() => {
                return this.find(appId, keywordreplyId);
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return Promise.resolve(appsKeywordreplies);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        update(appId, keywordreplyId, putKeywordreply, callback) {
            let query = {
                '_id': appId,
                'keywordreplies._id': keywordreplyId
            };
            putKeywordreply._id = keywordreplyId;
            let updateOper = {
                $set: {
                    'keywordreplies.$': putKeywordreply
                }
            };
            return this.AppsModel.findOneAndUpdate(query, updateOper).then(() => {
                return this.find(appId, keywordreplyId);
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };
        increaseReplyCount(appId, keywordreplyIds, callback) {
            if (keywordreplyIds && !(keywordreplyIds instanceof Array)) {
                keywordreplyIds = [keywordreplyIds];
            }
            let query = {
                '_id': appId,
                'keywordreplies._id': {
                    $in: keywordreplyIds.map((keywordreplyId) => this.toObject(keywordreplyId))
                }
            };
            let operate = {
                $inc: {
                    'keywordreplies.$.replyCount': 1
                }
            };
            return this.AppsModel.update(query, operate, { multi: true }).then(() => {
                return this.find(appId, keywordreplyIds);
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        remove(appId, keywordreplyId, callback) {
            let query = {
                '_id': appId,
                'keywordreplies._id': keywordreplyId
            };

            let updateOper = {
                $set: {
                    'keywordreplies.$._id': keywordreplyId,
                    'keywordreplies.$.isDeleted': true
                }
            };
            return this.AppsModel.update(query, updateOper).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }
                let aggregations = [
                    {
                        $unwind: '$keywordreplies'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(appId),
                            'keywordreplies._id': this.Types.ObjectId(keywordreplyId)
                        }
                    }, {
                        $project: {
                            keywordreplies: 1
                        }
                    }
                ];
                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        let appsKeywordreplies = {};
                        return Promise.resolve(appsKeywordreplies);
                    }
                    let appsKeywordreplies = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { keywordreplies: {} };
                        Object.assign(output[app._id].keywordreplies, this.toObject(app.keywordreplies));
                        return output;
                    }, {});
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new AppsKeywordrepliesModel();
})();
