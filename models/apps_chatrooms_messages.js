module.exports = (function() {
    const admin = require('firebase-admin');
    const SCHEMA = require('../config/schema');

    function AppsChatroomsMessages() {}

    /**
     * 根據 App ID 清單，取得對應的所有聊天室訊息
     *
     * @param {string[]} appIds
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findChatroomMessagesByAppIds = function(appIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            let appsChatroomsData = {};
            if (!(appIds instanceof Array)) {
                return appsChatroomsData;
            }

            // 準備批次查詢的 promise 工作，將結果依照 appId 的鍵值塞到對應的欄位
            return Promise.all(appIds.map((appId) => {
                return admin.database().ref('apps/' + appId + '/chatrooms/').once('value').then((snap) => {
                    if (!snap) {
                        return;
                    }

                    // 根據查詢路徑建立回傳的資料結構
                    let chatroomsData = snap.val() || {};
                    appsChatroomsData[appId] = {
                        chatrooms: chatroomsData
                    };
                });
            })).then(() => {
                // 最後的資料結構型式:
                // {
                //   ($appId)
                //   ($appId)
                //     ⌞chatrooms
                //       ⌞($chatroomId)
                //       ⌞($chatroomId)
                // }
                return appsChatroomsData;
            });
        }).then((result) => {
            callback(result || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據指定的 App ID，取得對應的所有聊天室訊息
     *
     * @param {string} appId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findChatroomMessagesByAppId = function(appId, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appId) {
                return;
            }

            // 根據查詢路徑建立回傳的資料結構
            let appsChatroomsMap = {
                [appId]: {
                    chatrooms: {}
                }
            };

            return new Promise((resolve) => {
                admin.database().ref('apps/' + appId + '/chatrooms/').once('value', (snap) => {
                    if (!snap) {
                        resolve(appsChatroomsMap);
                        return;
                    }

                    let chatroomsData = snap.val() || {};
                    appsChatroomsMap[appId].chatrooms = chatroomsData;
                    resolve(appsChatroomsMap);
                });
            });
        }).then((result) => {
            callback(result || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 存單一訊息
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {any} message
     * @param {(newMessage: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsMessages.prototype.insertMessage = function(appId, chatroomId, message, callback) {
        let _message;
        return Promise.resolve().then(() => {
            _message = Object.assign(SCHEMA.APP_CHATROOM_MESSAGE, message);
            return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push(_message);
        }).then((ref) => {
            return Promise.resolve(_message);
        }).then((_message) => {
            ('function' === typeof callback) && callback(_message);
            return Promise.resolve(_message);
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return Promise.resolve(null);
        });
    };

    /**
     * webhook 打入時候，儲存訊息
     * @param {string} appId
     * @param {string} messagerId
     * @param {Object} message
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.insertMessageByAppIdByMessagerId = function(appId, messagerId, message, callback) {
        admin.database().ref('apps/' + appId + '/messagers/' + messagerId).once('value').then((snap) => {
            var messager = snap.val();
            return Promise.resolve(messager);
        }).then((messager) => {
            var chatroomId = messager.chatroom_id;
            if ('' === chatroomId || null === chatroomId || undefined === chatroomId) {
                var chatroom = {
                    messages: {}
                };
                return admin.database().ref('apps/' + appId + '/chatrooms/').push(chatroom).then((ref) => {
                    chatroomId = ref.key;
                    return Promise.resolve(chatroomId);
                });
            }
            return Promise.resolve(chatroomId);
        }).then((chatroomId) => {
            return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push(message);
        }).then((ref) => {
            var chatroomId = ref.parent.parent.key;
            var messager = {
                chatroom_id: chatroomId
            };
            return admin.database().ref('apps/' + appId + '/messagers/' + messagerId).update(messager);
        }).then(() => {
            callback(message);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 user ID 找到chatroom message資訊
     *
     * @param {string} userId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findByUserId = function(userId, callback) {
        var procced = new Promise((resolve, reject) => {
            resolve();
        });
        procced.then(() => {
            return new Promise((resolve, reject) => {
                admin.database().ref('users/' + userId).once('value', snap => {
                    var user = snap.val();
                    if (null === user || undefined === user || '' === user) {
                        reject(new Error());
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var appIds = user.app_ids;
            instance.findByAppIds(appIds, (data) => {
                var appsMessagers = data;
                callback(appsMessagers);
            });
        }).catch((ERROR) => {
            callback(false);
        });
    };

    /**
     * 根據App ID, Chatroom ID, Message ID找到 AppsChatroomsMessages 資訊
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findAppsChatroomsMessages = function(appId, chatroomId, callback) {
        admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').once('value').then((snap) => {
            let messages = snap.val();
            if (null === messages || undefined === messages || '' === messages) {
                return Promise.reject(new Error());
            }
            var appsChatroomsMessages = {};
            var chatroomsMessages = {};
            chatroomsMessages[chatroomId] = {
                messages: messages
            };
            appsChatroomsMessages[appId] = {
                chatrooms: chatroomsMessages
            };
            return Promise.resolve(appsChatroomsMessages);
        }).then((appsChatroomsMessages) => {
            callback(appsChatroomsMessages);
        }).catch(() => {
            callback(null);
        });
    };
    /**
     * 根據App ID, Chatroom ID, Message ID找到 Message 資訊
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findMessages = function(appId, chatroomId, callback) {
        admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').once('value').then((snap) => {
            let messages = snap.val();
            if (null === messages || undefined === messages || '' === messages) {
                return Promise.reject(new Error());
            }
            return Promise.resolve(messages);
        }).then((messages) => {
            callback(messages);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 App ID 找到message物件
     *
     * @param {string[]} appIds
     * @param {(appsMessengers: any) => any} callback
     */
    AppsChatroomsMessages.prototype.findByAppIds = function(appIds, callback) {
        var appsMessengers = {};
        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId).once('value').then((snap) => {
                var app = snap.val() || {};
                var messagers = app.messagers || {};
                var chatrooms = app.chatrooms || {};
                appsMessengers[appId] = { messagers, chatrooms };
            });
        })).then(() => {
            callback(appsMessengers);
        }).catch(() => {
            callback(null);
        });
    };

    let instance = new AppsChatroomsMessages();
    return instance;
})();
