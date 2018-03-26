module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';
    const CHAT_COUNT_INTERVAL_TIME = 900000;

    const docUnwind = {
        $unwind: '$messagers' // 只針對 document 處理
    };

    const docOutput = {
        $project: {
            // 篩選需要的項目
            messagers: 1
        }
    };

    class AppsMessagersModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string|string[]} appIds
         * @param {string} messagerId
         * @param {(appsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        find(appIds, messagerId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false
            };
            if (messagerId) {
                query['messagers._id'] = this.Types.ObjectId(messagerId);
                query['messagers.isDeleted'] = false;
            }

            let aggregations = [
                docUnwind,
                {
                    $match: query
                },
                docOutput
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsMessagers = {};
                if (0 === results.length) {
                    return appsMessagers;
                }

                appsMessagers = results.reduce((output, curr) => {
                    output[curr._id] = output[curr._id] || { messagers: {} };
                    Object.assign(output[curr._id].messagers, this.toObject(curr.messagers));
                    return output;
                }, {});

                return appsMessagers;
            }).then((appsMessagers) => {
                ('function' === typeof callback) && callback(appsMessagers);
                return appsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 根據 messagerId 找到 chatroom_id
         *
         * @param {string} appId
         * @param {string} messagerId
         * @param {(chatroomId: string|null) => any} [callback]
         * @returns {Promise<string>}
         */
        findMessagerChatroomId(appId, messagerId, callback) {
            return this.find(appId, messagerId).then((appsMessagers) => {
                let messager = appsMessagers[appId].messagers[messagerId];
                return messager.chatroom_id;
            }).then((chatroomId) => {
                ('function' === typeof callback) && callback(chatroomId);
                return chatroomId;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} messagerId
         * @param {any} messager
         * @param {(appsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        replaceMessager(appId, messagerId, messager, callback) {
            let isExist = false;

            return this.find(appId, messagerId).then((appsMessagers) => {
                if (!appsMessagers) {
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
                        messager.chatroom_id = chatroomId;
                        return messager;
                    });
                }

                isExist = true;
                let _messager = appsMessagers[appId].messagers[messagerId];
                let currentTime = Date.now();
                if (_messager.recentChat) {
                    let lastChatedTimeGap = currentTime - parseInt(_messager.recentChat);
                    if (CHAT_COUNT_INTERVAL_TIME <= lastChatedTimeGap) {
                        _messager.chatTimeCount++;
                    }
                }
                _messager.recentChat = currentTime;
                return Object.assign(_messager, messager);
            }).then((_messager) => {
                !isExist && (_messager.createdTime = Date.now());
                _messager.updatedTime = Date.now();
                _messager._id = this.Types.ObjectId(messagerId);

                let query = {
                    '_id': appId,
                    'messagers._id': messagerId
                };
                !isExist && delete query['messagers._id'];

                let updateOper = { $set: {} };
                for (let prop in _messager) {
                    updateOper.$set['messagers.$.' + prop] = _messager[prop];
                }

                let options = {
                    upsert: true
                };

                return this.AppsModel.update(query, updateOper, options);
            }).then(() => {
                return this.find(appId, messagerId);
            }).then((appsMessagers) => {
                ('function' === typeof callback) && callback(appsMessagers);
                return appsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 刪除指定的 messager 資料 (只限內部聊天室 App)
         *
         * @param {string} appId
         * @param {string} messagerId
         * @param {(appsMessagers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        remove(appId, messagerId, callback) {
            let messager = {
                _id: this.Types.ObjectId(messagerId),
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': appId,
                'messagers._id': messagerId
            };

            let updateOper = { $set: {} };
            for (let prop in messager) {
                updateOper.$set['messagers.$.' + prop] = messager[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, messagerId);
            }).then((appsMessagers) => {
                ('function' === typeof callback) && callback(appsMessagers);
                return appsMessagers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsMessagersModel();
})();
