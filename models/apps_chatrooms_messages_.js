module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsChatroomsMessagesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * 根據App ID, Chatroom ID, Message ID找到 AppsChatroomsMessages 資訊
         *
         * @param {string[]|string} appIds
         * @param {string|null} chatroomId
         * @param {(appsChatroomsMessages: any) => any} [callback]
         */
        find(appIds, chatroomId, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let findQuery = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                }
            };
            chatroomId && (findQuery['chatrooms._id'] = this.Types.ObjectId(chatroomId));

            let aggregations = [
                {
                    $unwind: '$chatrooms' // 只針對 document 處理
                }, {
                    $match: findQuery
                }, {
                    $project: {
                        // 篩選不需要的項目
                        chatrooms: {
                            // 因為 messages 資料會很多，所以輸出不要包含聊天室中的 messages
                            _id: '$chatrooms._id',
                            messages: '$chatrooms.messages'
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsChatroomsMessages = results.reduce((output, curr) => {
                    if (!output[curr._id]) {
                        output[curr._id] = {
                            chatrooms: {
                                [curr.chatrooms._id]: {
                                    messages: {}
                                }
                            }
                        };
                    }
                    let messagesSrc = output[curr._id].chatrooms[curr.chatrooms._id].messages;
                    let messagesDest = curr.chatrooms.messages;
                    Object.assign(messagesSrc, this.toObject(messagesDest));
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
        insertMessages(appId, chatroomId, messages, callback) {
            if (!(messages instanceof Array)) {
                messages = [messages];
            };
            let _messages = {};

            return Promise.all(messages.map((message) => {
                let _message = {
                    _id: this.Types.ObjectId(),
                    isDeleted: false,
                    from: message.from,
                    messager_id: message.messager_id,
                    text: message.text || (message.altText ? message.altText + '\n' : '') + '請至智慧手機上確認訊息內容。',
                    time: Date.now(),
                    type: message.type,
                    src: message.src || ''
                };

                let findQuery = {
                    '_id': appId,
                    'chatrooms._id': chatroomId
                };

                let updateOper = { $set: {} };
                for (let prop in _message) {
                    updateOper.$set['chatrooms.$[chatroom].messages.$.' + prop] = _message[prop];
                }

                let options = {
                    upsert: true,
                    arrayFilters: [{
                        'chatroom._id': this.Types.ObjectId(chatroomId)
                    }]
                };

                return this.AppsModel.update(findQuery, updateOper, options).then(() => {
                    return this.find(appId, chatroomId);
                }).then((appsChatroomsMessages) => {
                    Object.assign(_messages, appsChatroomsMessages);
                    ('function' === typeof callback) && callback(appsChatroomsMessages);
                    return appsChatroomsMessages;
                }).catch(() => {
                    ('function' === typeof callback) && callback(null);
                    return null;
                });
            })).then(() => {
                return _messages;
            });
        }
    }

    return new AppsChatroomsMessagesModel();
})();
