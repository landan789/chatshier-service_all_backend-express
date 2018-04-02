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
         * @param {(appsChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        find(appIds, chatroomId, messagerIds, callback) {
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

                    Object.assign(output[app._id].chatrooms[app.chatrooms._id].messagers, this.toObject(app.chatrooms.messagers));
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
         * @returns {Promise<any>}
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
         * @param {string|string[]} appIds
         * @param {boolean} [shouldFindChatshier=false]
         * @param {(platformUids: string[]|null) => any} [callback]
         * @returns {Promise<any>}
         */
        findPlatformUids(appIds, shouldFindChatshier, callback) {
            shouldFindChatshier = !!shouldFindChatshier;

            return this.find(appIds).then((appsChatroomsMessagers) => {
                appsChatroomsMessagers = appsChatroomsMessagers || {};
                let platformUids = [];
                for (let appId in appsChatroomsMessagers) {
                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    for (let chatroomId in chatrooms) {
                        let messagers = chatrooms[chatroomId].messagers;
                        for (let messagerId in messagers) {
                            let messager = messagers[messagerId];
                            if (shouldFindChatshier && CHATSHIER === messager.type) {
                                platformUids.push(messager.platformUid);
                            } else if (CHATSHIER !== messager.type) {
                                platformUids.push(messager.platformUid);
                            }
                        }
                    }
                }
                return platformUids;
            }).then((platformUids) => {
                ('function' === typeof callback) && callback(platformUids);
                return platformUids;
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
                    return this.insert(appId, chatroomId, messager, callback);
                }
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {(appChatroomMessager: any) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(appId, chatroomId, messager, callback) {
            messager = messager || {};
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
                return this._updateChatroomIds(chatroomId, platformUid, messager.type);
            }).then(() => {
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
                let messager = appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
                let platformUid = messager.platformUid;
                return this._updateChatroomIds(chatroomId, platformUid, messager.type).then(() => {
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
                return this._updateChatroomIds(chatroomId, platformUid, messager.type);
            }).then(() => {
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
                        let messagersSrc = output[app._id].chatrooms[app.chatrooms._id].messagers;
                        let messagersDest = app.chatrooms.messagers;
                        Object.assign(messagersSrc, this.toObject(messagersDest, 'platformUid'));
                        return output;
                    }, {});
                    return appsChatroomsMessagers;
                });
            }).then((appsChatroomsMessagers) => {
                let appIds = Object.keys(appsChatroomsMessagers);

                return Promise.all(appIds.map((appId) => {
                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    let chatroomIds = Object.keys(chatrooms);

                    return Promise.all(chatroomIds.map((chatroomId) => {
                        let _messager = chatrooms[chatroomId].messagers[platformUid];
                        return this._removeChatroomIds(chatroomId, platformUid, _messager.type);
                    }));
                })).then(() => {
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

        /**
         * @param {string} chatroomId
         * @param {string} platformUid
         * @param {string} messagerType
         * @returns {Promise<any>}
         */
        _updateChatroomIds(chatroomId, platformUid, messagerType) {
            // 將 messager 加入至 chatroom 後，檢查 messager 身份為何
            // 屬於 chatshier 用戶時，將此 chatroomId 新增至 user 的 chatroom_ids 裡
            // 屬於第三方平台的用戶時，將此 chatroomId 新增至 consumer 的 chatroom_ids 裡
            let project = {
                chatroom_ids: true
            };

            if (CHATSHIER === messagerType) {
                return this.UsersModel.findOne({ _id: platformUid }, project).then((userDoc) => {
                    if (userDoc && 0 > userDoc.chatroom_ids.indexOf(chatroomId)) {
                        userDoc.chatroom_ids.push(chatroomId);
                        return userDoc.save();
                    }
                });
            }

            return this.ConsumersModel.findOne({ platformUid: platformUid }, project).then((consumerDoc) => {
                if (consumerDoc && 0 > consumerDoc.chatroom_ids.indexOf(chatroomId)) {
                    consumerDoc.chatroom_ids.push(chatroomId);
                    return consumerDoc.save();
                }
            });
        }

        /**
         * @param {string} chatroomId
         * @param {string} platformUid
         * @param {string} messagerType
         * @returns {Promise<any>}
         */
        _removeChatroomIds(chatroomId, platformUid, messagerType) {
            // 將 messager 從 chatroom 刪除後，檢查 messager 身份為何
            // 屬於 chatshier 用戶時，將此 chatroomId 從 user 的 chatroom_ids 裡移除
            // 屬於第三方平台用戶時，將此 chatroomId 從 consumer 的 chatroom_ids 裡移除
            let project = {
                chatroom_ids: true
            };

            if (CHATSHIER === messagerType) {
                return this.UsersModel.findOne({ _id: platformUid }, project).then((userDoc) => {
                    let idx = userDoc ? userDoc.chatroom_ids.indexOf(chatroomId) : -1;
                    if (0 <= idx) {
                        userDoc.chatroom_ids.splice(idx, 1);
                        return userDoc.save();
                    }
                });
            }

            return this.ConsumersModel.findOne({ platformUid: platformUid }, project).then((consumerDoc) => {
                let idx = consumerDoc ? consumerDoc.chatroom_ids.indexOf(chatroomId) : -1;
                if (0 <= idx) {
                    consumerDoc.chatroom_ids.splice(idx, 1);
                    return consumerDoc.save();
                }
            });
        }
    }

    return new AppsChatroomsMessagersModel();
})();
