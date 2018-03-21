module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsChatroomsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string} appId
         * @param {any|string[]} chatroomIds
         * @param {(newChatroomId: string|null) => any} [callback]
         * @returns {Promise<any>}
         */
        find(appId, chatroomIds, callback) {
            if (!(chatroomIds instanceof Array)) {
                chatroomIds = [chatroomIds];
            }

            let aggregations = [
                {
                    $unwind: '$chatrooms' // 只針對 chatrooms document 處理
                }, {
                    $match: {
                        // 尋找符合 appId 及 chatroomIds 的欄位
                        '_id': this.Types.ObjectId(appId),
                        'chatrooms._id': {
                            $in: chatroomIds.map((chatroomId) => this.Types.ObjectId(chatroomId))
                        }
                    }
                }, {
                    $project: {
                        // 篩選不需要的項目
                        chatrooms: {
                            // 因為 messages 資料會很多，所以輸出不要包含聊天室中的 messages
                            _id: '$chatrooms._id',
                            createdTime: '$chatrooms.createdTime',
                            messagers: '$chatrooms.messagers'
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error('CHATROOM_IDS_NOT_FOUNT'));
                }

                let appsChatroomsInit = {
                    [appId]: {
                        chatrooms: {}
                    }
                };
                let appsChatrooms = results.reduce((output, curr) => {
                    return Object.assign(output, this.toObject(curr.chatrooms));
                }, appsChatroomsInit[appId].chatrooms);

                ('function' === typeof callback) && callback(appsChatrooms);
                return appsChatrooms;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {(newChatroomId: string|null) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(appId, callback) {
            let chatroomId = this.Types.ObjectId();
            let newChatroom = {
                _id: chatroomId,
                createdTime: Date.now()
            };

            return this.AppsModel.findById(appId).then((app) => {
                app.chatrooms.push(newChatroom);
                return app.save();
            }).then(() => {
                return this.find(appId, chatroomId);
            }).then((appsChatrooms) => {
                ('function' === typeof callback) && callback(appsChatrooms);
                return appsChatrooms;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };
    }

    return new AppsChatroomsModel();
})();
