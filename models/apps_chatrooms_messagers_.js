module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$chatrooms' // 只針對 document 處理
    };

    const docOutput = {
        $project: {
            // 篩選不需要的項目
            chatrooms: {
                // 因為 messages 資料會很多，所以輸出不要包含聊天室中的 messages
                _id: '$chatrooms._id',
                isDeleted: '$chatrooms.isDeleted',
                messagers: '$chatrooms.messagers'
            }
        }
    };

    class AppsChatroomsMessagersModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string|string[]} messagerIds
         * @param {(appChatroomMessager: any) => any} [callback]
         */
        find(appId, chatroomId, messagerIds, callback) {
            if (!(messagerIds instanceof Array)) {
                messagerIds = [messagerIds];
            }

            let aggregations = [
                docUnwind,
                {
                    $match: {
                        // 尋找符合的欄位
                        '_id': this.Types.ObjectId(appId),
                        'isDeleted': false,
                        'chatrooms._id': this.Types.ObjectId(chatroomId),
                        'chatrooms.isDeleted': false,
                        'chatrooms.messagers._id': {
                            $in: messagerIds.map((messagerId) => this.Types.ObjectId(messagerId))
                        },
                        'chatrooms.messagers.isDeleted': false
                    }
                },
                docOutput
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error('CHATROOMS_MESSAGERS_NOT_FOUND'));
                }

                let appsChatroomsMessagers = results.reduce((output, curr) => {
                    if (!output[curr._id]) {
                        output[curr._id] = {
                            chatrooms: {
                                [curr.chatrooms._id]: {
                                    messagers: {}
                                }
                            }
                        };
                    }
                    let messagersSrc = output[curr._id].chatrooms[curr.chatrooms._id].messagers;
                    let messagersDest = curr.chatrooms.messagers;
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
         * @param {string} chatroomId
         * @param {string|string[]} messagerIds
         * @param {number} [unReadCount]
         * @param {(appsChatroomsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        increaseMessagersUnRead(appId, chatroomId, messagerIds, unReadCount, callback) {
            if (!(messagerIds instanceof Array)) {
                messagerIds = [messagerIds];
            };
            unReadCount = unReadCount || 1;

            let query = {
                '_id': appId,
                'chatrooms._id': chatroomId
            };

            return Promise.all(messagerIds.map((messagerId) => {
                query['chatrooms.messagers._id'] = messagerId;

                return this.find(appId, chatroomId, messagerId).then((appsChatroomsMessagers) => {
                    let messager = {
                        '_id': messagerId,
                        'unRead': unReadCount,
                        'updatedTime': Date.now()
                    };

                    let updateOper = {};
                    let options = {};

                    if (!appsChatroomsMessagers) {
                        delete query['chatrooms.messagers._id'];

                        updateOper.$push = {
                            'chatrooms.$[chatroom].messagers': messager
                        };

                        options.arrayFilters = [
                            {
                                'chatroom._id': this.Types.ObjectId(chatroomId)
                            }
                        ];
                        return this.AppsModel.update(query, updateOper, options);
                    }

                    updateOper.$inc = {
                        'chatrooms.$[chatroom].messagers.$[messager].unRead': messager.unRead
                    };
                    options.arrayFilters = [
                        {
                            'chatroom._id': this.Types.ObjectId(chatroomId)
                        }, {
                            'messager._id': this.Types.ObjectId(messagerId)
                        }
                    ];
                    return this.AppsModel.update(query, updateOper, options);
                });
            })).then(() => {
                return this.find(appId, chatroomId, messagerIds);
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
         * @param {string} messagerId
         * @param {(appsChatroomsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        resetMessagerUnRead(appId, chatroomId, messagerId, callback) {
            let messager = {
                _id: this.Types.ObjectId(messagerId),
                unRead: 0,
                updatedTime: Date.now()
            };

            let query = {
                '_id': appId,
                'chatrooms._id': chatroomId,
                'chatrooms.messagers._id': messagerId
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
                    'messager._id': this.Types.ObjectId(messagerId)
                }]
            };

            return this.AppsModel.update(query, updateOper, options).then(() => {
                return this.find(appId, chatroomId, messagerId);
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
