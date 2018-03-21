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
         * @param {(appsChatrooms: any) => any} [callback]
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
                    return Promise.reject(new Error('CHATROOMS_NOT_FOUND'));
                }

                let appsChatrooms = results.reduce((output, curr) => {
                    output[curr._id] = output[curr._id] || { chatrooms: {} };
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
                createdTime: Date.now()
            };

            let updateOper = {
                $push: {
                    chatrooms: chatroom
                }
            };

            return this.AppsModel.findByIdAndUpdate(appId, updateOper).then(() => {
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
