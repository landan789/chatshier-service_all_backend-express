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
         * @param {string | string[]} appIds
         * @param {string} [chatroomId]
         * @param {string | string[]} [messagerIds]
         * @param {string} [messagerType]
         * @param {(appsChatroomMessager: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        find(appIds, chatroomId, messagerIds, messagerType, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'chatrooms.isDeleted': false
            };

            if (chatroomId) {
                match['chatrooms._id'] = this.Types.ObjectId(chatroomId);
            }

            if (messagerIds) {
                if (!(messagerIds instanceof Array)) {
                    messagerIds = [messagerIds];
                }

                match['chatrooms.messagers._id'] = {
                    $in: messagerIds.map((messageId) => this.Types.ObjectId(messageId))
                };
            }

            let getFilterCond = (messagerIds, messagerType) => {
                if (!(messagerIds instanceof Array) && messagerIds) {
                    messagerIds = [messagerIds];
                }

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
                return prepareCond();
            };

            let aggregations = [
                {
                    $unwind: '$chatrooms'
                }, {
                    $match: match
                }, {
                    $project: {
                        // 篩選需要的項目
                        chatrooms: {
                            _id: '$chatrooms._id',
                            name: '$chatrooms.name',
                            isDeleted: '$chatrooms.isDeleted',
                            platformGroupId: '$chatrooms.platformGroupId',
                            platformGroupType: '$chatrooms.platformGroupType',
                            messagers: {
                                $filter: {
                                    input: '$chatrooms.messagers',
                                    as: 'messager',
                                    cond: getFilterCond(messagerIds, messagerType)
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

                    Object.assign(output[app._id].chatrooms, this.toObject(app.chatrooms));
                    let chatrooms = output[app._id].chatrooms;
                    chatrooms[app.chatrooms._id].messagers = this.toObject(app.chatrooms.messagers);
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
         * @param {string|null} [chatroomId]
         * @param {string|string[]} platformUids
         * @param {boolean} shouldIncludeGroupRoom
         * @param {(appsChatroomMessager: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        findByPlatformUid(appId, chatroomId, platformUids, shouldIncludeGroupRoom = false, callback) {
            if (!(platformUids instanceof Array)) {
                platformUids = [platformUids];
            }

            // 尋找符合的欄位
            let match = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'chatrooms.isDeleted': false,
                'chatrooms.messagers.isDeleted': false,
                'chatrooms.messagers.platformUid': {
                    $in: platformUids
                }
            };

            if (!shouldIncludeGroupRoom) {
                // 只搜尋單一 consumer 的聊天室
                // 由於舊資料沒有 platformGroupId 欄位，因此需要進行 or 條件
                match.$or = [
                    { 'chatrooms.platformGroupId': null },
                    { 'chatrooms.platformGroupId': '' }
                ];
            }

            if (chatroomId) {
                match['chatrooms._id'] = this.Types.ObjectId(chatroomId);
            }

            let aggregations = [
                {
                    $unwind: '$chatrooms'
                }, {
                    $match: match
                }, {
                    $project: {
                        // 篩選需要的項目
                        chatrooms: {
                            _id: '$chatrooms._id',
                            name: '$chatrooms.name',
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

                    Object.assign(output[app._id].chatrooms, this.toObject(app.chatrooms));
                    let chatrooms = output[app._id].chatrooms;
                    chatrooms[app.chatrooms._id].messagers = this.toObject(app.chatrooms.messagers, 'platformUid');
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
         * @param {(appChatroomMessager: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        replace(appId, chatroomId, messager, callback) {
            messager = messager || {};

            let platformUid = messager.platformUid;
            if (!platformUid) {
                ('function' === typeof callback) && callback(null);
                return Promise.resolve(null);
            }

            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'chatrooms._id': this.Types.ObjectId(chatroomId),
                'chatrooms.isDeleted': false,
                'chatrooms.messagers.platformUid': platformUid
            };

            return this.AppsModel.findOne(conditions).then((result) => {
                let isExist = !!result;
                if (isExist) {
                    return this.updateByPlatformUid(appId, chatroomId, platformUid, messager, callback);
                } else {
                    return this.insert(appId, chatroomId, messager, callback);
                }
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {(appChatroomMessager: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        insert(appId, chatroomId, messager, callback) {
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

            let conditions = {
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

            return this.AppsModel.update(conditions, doc, options).then(() => {
                return this.find(appId, chatroomId, messagerId.toHexString());
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
         * @param {(appChatroomMessager: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        update(appId, chatroomId, messagerId, messager, callback) {
            messager = messager || {};
            messager.updatedTime = Date.now();

            let conditions = {
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

            return this.AppsModel.update(conditions, doc, options).then(() => {
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
         * @param {(appChatroomMessager: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        updateByPlatformUid(appId, chatroomId, platformUid, messager, callback) {
            messager = messager || {};
            messager.updatedTime = Date.now();

            let conditions = {
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

            return this.AppsModel.update(conditions, doc, options).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUid, true);
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
         * @param {string | string[]} platformUids
         * @param {number} [unReadCount=1]
         * @param {(appsChatroomsMessagers: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        increaseUnReadByPlatformUid(appId, chatroomId, platformUids, unReadCount, callback) {
            if (!(platformUids instanceof Array)) {
                platformUids = [platformUids];
            };
            unReadCount = unReadCount || 1;

            let conditions = {
                '_id': appId,
                'chatrooms._id': chatroomId
            };

            return Promise.all(platformUids.map((platformUid) => {
                conditions['chatrooms.messagers.platformUid'] = platformUid;

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
                        return this.AppsModel.update(conditions, doc, options);
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
                    return this.AppsModel.update(conditions, doc, options);
                });
            })).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUids, true);
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
         * @param {(appsChatroomsMessagers: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        resetUnReadByPlatformUid(appId, chatroomId, platformUid, callback) {
            let messager = {
                unRead: 0,
                updatedTime: Date.now()
            };

            let conditions = {
                '_id': appId,
                'chatrooms._id': chatroomId,
                'chatrooms.messagers.platformUid': platformUid
            };

            let doc = { $set: {} };
            for (let prop in messager) {
                doc.$set['chatrooms.$[chatroom].messagers.$[messager].' + prop] = messager[prop];
            }

            let options = {
                upsert: true,
                arrayFilters: [{
                    'chatroom._id': this.Types.ObjectId(chatroomId)
                }, {
                    'messager.platformUid': platformUid
                }]
            };

            return this.AppsModel.update(conditions, doc, options).then(() => {
                return this.findByPlatformUid(appId, chatroomId, platformUid, true);
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
         * @param {string|string[]} [chatroomIds]
         * @param {string} platformUid
         * @param {(appsChatroomsMessagers: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        remove(appIds, chatroomIds, platformUid, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let messager = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let conditions = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'chatrooms.messagers.platformUid': platformUid
            };

            let doc = { $set: {} };
            let options = {};

            if (chatroomIds) {
                if (!(chatroomIds instanceof Array)) {
                    chatroomIds = [chatroomIds];
                }

                conditions['chatrooms._id'] = {
                    $in: chatroomIds.map((chatroomId) => this.Types.ObjectId(chatroomId))
                };

                options.arrayFilters = [{
                    'chatroom._id': conditions['chatrooms._id']
                }, {
                    'messager.platformUid': platformUid
                }];

                for (let prop in messager) {
                    doc.$set['chatrooms.$[chatroom].messagers.$[messager].' + prop] = messager[prop];
                }
            } else {
                options.arrayFilters = [{
                    'messager.platformUid': platformUid
                }];

                for (let prop in messager) {
                    doc.$set['chatrooms.$.messagers.$[messager].' + prop] = messager[prop];
                }
            }

            return this.AppsModel.update(conditions, doc, options).then((result) => {
                if (!result.ok) {
                    return Promise.reject(result);
                }

                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$chatrooms'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            // 篩選需要的項目
                            chatrooms: {
                                _id: '$chatrooms._id',
                                name: '$chatrooms.name',
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

                        Object.assign(output[app._id].chatrooms, this.toObject(app.chatrooms));
                        let chatrooms = output[app._id].chatrooms;
                        chatrooms[app.chatrooms._id].messagers = this.toObject(app.chatrooms.messagers, 'platformUid');
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
