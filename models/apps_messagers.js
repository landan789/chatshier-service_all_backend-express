module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsMessagersModel() {}

    /**
     * 取得所有 App 及其所有 Messager
     *
     * @param {string[]} appIds
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findAppMessagersByAppIds = function(appIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appIds || !(appIds instanceof Array)) {
                return;
            }

            let messagersMap = {};
            let findTasks = [];

            // 每個 messager 的清單取得後，依照 appId 的鍵值塞到對應的欄位
            for (let idx in appIds) {
                let appId = appIds[idx];
                findTasks.push(new Promise((resolve, reject) => {
                    admin.database().ref('apps/' + appId + '/messagers').on('value', (data) => {
                        if (!data) {
                            messagersMap[appId] = [];
                            resolve();
                            return;
                        }
                        let messagers = data.val();
                        messagersMap[appId] = messagers;
                        resolve();
                    });
                }));
            }

            // 同時發送所有查找請求，所有請求處理完畢後再將對應表往下傳
            return Promise.all(findTasks).then(() => {
                return messagersMap;
            });
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
     * 指定 AppId 取得所有 Messager
     *
     * @param {string} appId
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findAppMessagersByAppId = function(appId, callback) {
        admin.database().ref('apps/' + appId + '/messagers').on('value', (data) => {
            if (!data) {
                callback();
                return;
            }
            let messagers = data.val();
            callback(messagers);
        });
    };

    /**
     * 根據app ID跟message ID找到messager
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findByAppIdAndMessageId = function(appId, msgerId, callback) {
        admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value', (snap) => {
            let messager = snap.val();
            if (null === messager || undefined === messager || '' === messager) {
                callback(null);
                return;
            }
            callback(messager);
        });
    };

    /**
     * 初始化Messager的資訊
     *
     * @param {Function} callback
     */
    AppsMessagersModel.prototype._schema = function(callback) {
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
     * 更新Messager的資料
     *
     * @param {string} appId
     * @param {string} msgerId
     * @param {string} chatroomId
     * @param {string} name
     * @param {string} picUrl
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.updateMessenger = function(appId, msgerId, chatroomId, name, picUrl, callback) {
        let proceed = Promise.resolve();

        proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value');
        }).then((snap) => {
            let messenger = snap.val();
            return new Promise((resolve, reject) => {
                if (null === messenger || undefined === messenger || '' === messenger) {
                    resolve(null);
                    return;
                }
                resolve(messenger);
            });
        }).then((messenger) => {
            return new Promise((resolve, reject) => {
                AppsMessagersModel.prototype._schema((initApp) => {
                    if (null === messenger || undefined === messenger || '' === messenger) {
                        initApp.name = name;
                        initApp.picUrl = picUrl;
                        initApp.chatroom_id = chatroomId;
                        resolve({initApp});
                        return;
                    }
                    resolve({messenger, initApp});
                });
            });
        }).then((data) => {
            let messenger = data.messenger;
            let initApp = data.initApp;
            if (null === messenger || undefined === messenger || '' === messenger) { // 新客戶
                return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).set(initApp);
            } else { // 舊客戶
                let nowTime = Date.now();
                let newApp = Object.assign(initApp, messenger);
                // 儲存最後聊天時間
                newApp.recentChat = nowTime;
                // 超過15分鐘聊天次數就多一次
                let count = 900000 <= (nowTime - newApp.recentChat) ? newApp.chatTimeCount++ : newApp.chatTimeCount;
                newApp.totalChat = count;
                // 訊息進線就多一筆未讀訊息
                newApp.unRead++;
                // 計算總聊天時間
                return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).update(newApp);
            }
        }).then(() => {
            callback();
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
