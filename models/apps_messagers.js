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
         * @param {string|null} messagerId
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
                'isDeleted': false,
                'messagers.isDeleted': false
            };
            if (messagerId) {
                query['messagers.platformUid'] = messagerId;
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

                appsMessagers = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { messagers: {} };
                    Object.assign(output[app._id].messagers, this.toObject(app.messagers, 'platformUid'));
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
                if (0 === Object.keys(appsMessagers).length) {
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
                        messager._id = this.Types.ObjectId();
                        messager.chatroom_id = chatroomId;
                        return messager;
                    });
                }

                isExist = true;
                let _messager = appsMessagers[appId].messagers[messagerId];
                let currentTime = Date.now();
                if (_messager.lastTime) {
                    let lastChatedTimeGap = currentTime - parseInt(_messager.lastTime);
                    if (CHAT_COUNT_INTERVAL_TIME <= lastChatedTimeGap) {
                        _messager.chatCount++;
                    }
                }
                _messager.lastTime = currentTime;
                return Object.assign(_messager, messager);
            }).then((_messager) => {
                let query = {
                    '_id': appId
                };

                _messager.updatedTime = Date.now();
                _messager.platformUid = messagerId;
                let updateOper = {};
                if (isExist) {
                    query['messagers._id'] = _messager._id;
                    query['messagers.platformUid'] = messagerId;

                    updateOper.$set = {};
                    for (let prop in _messager) {
                        updateOper.$set['messagers.$.' + prop] = _messager[prop];
                    }
                } else {
                    _messager.createdTime = _messager.updatedTime;
                    updateOper.$push = {
                        'messagers': _messager
                    };
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
