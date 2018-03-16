module.exports = (function() {
    const admin = require('firebase-admin');
    const SCHEMA = require('../config/schema');

    function AppsChatroomsMessages() {}

    /**
     * 根據 App ID 清單，取得對應的所有 appsChatroomsMessags
     *
     * @param {string|string[]} appIds
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.find = function(appIds, callback) {
        let appsChatroomsMessages = {};

        Promise.resolve().then(() => {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            };

            // 準備批次查詢的 promise 工作，將結果依照 appId 的鍵值塞到對應的欄位
            return Promise.all(appIds.map((appId) => {
                return admin.database().ref('apps/' + appId + '/chatrooms/').once('value').then((snap) => {
                    let chatrooms = snap.val() || {};
                    if (!chatrooms) {
                        return Promise.resolve(null);
                    }

                    // 根據查詢路徑建立回傳的資料結構
                    appsChatroomsMessages[appId] = {
                        chatrooms: chatrooms
                    };
                    return Promise.resolve(null);
                });
            }));
        }).then(() => {
            callback(appsChatroomsMessages || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 存多筆訊息
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {Object[]|Object} messages
     * @param {(newMessage: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsMessages.prototype.insertMessages = function(appId, chatroomId, messages, callback) {
        if (!(messages instanceof Array)) {
            messages = [messages];
        };
        let _messages = {};
        return Promise.all(messages.map((message) => {
            let _message = {
                eventType: message.eventType || '',
                from: message.from,
                messager_id: message.messager_id,
                text: message.text || '' || message.altText + '<br>' + '請至智慧手機上確認訊息內容。',
                time: Date.now(),
                type: message.type,
                src: message.src || ''
            };
            let __message = Object.assign({}, SCHEMA.APP_CHATROOM_MESSAGE, _message);
            return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push(__message).then((ref) => {
                let messageId = ref.key;
                return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages/' + messageId).once('value');
            }).then((snap) => {
                let message = snap.val();
                let messageId = snap.key;
                _messages[messageId] = message;
                return Promise.resolve();
            });
        })).then(() => {
            ('function' === typeof callback) && callback(_messages);
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
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
