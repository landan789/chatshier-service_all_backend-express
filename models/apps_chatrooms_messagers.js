module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsChatroomsMessagersModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {any|null} messagerIds
         * @param {(appsChatroomMessager: any) => any} [callback]
         */
        find(appId, chatroomId, messagerIds, callback) {
            // 尋找符合的欄位
            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'chatrooms.isDeleted': false
            };

            if (chatroomId) {
                query['chatrooms._id'] = this.Types.ObjectId(chatroomId);
            }

            if (messagerIds) {
                if (!(messagerIds instanceof Array)) {
                    messagerIds = [messagerIds];
                }

                query['chatrooms.messagers._id'] = {
                    $in: messagerIds.map((messageId) => this.Types.ObjectId(messageId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$chatrooms'
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選需要的項目
                        chatrooms: {
                            _id: '$chatrooms._id',
                            isDeleted: '$chatrooms.isDeleted',
                            messagers: !messagerIds ? '$chatrooms.messagers' : {
                                $filter: {
                                    input: '$chatrooms.messagers',
                                    as: 'messager',
                                    cond: {
                                        $or: messagerIds.map((messagerId) => ({
                                            $and: [{
                                                $eq: [ '$$messager._id', this.Types.ObjectId(messagerId) ]
                                            }, {
                                                $eq: [ '$$messager.isDeleted', false ]
                                            }]
                                        }))
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsChatroomsMessagers = {};
                if (0 === results.length) {
                    return appsChatroomsMessagers;
                }

                appsChatroomsMessagers = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = {
                            chatrooms: {}
                        };
                    }
                    if (!output[app._id].chatrooms[app.chatrooms._id]) {
                        output[app._id].chatrooms[app.chatrooms._id] = {
                            messagers: {}
                        };
                    }
                    let messagersSrc = output[app._id].chatrooms[app.chatrooms._id].messagers;
                    let messagersDest = app.chatrooms.messagers;
                    Object.assign(messagersSrc, this.toObject(messagersDest));
                    return output;
                }, {});
                return appsChatroomsMessagers;
            }).then((appChatroomMessagers) => {
                ('function' === typeof callback) && callback(appChatroomMessagers);
                return appChatroomMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string|null} chatroomId
         * @param {string|string[]} platformUids
         * @param {(appsChatroomMessager: any) => any} [callback]
         */
        findByPlatformUid(appId, chatroomId, platformUids, callback) {
            if (!(platformUids instanceof Array)) {
                platformUids = [platformUids];
            }

            // 尋找符合的欄位
            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'chatrooms.isDeleted': false,
                'chatrooms.messagers.isDeleted': false,
                'chatrooms.messagers.platformUid': {
                    $in: platformUids
                }
            };

            if (chatroomId) {
                query['chatrooms._id'] = this.Types.ObjectId(chatroomId);
            }

            let aggregations = [
                {
                    $unwind: '$chatrooms'
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選需要的項目
                        chatrooms: {
                            _id: '$chatrooms._id',
                            isDeleted: '$chatrooms.isDeleted',
                            messagers: {
                                $filter: {
                                    input: '$chatrooms.messagers',
                                    as: 'messager',
                                    cond: {
                                        $or: platformUids.map((platformUid) => ({
                                            $and: [{
                                                $eq: [ '$$messager.platformUid', platformUid ]
                                            }, {
                                                $eq: [ '$$messager.isDeleted', false ]
                                            }]
                                        }))
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsChatroomsMessagers = {};
                if (0 === results.length) {
                    return appsChatroomsMessagers;
                }

                appsChatroomsMessagers = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = {
                            chatrooms: {}
                        };
                    }
                    if (!output[app._id].chatrooms[app.chatrooms._id]) {
                        output[app._id].chatrooms[app.chatrooms._id] = {
                            messagers: {}
                        };
                    }
                    let messagersSrc = output[app._id].chatrooms[app.chatrooms._id].messagers;
                    let messagersDest = app.chatrooms.messagers;
                    Object.assign(messagersSrc, this.toObject(messagersDest, 'platformUid'));
                    return output;
                }, {});
                return appsChatroomsMessagers;
            }).then((appChatroomMessagers) => {
                ('function' === typeof callback) && callback(appChatroomMessagers);
                return appChatroomMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string} platformUid
         * @param {any} messager
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(appId, chatroomId, platformUid, messager, callback) {
            messager = messager || {};

            let messagerId = this.Types.ObjectId();
            messager._id = messagerId;
            messager.platformUid = platformUid;
            messager.createdTime = messager.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'chatrooms._id': chatroomId
            };

            let doc = {
                $push: {
                    'chatrooms.$[chatroom].messagers': messager
                }
            };

            let options = {
                arrayFilters: [{
                    'chatroom._id': this.Types.ObjectId(chatroomId)
                }]
            };

            return this.AppsModel.update(query, doc, options).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.findByPlatformUid(appId, chatroomId, platformUid);
            }).then((appsChatroomsMessagers) => {
                ('function' === typeof callback) && callback(appsChatroomsMessagers);
                return appsChatroomsMessagers;
            }).catch((err) => {
                console.log(err);
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string} messagerId
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        update(appId, chatroomId, messagerId, messager, callback) {
            messager = messager || {};

            messager._id = this.Types.ObjectId(messagerId);
            messager.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'chatrooms._id': chatroomId,
                'chatrooms.messagers._id': messagerId
            };

            let doc = { $set: {} };
            for (let prop in messager) {
                doc.$set['chatrooms.$[chatroom].messagers.$[messager].' + prop] = messager[prop];
            }

            let options = {
                arrayFilters: [
                    {
                        'chatroom._id': this.Types.ObjectId(chatroomId)
                    }, {
                        'messager._id': messager._id
                    }
                ]
            };

            return this.AppsModel.update(query, doc, options).then(() => {
                return this.find(appId, chatroomId, messagerId);
            }).then((appsChatroomsMessagers) => {
                ('function' === typeof callback) && callback(appsChatroomsMessagers);
                return appsChatroomsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string|string[]} platformUids
         * @param {number} [unReadCount]
         * @param {(appsChatroomsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        increaseUnReadByPlatformUid(appId, chatroomId, platformUids, unReadCount, callback) {
            if (!(platformUids instanceof Array)) {
                platformUids = [platformUids];
            };
            unReadCount = unReadCount || 1;

            let query = {
                '_id': appId,
                'chatrooms._id': chatroomId
            };

            return Promise.all(platformUids.map((platformUid) => {
                query['chatrooms.messagers.platformUid'] = platformUid;

                return this.findByPlatformUid(appId, chatroomId, platformUid).then((appsChatroomsMessagers) => {
                    let messager = {
                        'platformUid': platformUid,
                        'unRead': unReadCount,
                        'updatedTime': Date.now()
                    };

                    let doc = {};
                    let options = {};

                    if (!appsChatroomsMessagers || (appsChatroomsMessagers && 0 === Object.keys(appsChatroomsMessagers).length)) {
                        messager._id = this.Types.ObjectId();
                        doc.$push = {
                            'chatrooms.$[chatroom].messagers': messager
                        };

                        options.arrayFilters = [{
                            'chatroom._id': this.Types.ObjectId(chatroomId)
                        }];
                        return this.AppsModel.update(query, doc, options);
                    }

                    doc.$inc = {
                        'chatrooms.$[chatroom].messagers.$[messager].unRead': messager.unRead
                    };
                    options.arrayFilters = [
                        {
                            'chatroom._id': this.Types.ObjectId(chatroomId)
                        }, {
                            'messager.platformUid': platformUid
                        }
                    ];
                    return this.AppsModel.update(query, doc, options);
                });
            })).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUids);
            }).then((appsChatroomsMessagers) => {
                ('function' === typeof callback) && callback(appsChatroomsMessagers);
                return appsChatroomsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string} platformUid
         * @param {(appsChatroomsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        resetUnReadByPlatformUid(appId, chatroomId, platformUid, callback) {
            let messager = {
                platformUid: platformUid,
                unRead: 0,
                updatedTime: Date.now()
            };

            let query = {
                '_id': appId,
                'chatrooms._id': chatroomId,
                'chatrooms.messagers.platformUid': platformUid
            };

            let updateOper = { $set: {} };
            for (let prop in messager) {
                updateOper.$set['chatrooms.$[chatroom].messagers.$[messager].' + prop] = messager[prop];
            }

            let options = {
                upsert: true,
                arrayFilters: [{
                    'chatroom._id': this.Types.ObjectId(chatroomId)
                }, {
                    'messager.platformUid': platformUid
                }]
            };

            return this.AppsModel.update(query, updateOper, options).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUid);
            }).then((appsChatroomsMessagers) => {
                ('function' === typeof callback) && callback(appsChatroomsMessagers);
                return appsChatroomsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };
    }

    return new AppsChatroomsMessagersModel();
})();
