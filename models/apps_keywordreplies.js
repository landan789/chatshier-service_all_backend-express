module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsKeywordrepliesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        };

        /**
         * @param {string | string[]} appIds
         * @param {string | string[]} [keywordreplyIds]
         * @param {(appsKeywordreplies: Chatshier.Models.AppsKeywordreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsKeywordreplies | null>}
         */
        find(appIds, keywordreplyIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'keywordreplies.isDeleted': false
            };

            if (keywordreplyIds) {
                if (!(keywordreplyIds instanceof Array)) {
                    keywordreplyIds = [keywordreplyIds];
                }

                query['keywordreplies._id'] = {
                    $in: keywordreplyIds.map((keywordreplyId) => this.Types.ObjectId(keywordreplyId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$keywordreplies' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        keywordreplies: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsKeywordreplies = {};
                if (0 === results.length) {
                    return appsKeywordreplies;
                }
                appsKeywordreplies = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { keywordreplies: {} };
                    Object.assign(output[app._id].keywordreplies, this.toObject(app.keywordreplies));
                    return output;
                }, {});
                return appsKeywordreplies;
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} [postKeywordreply]
         * @param {(appsKeywordreplies: Chatshier.Models.AppsKeywordreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsKeywordreplies | null>}
         */
        insert(appId, postKeywordreply, callback) {
            let keywordreplyId = this.Types.ObjectId();
            postKeywordreply._id = keywordreplyId;
            postKeywordreply.createdTime = postKeywordreply.updatedTime = Date.now();

            return this.AppsModel.findById(appId).then((app) => {
                app.keywordreplies.push(postKeywordreply);
                return app.save();
            }).then(() => {
                return this.find(appId, keywordreplyId.toHexString());
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} keywordreplyId
         * @param {(appsKeywordreplies: Chatshier.Models.AppsKeywordreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsKeywordreplies | null>}
         */
        update(appId, keywordreplyId, putKeywordreply, callback) {
            putKeywordreply._id = keywordreplyId;
            putKeywordreply.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'keywordreplies._id': keywordreplyId
            };

            let updateOper = { $set: {} };
            for (let prop in putKeywordreply) {
                updateOper.$set['keywordreplies.$.' + prop] = putKeywordreply[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, keywordreplyId);
            }).then((appsKeywordreplies) => {
                ('function' === typeof callback) && callback(appsKeywordreplies);
                return appsKeywordreplies;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string | string[]} keywordreplyIds
         * @param {(appsKeywordreplies: Chatshier.Models.AppsKeywordreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsKeywordreplies | null>}
         */
        increaseReplyCount(appId, keywordreplyIds, callback) {
            if (!(keywordreplyIds instanceof Array)) {
                keywordreplyIds = [keywordreplyIds];
            }

            let query = {
                '_id': this.Types.ObjectId(appId),
                'keywordreplies._id': {
                    $in: keywordreplyIds.map((keywordreplyId) => this.Types.ObjectId(keywordreplyId))
                }
            };

            let operate = {
                $inc: {
                    'keywordreplies.$.replyCount': 1
                },
                'keywordreplies.$.updatedTime': Date.now()
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

        /**
         * @param {string} appId
         * @param {string} keywordreplyId
         * @param {(appsKeywordreplies: Chatshier.Models.AppsKeywordreplies | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsKeywordreplies | null>}
         */
        remove(appId, keywordreplyId, callback) {
            let putKeywordreply = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': appId,
                'keywordreplies._id': keywordreplyId
            };

            let updateOper = { $set: {} };
            for (let prop in putKeywordreply) {
                updateOper.$set['keywordreplies.$.' + prop] = putKeywordreply[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
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
                            keywordreplies: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsKeywordreplies = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsKeywordreplies = results.reduce((output, app) => {
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
