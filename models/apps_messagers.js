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
    AppsMessagersModel.prototype.replace = function(appId, msgerId, messager, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                AppsMessagersModel.prototype._schema((initMessager) => {
                    var messager = Object.assign(initMessager, messager);
                    resolve(messager);
                });
            });
        }).then((messager) => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).update(messager);
        }).then(() => {
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value');
        }).then((snap) => {
            var messager = snap.val();
            callback(messager);
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