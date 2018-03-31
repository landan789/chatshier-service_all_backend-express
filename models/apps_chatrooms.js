module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$chatrooms' // 只針對 chatrooms document 處理
    };

    const docOutput = {
        $project: {
            // 篩選不需要的項目
            chatrooms: true
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
                    Object.assign(output[app._id].chatrooms, this.toObject(app.chatrooms));
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
