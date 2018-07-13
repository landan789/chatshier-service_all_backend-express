module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';
    const GROUPS = 'groups';
    const USERS = 'users';

    const CHATSHIER = 'CHATSHIER';

    class AppsChatroomsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
            this.GroupsModel = this.model(GROUPS, this.GroupsSchema);
            this.UsersModel = this.model(USERS, this.UsersSchema);
        }

        /**
         * @param {string | string[]} appIds
         * @param {string | string[]} [chatroomIds]
         * @param {(appsChatrooms: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        find(appIds, chatroomIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                // 尋找符合 appId 及 chatroomIds 的欄位
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'chatrooms.isDeleted': false
            };

            if (chatroomIds && !(chatroomIds instanceof Array)) {
                chatroomIds = [chatroomIds];
            }

            if (chatroomIds instanceof Array) {
                query['chatrooms._id'] = {
                    $in: chatroomIds.map((chatroomId) => this.Types.ObjectId(chatroomId))
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
                        chatrooms: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsChatrooms = {};
                if (0 === results.length) {
                    return appsChatrooms;
                }

                appsChatrooms = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = {
                            chatrooms: {}
                        };
                    }

                    if (!output[app._id].chatrooms[app.chatrooms._id]) {
                        output[app._id].chatrooms[app.chatrooms._id] = {
                            messagers: {},
                            messages: {}
                        };
                    }

                    let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                    chatroom._id = app.chatrooms._id;
                    chatroom.name = app.chatrooms.name;
                    chatroom.isDeleted = app.chatrooms.isDeleted;
                    chatroom.platformGroupId = app.chatrooms.platformGroupId;
                    chatroom.platformGroupType = app.chatrooms.platformGroupType;
                    Object.assign(chatroom.messagers, this.toObject(app.chatrooms.messagers));
                    Object.assign(chatroom.messages, this.toObject(app.chatrooms.messages));
                    return output;
                }, {});
                return appsChatrooms;
            }).then((appsChatrooms) => {
                ('function' === typeof callback) && callback(appsChatrooms);
                return appsChatrooms;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string | string[]} platformGroupIds
         * @param {any} [query]
         * @param {(appsChatrooms: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        findByPlatformGroupId(appIds, platformGroupIds, query, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let _query = query || { 'chatrooms.isDeleted': false };
            _query['_id'] = {
                $in: appIds.map((appId) => this.Types.ObjectId(appId))
            };
            _query['isDeleted'] = false;

            if (!(platformGroupIds instanceof Array)) {
                platformGroupIds = [platformGroupIds];
            }

            _query['chatrooms.platformGroupId'] = {
                $in: platformGroupIds
            };

            let aggregations = [
                {
                    $unwind: '$chatrooms'
                }, {
                    $match: _query
                }, {
                    $project: {
                        chatrooms: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsChatrooms = {};
                if (0 === results.length) {
                    return appsChatrooms;
                }

                appsChatrooms = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = {
                            chatrooms: {}
                        };
                    }

                    if (!output[app._id].chatrooms[app.chatrooms._id]) {
                        output[app._id].chatrooms[app.chatrooms._id] = {
                            messagers: {},
                            messages: {}
                        };
                    }

                    let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                    chatroom._id = app.chatrooms._id;
                    chatroom.name = app.chatrooms.name;
                    chatroom.isDeleted = app.chatrooms.isDeleted;
                    chatroom.platformGroupId = app.chatrooms.platformGroupId;
                    chatroom.platformGroupType = app.chatrooms.platformGroupType;
                    Object.assign(chatroom.messagers, this.toObject(app.chatrooms.messagers));
                    Object.assign(chatroom.messages, this.toObject(app.chatrooms.messages));
                    return output;
                }, {});
                return appsChatrooms;
            }).then((appsChatrooms) => {
                ('function' === typeof callback) && callback(appsChatrooms);
                return appsChatrooms;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} [chatroom]
         * @param {(appsChatrooms: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        insert(appId, chatroom, callback) {
            let chatroomId = this.Types.ObjectId();
            let _chatroom = chatroom || {};
            _chatroom._id = chatroomId;
            _chatroom.createdTime = _chatroom.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId)
            };

            let updateOper = {
                $push: {
                    chatrooms: _chatroom
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                // 查詢該 app 的 group_id
                // 將該 group 的 members 都加入此 chatroom 中
                let project = {
                    group_id: true
                };
                return this.AppsModel.findOne(query, project);
            }).then((app) => {
                let groupId = app.group_id;
                let query = {
                    '_id': this.Types.ObjectId(groupId),
                    'isDeleted': false,
                    'members.isDeleted': false,
                    'members.status': true
                };

                let aggregations = [
                    {
                        $unwind: '$members'
                    }, {
                        $match: query
                    }, {
                        $project: {
                            members: true
                        }
                    }
                ];

                return this.GroupsModel.aggregate(aggregations).then((results) => {
                    return results.map((group) => group.members.user_id);
                });
            }).then((memberUserIds) => {
                query['chatrooms._id'] = chatroomId;
                let options = {
                    arrayFilters: [
                        {
                            'chatroom._id': chatroomId
                        }
                    ]
                };

                return Promise.all(memberUserIds.map((memberUserId) => {
                    let messagerId = this.Types.ObjectId();
                    let messager = {
                        _id: messagerId,
                        type: CHATSHIER,
                        platformUid: memberUserId
                    };
                    messager.createdTime = messager.updatedTime = Date.now();

                    let doc = {
                        $push: {
                            'chatrooms.$[chatroom].messagers': messager
                        }
                    };
                    return this.AppsModel.update(query, doc, options);
                }));
            }).then(() => {
                return this.find(appId, chatroomId.toHexString());
            }).then((appsChatrooms) => {
                ('function' === typeof callback) && callback(appsChatrooms);
                return appsChatrooms;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {any} [chatroom]
         * @param {(appsChatrooms: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        update(appId, chatroomId, chatroom, callback) {
            chatroom = chatroom || {};
            chatroom.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'chatrooms._id': this.Types.ObjectId(chatroomId)
            };

            let updateOper = { $set: {} };
            for (let prop in chatroom) {
                updateOper.$set['chatrooms.$.' + prop] = chatroom[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                query['chatrooms.isDeleted'] = false;

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
                                name: '$chatrooms.name',
                                isDeleted: '$chatrooms.isDeleted',
                                platformGroupId: '$chatrooms.platformGroupId',
                                platformGroupType: '$chatrooms.platformGroupType'
                            }
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsChatrooms = {};
                    if (0 === results.length) {
                        return appsChatrooms;
                    }

                    appsChatrooms = results.reduce((output, app) => {
                        if (!output[app._id]) {
                            output[app._id] = { chatrooms: {} };
                        }

                        if (!output[app._id].chatrooms[app.chatrooms._id]) {
                            output[app._id].chatrooms[app.chatrooms._id] = {};
                        }

                        let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                        chatroom._id = app.chatrooms._id;
                        chatroom.name = app.chatrooms.name;
                        chatroom.isDeleted = app.chatrooms.isDeleted;
                        chatroom.platformGroupId = app.chatrooms.platformGroupId;
                        chatroom.platformGroupType = app.chatrooms.platformGroupType;
                        return output;
                    }, {});
                    return appsChatrooms;
                }).then((appsChatrooms) => {
                    ('function' === typeof callback) && callback(appsChatrooms);
                    return appsChatrooms;
                }).catch(() => {
                    ('function' === typeof callback) && callback(null);
                    return null;
                });
            });
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {(appsChatrooms: Chatshier.Models.AppsChatrooms | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsChatrooms | null>}
         */
        remove(appId, chatroomId, callback) {
            let chatroom = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId),
                'chatrooms._id': this.Types.ObjectId(chatroomId)
            };

            let updateOper = { $set: {} };
            for (let prop in chatroom) {
                updateOper.$set['chatrooms.$.' + prop] = chatroom[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
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
                                name: '$chatrooms.name',
                                isDeleted: '$chatrooms.isDeleted',
                                platformGroupId: '$chatrooms.platformGroupId',
                                platformGroupType: '$chatrooms.platformGroupType'
                            }
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsChatrooms = {};
                    if (0 === results.length) {
                        return appsChatrooms;
                    }

                    appsChatrooms = results.reduce((output, app) => {
                        if (!output[app._id]) {
                            output[app._id] = { chatrooms: {} };
                        }

                        if (!output[app._id].chatrooms[app.chatrooms._id]) {
                            output[app._id].chatrooms[app.chatrooms._id] = {};
                        }

                        let chatroom = output[app._id].chatrooms[app.chatrooms._id];
                        chatroom._id = app.chatrooms._id;
                        chatroom.name = app.chatrooms.name;
                        chatroom.isDeleted = app.chatrooms.isDeleted;
                        chatroom.platformGroupId = app.chatrooms.platformGroupId;
                        chatroom.platformGroupType = app.chatrooms.platformGroupType;
                        return output;
                    }, {});
                    return appsChatrooms;
                }).then((appsChatrooms) => {
                    ('function' === typeof callback) && callback(appsChatrooms);
                    return appsChatrooms;
                }).catch(() => {
                    ('function' === typeof callback) && callback(null);
                    return null;
                });
            });
        }
    }

    return new AppsChatroomsModel();
})();
