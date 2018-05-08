module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';
    const USERS = 'users';
    const CONSUMERS = 'consumers';
    const CHATSHIER = 'CHATSHIER';

    class AppsChatroomsMessagersModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
            this.ConsumersModel = this.model(CONSUMERS, this.ConsumersSchema);
            this.UsersModel = this.model(USERS, this.UsersSchema);
        }

        /**
         * @param {string|string[]} appIds
         * @param {string|null} [chatroomId]
         * @param {any|null} [messagerIds]
         * @param {string} [messagerType]
         * @param {(appsChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        find(appIds, chatroomId, messagerIds, messagerType, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
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

            let getFilterCond = () => {
                let prepareCond = (messagerId, messagerType) => {
                    /** @type {any} */
                    let cond = {
                        $and: [{
                            $eq: [ '$$messager.isDeleted', false ]
                        }]
                    };

                    if (messagerId) {
                        cond.$and.push({
                            $eq: [ '$$messager._id', this.Types.ObjectId(messagerId) ]
                        });
                    }

                    if (messagerType) {
                        cond.$and.push({
                            $eq: [ '$$messager.type', messagerType ]
                        });
                    }
                    return cond;
                };

                if (messagerIds) {
                    return {
                        $or: messagerIds.map((messagerId) => prepareCond(messagerId))
                    };
                } else if (messagerType) {
                    return prepareCond(void 0, messagerType);
                }
                return prepareCond(messagerType);
            };

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
                            platformGroupId: '$chatrooms.platformGroupId',
                            platformGroupType: '$chatrooms.platformGroupType',
                            messagers: {
                                $filter: {
                                    input: '$chatrooms.messagers',
                                    as: 'messager',
                                    cond: getFilterCond()
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

                    let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                    chatroom._id = app.chatrooms._id;
                    chatroom.platformGroupId = app.chatrooms.platformGroupId;
                    chatroom.platformGroupType = app.chatrooms.platformGroupType;
                    Object.assign(chatroom.messagers, this.toObject(app.chatrooms.messagers));
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
         * @param {any} [query]
         * @param {(appsChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        findByPlatformUid(appId, chatroomId, platformUids, query, callback) {
            if (!(platformUids instanceof Array)) {
                platformUids = [platformUids];
            }

            // 尋找符合的欄位
            let _query = query || {};
            _query['_id'] = this.Types.ObjectId(appId);
            _query['isDeleted'] = false;
            _query['chatrooms.isDeleted'] = false;
            _query['chatrooms.messagers.isDeleted'] = false;
            _query['chatrooms.messagers.platformUid'] = {
                $in: platformUids
            };

            if (chatroomId) {
                _query['chatrooms._id'] = this.Types.ObjectId(chatroomId);
            }

            let aggregations = [
                {
                    $unwind: '$chatrooms'
                }, {
                    $match: _query
                }, {
                    $project: {
                        // 篩選需要的項目
                        chatrooms: {
                            _id: '$chatrooms._id',
                            isDeleted: '$chatrooms.isDeleted',
                            platformGroupId: '$chatrooms.platformGroupId',
                            platformGroupType: '$chatrooms.platformGroupType',
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

                    let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                    chatroom._id = app.chatrooms._id;
                    chatroom.platformGroupId = app.chatrooms.platformGroupId;
                    chatroom.platformGroupType = app.chatrooms.platformGroupType;
                    Object.assign(chatroom.messagers, this.toObject(app.chatrooms.messagers, 'platformUid'));
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
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        replace(appId, chatroomId, messager, callback) {
            messager = messager || {};

            let platformUid = messager.platformUid;
            if (!platformUid) {
                ('function' === typeof callback) && callback(null);
                return Promise.resolve(null);
            }

            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'chatrooms._id': this.Types.ObjectId(chatroomId),
                'chatrooms.isDeleted': false,
                'chatrooms.messagers.platformUid': platformUid
            };

            return this.AppsModel.findOne(query).then((result) => {
                let isExist = !!result;
                if (isExist) {
                    return this.updateByPlatformUid(appId, chatroomId, platformUid, messager, callback);
                } else {
                    return this.insertByPlatformUid(appId, chatroomId, messager, callback);
                }
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        insertByPlatformUid(appId, chatroomId, messager, callback) {
            let messagerId = this.Types.ObjectId();
            messager = messager || {};
            messager._id = messagerId;
            messager.type = messager.type || CHATSHIER;
            messager.createdTime = messager.updatedTime = messager.lastTime = Date.now();

            let platformUid = messager.platformUid;
            if (!platformUid) {
                ('function' === typeof callback) && callback(null);
                return Promise.resolve(null);
            }

            let query = {
                '_id': this.Types.ObjectId(appId),
                'chatrooms._id': this.Types.ObjectId(chatroomId)
            };

            let doc = {
                $push: {
                    'chatrooms.$[chatroom].messagers': messager
                }
            };

            let options = {
                arrayFilters: [
                    {
                        'chatroom._id': this.Types.ObjectId(chatroomId)
                    }
                ]
            };

            return this.AppsModel.update(query, doc, options).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUid);
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
         * @param {string} messagerId
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        update(appId, chatroomId, messagerId, messager, callback) {
            messager = messager || {};
            messager.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'chatrooms._id': this.Types.ObjectId(chatroomId),
                'chatrooms.messagers._id': this.Types.ObjectId(messagerId)
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
                        'messager._id': this.Types.ObjectId(messagerId)
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
         * @param {string} platformUid
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        updateByPlatformUid(appId, chatroomId, platformUid, messager, callback) {
            messager = messager || {};
            messager.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'chatrooms._id': this.Types.ObjectId(chatroomId),
                'chatrooms.messagers.platformUid': platformUid
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
                        'messager.platformUid': platformUid
                    }
                ]
            };

            return this.AppsModel.update(query, doc, options).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUid);
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
                        platformUid: platformUid,
                        updatedTime: Date.now()
                    };

                    let doc = {};
                    let options = {};

                    if (!appsChatroomsMessagers || (appsChatroomsMessagers && 0 === Object.keys(appsChatroomsMessagers).length)) {
                        messager._id = this.Types.ObjectId();
                        messager.unRead = unReadCount;
                        doc.$push = {
                            'chatrooms.$[chatroom].messagers': messager
                        };

                        options.arrayFilters = [{
                            'chatroom._id': this.Types.ObjectId(chatroomId)
                        }];
                        return this.AppsModel.update(query, doc, options);
                    }

                    doc.$inc = {
                        'chatrooms.$[chatroom].messagers.$[messager].unRead': unReadCount
                    };

                    doc.$set = {};
                    for (let prop in messager) {
                        doc.$set['chatrooms.$[chatroom].messagers.$[messager].' + prop] = messager[prop];
                    }

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

        /**
         * @param {string|string[]} appIds
         * @param {string|string[]|null} chatroomIds
         * @param {string} platformUid
         * @param {(appsChatroomsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        remove(appIds, chatroomIds, platformUid, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let messager = {
                platformUid: platformUid,
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'chatrooms.isDeleted': false,
                'chatrooms.messagers.platformUid': platformUid,
                'chatrooms.messagers.isDeleted': false
            };

            let updateOper = { $set: {} };
            let options = {};

            if (chatroomIds) {
                if (!(chatroomIds instanceof Array)) {
                    chatroomIds = [chatroomIds];
                }

                query['chatrooms._id'] = {
                    $in: chatroomIds.map((chatroomId) => this.Types.ObjectId(chatroomId))
                };

                options.arrayFilters = [{
                    'chatroom._id': query['chatrooms._id']
                }, {
                    'messager.platformUid': platformUid
                }];

                for (let prop in messager) {
                    updateOper.$set['chatrooms.$[chatroom].messagers.$[messager].' + prop] = messager[prop];
                }
            } else {
                options.arrayFilters = [{
                    'messager.platformUid': platformUid
                }];

                for (let prop in messager) {
                    updateOper.$set['chatrooms.$.messagers.$[messager].' + prop] = messager[prop];
                }
            }

            return this.AppsModel.update(query, updateOper, options).then((result) => {
                if (!result.ok) {
                    return Promise.reject(result);
                }

                query['chatrooms.messagers.isDeleted'] = true;
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
                                platformGroupId: '$chatrooms.platformGroupId',
                                platformGroupType: '$chatrooms.platformGroupType',
                                messagers: {
                                    $filter: {
                                        input: '$chatrooms.messagers',
                                        as: 'messager',
                                        cond: {
                                            $and: [{
                                                $eq: [ '$$messager.platformUid', platformUid ]
                                            }, {
                                                $eq: [ '$$messager.isDeleted', true ]
                                            }]
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

                        let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                        chatroom._id = app.chatrooms._id;
                        chatroom.platformGroupId = app.chatrooms.platformGroupId;
                        chatroom.platformGroupType = app.chatrooms.platformGroupType;
                        Object.assign(chatroom.messagers, this.toObject(app.chatrooms.messagers, 'platformUid'));
                        return output;
                    }, {});
                    return appsChatroomsMessagers;
                });
            }).then((appsChatroomsMessagers) => {
                ('function' === typeof callback) && callback(appsChatroomsMessagers);
                return appsChatroomsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsChatroomsMessagersModel();
})();
