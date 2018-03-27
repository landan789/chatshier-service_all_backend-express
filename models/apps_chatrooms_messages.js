module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$chatrooms' // 只針對 document 處理
    };

    class AppsChatroomsMessagesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * 根據 App ID, Chatroom ID, Message ID 找到 AppsChatroomsMessages 資訊
         *
         * @param {string[]|string} appIds
         * @param {any|null} chatroomId
         * @param {any|null} messageIds
         * @param {(appsChatroomsMessages: any) => any} [callback]
         */
        find(appIds, chatroomId, messageIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'chatrooms.isDeleted': false,
                'chatrooms.messages.isDeleted': false
            };

            if (chatroomId) {
                query['chatrooms._id'] = this.Types.ObjectId(chatroomId);
            }

            if (messageIds) {
                if (!(messageIds instanceof Array)) {
                    messageIds = [messageIds];
                }
                query['chatrooms.messages._id'] = {
                    $in: messageIds.map((messageId) => this.Types.ObjectId(messageId))
                };
            }

            let aggregations = [
                docUnwind,
                {
                    $match: query
                }, {
                    $project: {
                        // 篩選需要的項目
                        chatrooms: {
                            _id: '$chatrooms._id',
                            isDeleted: '$chatrooms.isDeleted',
                            messagers: '$chatrooms.messagers',
                            messages: !messageIds ? '$chatrooms.messages' : {
                                $filter: {
                                    input: '$chatrooms.messages',
                                    as: 'message',
                                    cond: {
                                        $or: messageIds.map((messageId) => ({
                                            $eq: [ '$$message._id', this.Types.ObjectId(messageId) ]
                                        }))
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsChatroomsMessages = {};
                if (0 === results.length) {
                    return appsChatroomsMessages;
                }

                appsChatroomsMessages = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = {
                            chatrooms: {
                                [app.chatrooms._id]: {
                                    messagers: {},
                                    messages: {}
                                }
                            }
                        };
                    }
                    let messagesSrc = output[app._id].chatrooms[app.chatrooms._id].messages;
                    let messagesDest = app.chatrooms.messages;
                    Object.assign(messagesSrc, this.toObject(messagesDest));
                    let messagersSrc = output[app._id].chatrooms[app.chatrooms._id].messagers;
                    let messagersDest = app.chatrooms.messagers;
                    Object.assign(messagersSrc, this.toObject(messagersDest));
                    return output;
                }, {});
                return appsChatroomsMessages;
            }).then((appChatroomMessages) => {
                ('function' === typeof callback) && callback(appChatroomMessages);
                return appChatroomMessages;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 存多筆訊息
         *
         * @param {string} appId
         * @param {string} chatroomId
         * @param {Object[]|Object} messages
         * @param {(newMessage: any) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(appId, chatroomId, messages, callback) {
            if (!(messages instanceof Array)) {
                messages = [messages];
            };

            return Promise.all(messages.map((message) => {
                let messageId = this.Types.ObjectId();
                let _message = {
                    _id: messageId,
                    isDeleted: false,
                    from: message.from,
                    messager_id: message.messager_id,
                    text: message.text || (message.altText ? message.altText + '\n' : '') + '請至智慧手機上確認訊息內容。',
                    time: Date.now(),
                    type: message.type,
                    src: message.src || ''
                };

                let query = {
                    '_id': appId,
                    'chatrooms._id': chatroomId
                };

                let updateOper = {
                    $push: {
                        'chatrooms.$[chatroom].messages': _message
                    }
                };

                let options = {
                    upsert: true,
                    arrayFilters: [{
                        'chatroom._id': this.Types.ObjectId(chatroomId)
                    }]
                };

                return this.AppsModel.update(query, updateOper, options).then(() => {
                    return messageId;
                });
            })).then((messageIds) => {
                return this.find(appId, chatroomId, messageIds);
            }).then((appsChatroomsMessages) => {
                ('function' === typeof callback) && callback(appsChatroomsMessages);
                return appsChatroomsMessages;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsChatroomsMessagesModel();
})();
