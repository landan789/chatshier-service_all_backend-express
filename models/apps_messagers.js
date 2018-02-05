module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

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
            telephone: '',
            assigned: '',
            email: '',
            remark: '',
            firstChat: Date.now(),
            recentChat: Date.now(),
            avgChat: 1,
            totalChat: 1,
            chatTimeCount: 1,
            unRead: 1,
            chatroom_id: ''
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
                        messagersData[appId] = messagers;
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
                    messagersData[appId] = messagers;
                });
            }
            return messagersData;
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
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findMessager = function(appId, msgerId, callback) {
        admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value', (snap) => {
            let messager = snap.val();
            if (!messager) {
                callback(null);
                return;
            }
            callback(messager);
        });
    };

    /**
     * 更新Messager的資料
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {any} messager
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.updateMessager = function(appId, msgerId, messager, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value');
        }).then((snap) => {
            let messagerInDB = snap.val() || {};

            // messagerInDB 裡沒有 chatroom_id 代表之前無資料，視同為新增資料
            if (!messagerInDB.chatroom_id) {
                let chatroomsRef = admin.database().ref('apps/' + appId + '/chatrooms').push();
                let chatroomId = chatroomsRef.key;

                return chatroomsRef.then(() => {
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
            return Object.assign(messagerInDB, messager);
        }).then((messager) => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).update(messager).then(() => {
                return messager;
            });
        }).then((result) => {
            callback(result);
        }).catch(() => {
            callback(null);
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

    return new AppsMessagersModel();
})();
