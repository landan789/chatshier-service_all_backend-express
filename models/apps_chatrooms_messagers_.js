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
         * @param {string|string[]} messagerIds
         */
        find(appId, chatroomId, messagerIds) {
            if (!(messagerIds instanceof Array)) {
                messagerIds = [messagerIds];
            }

            let aggregations = [
                {
                    $unwind: '$chatrooms' // 只針對 document 處理
                }, {
                    $match: {
                        // // 尋找符合的欄位
                        '_id': this.Types.ObjectId(appId),
                        'chatrooms._id': this.Types.ObjectId(chatroomId),
                        'chatrooms.messagers._id': {
                            $in: messagerIds.map((messagerId) => this.Types.ObjectId(messagerId))
                        }
                    }
                }, {
                    $project: {
                        // 篩選不需要的項目
                        chatrooms: {
                            // 因為 messages 資料會很多，所以輸出不要包含聊天室中的 messages
                            _id: '$chatrooms._id',
                            messagers: '$chatrooms.messagers'
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
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

            return Promise.all(messagerIds.map((messagerId) => {
                return this.find(appId, chatroomId, messagerId).then((appsChatroomsMessagers) => {
                    let messager = appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
                    messager.unRead += unReadCount;
                    messager.updatedTime = Date.now();
                    messager._id = this.Types.ObjectId(messagerId);

                    let findQuery = {
                        '_id': appId,
                        'chatrooms._id': chatroomId,
                        'chatrooms.messagers._id': messagerId
                    };

                    let updateOper = {
                        $set: {
                            'chatrooms.$[chatroom].messagers.$[messager]': messager
                        }
                    };

                    let options = {
                        arrayFilters: [{
                            'chatroom._id': this.Types.ObjectId(chatroomId)
                        }, {
                            'messager._id': this.Types.ObjectId(messagerId)
                        }]
                    };

                    return this.AppsModel.update(findQuery, updateOper, options).then(() => {
                        return this.find(appId, chatroomId, messagerId);
                    }).then((appsChatroomsMessagers) => {
                        ('function' === typeof callback) && callback(appsChatroomsMessagers);
                        return appsChatroomsMessagers;
                    }).catch((err) => {
                        console.log(err);
                        ('function' === typeof callback) && callback(null);
                        return null;
                    });
                });
            }));
        };

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string} messagerId
         * @param {(isSuccessful: boolean) => any} [callback]
         * @returns {Promise<boolean>}
         */
        resetMessagerUnRead(appId, chatroomId, messagerId, callback) {
            let isSuccess = false;
            let messager = {
                _id: this.Types.ObjectId(messagerId),
                unRead: 0,
                updatedTime: Date.now()
            };

            let findQuery = {
                '_id': appId,
                'chatrooms._id': chatroomId,
                'chatrooms.messagers._id': messagerId
            };

            let updateOper = {
                $set: {
                    'chatrooms.$[chatroom].messagers.$[messager]': messager
                }
            };

            let options = {
                arrayFilters: [{
                    'chatroom._id': this.Types.ObjectId(chatroomId)
                }, {
                    'messager._id': this.Types.ObjectId(messagerId)
                }]
            };

            return this.AppsModel.update(findQuery, updateOper, options).then(() => {
                isSuccess = true;
                ('function' === typeof callback) && callback(isSuccess);
                return isSuccess;
            }).catch(() => {
                ('function' === typeof callback) && callback(isSuccess);
                return isSuccess;
            });
        };
    }

    return new AppsChatroomsMessagersModel();
})();
