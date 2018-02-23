module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    const CHAT_COUNT_INTERVAL_TIME = 900000;
    const CHATSHIER = 'CHATSHIER';

    function AppsMessagersModel() {}

    /**
     * 初始化Messager的資訊
     *
     * @param {Function} callback
     */
    AppsMessagersModel._schema = function(callback) {
        var json = {
            name: '',
            photo: '',
            age: '',
            gender: '',
            phone: '',
            assigned: '',
            email: '',
            remark: '',
            firstChat: Date.now(),
            recentChat: Date.now(),
            avgChat: 0,
            totalChat: 0,
            chatTimeCount: 0,
            unRead: 0,
            chatroom_id: '',
            custom_tags: '',
            isDeleted: 0
        };
        callback(json);
    };

    /**
     * 取得所有 App 及其所有 Messager
     *
     * @param {string|string[]} appIds
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findAppMessagers = function(appIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appIds) {
                return;
            }

            let messagersData = {};
            if (appIds instanceof Array) {
                // 每個 messager 的清單取得後，依照 appId 的鍵值塞到對應的欄位
                return Promise.all(appIds.map((appId) => {
                    return admin.database().ref('apps/' + appId + '/messagers').once('value').then((snap) => {
                        if (!snap) {
                            messagersData[appId] = {};
                            return;
                        }
                        let messagers = snap.val() || {};
                        messagersData[appId] = {
                            messagers: messagers
                        };
                    });
                })).then(() => {
                    // 同時發送所有查找請求，所有請求處理完畢後再將對應表往下傳
                    return messagersData;
                });
            } else if ('string' === typeof appIds) {
                let appId = appIds;
                return admin.database().ref('apps/' + appId + '/messagers').once('value').then((snap) => {
                    if (!snap) {
                        messagersData[appId] = {};
                        return;
                    }
                    let messagers = snap.val() || {};
                    messagersData[appId] = {
                        messagers: messagers
                    };
                    return messagersData;
                });
            }
            // return messagersData;
        }).then((result) => {
            if (!result) {
                callback(null);
                return;
            }
            callback(result);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據app ID跟message ID找到messager
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {(appMessager: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsMessagersModel.prototype.findMessager = function(appId, msgerId, callback) {
        return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value').then((snap) => {
            if (!snap) {
                return Promise.reject(new Error());
            }

            let messager = snap.val() || {};
            let appMessager = {
                [appId]: {
                    messagers: {
                        [msgerId]: messager
                    }
                }
            };
            ('function' === typeof callback) && callback(appMessager);
            return appMessager;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * 更新Messager的資料
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {any} messager
     * @param {(updatedMessager: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsMessagersModel.prototype.replaceMessager = function(appId, msgerId, messager, callback) {
        let proceed = Promise.resolve();
        return proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value');
        }).then((snap) => {
            let messagerInDB = snap.val() || {};

            // messagerInDB 裡沒有 chatroom_id 代表之前無資料，視同為新增資料
            if (!messagerInDB.chatroom_id) {
                return Promise.resolve().then(() => {
                    if (messager.chatroom_id) {
                        return messager.chatroom_id;
                    }

                    let newChatroom = {
                        createdTime: Date.now()
                    };
                    return admin.database().ref('apps/' + appId + '/chatrooms').push(newChatroom).then((ref) => {
                        let chatroomId = ref.key;
                        return chatroomId;
                    });
                }).then((chatroomId) => {
                    return new Promise((resolve) => {
                        // 將欲更新的的 messager 的資料與初始化的 schema 合併，作為新增的資料
                        AppsMessagersModel._schema((initMessager) => {
                            messagerInDB.chatroom_id = chatroomId;
                            messagerInDB = Object.assign(initMessager, messagerInDB, messager);
                            resolve(messagerInDB);
                        });
                    });
                });
            };

            // 防止 unRead 不是數字型態無法加總
            if ('number' !== typeof messager.unRead || isNaN(parseInt(messager.unRead))) {
                messager.unRead = 0;
            }
            messager.unRead += (messagerInDB.unRead || 0); // 計算未讀訊息

            let currentTime = Date.now();
            if (messagerInDB.recentChat) {
                let lastChatedTimeGap = currentTime - parseInt(messagerInDB.recentChat);
                if (CHAT_COUNT_INTERVAL_TIME <= lastChatedTimeGap) {
                    messagerInDB.chatTimeCount++;
                }
            }
            messager.recentChat = currentTime;
            return Object.assign(messagerInDB, messager); // 將欲更新的資料與資料庫內的資料合併
        }).then((messager) => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).update(messager).then(() => {
                return messager;
            });
        }).then((result) => {
            ('function' === typeof callback) && callback(result);
            return result;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * 根據app ID跟messager ID找到chatroom ID
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findChatroomIdByAppIdByMessagerId = function(appId, msgerId, callback) {
        admin.database().ref('apps/' + appId + '/messagers/' + msgerId + '/chatroom_id').once('value').then((snap) => {
            let chatroomId = snap.val();
            if (null === chatroomId || undefined === chatroomId || '' === chatroomId) {
                callback(null);
                return;
            }
            callback(chatroomId);
        });
    };

    /**
     * 刪除指定的 messager 資料 (只限內部聊天室 App)
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {(messager: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsMessagersModel.prototype.deleteMessager = function(appId, msgerId, callback) {
        return admin.database().ref('apps/' + appId).once('value').then((snap) => {
            let app = snap.val() || {};
            let messagers = app.messagers || {};

            // messager 存在以及 app 是 CHATSHIER 內部聊天室才處理
            if (!(CHATSHIER === app.type && messagers[msgerId])) {
                return Promise.reject(new Error());
            }

            let messager = messagers[msgerId];
            messager.isDeleted = 1;
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).update(messager).then(() => {
                return messager;
            });
        }).then((messager) => {
            ('function' === typeof callback) && callback(messager);
            return messager;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    return new AppsMessagersModel();
})();