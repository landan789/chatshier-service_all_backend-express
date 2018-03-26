module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$chatrooms' // 只針對 chatrooms document 處理
    };

    const docOutput = {
        $project: {
            // 篩選不需要的項目
            chatrooms: {
                // 因為 messages 資料會很多，所以輸出不要包含聊天室中的 messages
                _id: '$chatrooms._id',
                isDeleted: '$chatrooms.isDeleted',
                createdTime: '$chatrooms.createdTime',
                messagers: '$chatrooms.messagers'
            }
        }
    };

    class AppsChatroomsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string} appId
         * @param {any|string[]} chatroomIds
         * @param {(appsChatrooms: any) => any} [callback]
         * @returns {Promise<any>}
         */
        find(appId, chatroomIds, callback) {
            if (!(chatroomIds instanceof Array)) {
                chatroomIds = [chatroomIds];
            }

            let aggregations = [
                docUnwind,
                {
                    $match: {
                        // 尋找符合 appId 及 chatroomIds 的欄位
                        '_id': this.Types.ObjectId(appId),
                        'isDeleted': false,
                        'chatrooms._id': {
                            $in: chatroomIds.map((chatroomId) => this.Types.ObjectId(chatroomId))
                        },
                        'chatrooms.isDeleted': false
                    }
                },
                docOutput
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    let appsChatrooms = {};
                    return Promise.resolve(appsChatrooms);
                }

                let appsChatrooms = results.reduce((output, curr) => {
                    if (!output[curr._id]) {
                        output[curr._id] = {
                            chatrooms: {}
                        };
                    }
                    Object.assign(output[curr._id].chatrooms, this.toObject(curr.chatrooms));
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
         * @param {(appsChatrooms: any) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(appId, callback) {
            let chatroomId = this.Types.ObjectId();
            let chatroom = {
                _id: chatroomId,
                createdTime: Date.now(),
                updatedTime: Date.now()
            };

            let query = {
                '_id': appId
            };

            let updateOper = {
                $push: {
                    chatrooms: chatroom
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
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
