module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsChatroomsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string|string[]} appIds
         * @param {any|null} chatroomIds
         * @param {(appsChatrooms: any) => any} [callback]
         * @returns {Promise<any>}
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

                    Object.assign(output[app._id].chatrooms[app.chatrooms._id].messagers, this.toObject(app.chatrooms.messagers));
                    Object.assign(output[app._id].chatrooms[app.chatrooms._id].messages, this.toObject(app.chatrooms.messages));
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
