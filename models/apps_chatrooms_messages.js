module.exports = (function() {
    const admin = require('firebase-admin');
    const SCHEMA = require('../config/schema');

    function AppsChatroomsMessages() {}

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
                text: message.text || (message.altText ? message.altText + '\n' : '') + '請至智慧手機上確認訊息內容。',
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
     * 根據App ID, Chatroom ID, Message ID找到 AppsChatroomsMessages 資訊
     *
     * @param {string[]|string} appIds
     * @param {string} chatroomId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.find = function(appIds, chatroomId, callback) {

        if ('string' === typeof appIds) {
            appIds = [appIds];
        }
        let appsChatroomsMessages = {};
        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/chatrooms/').once('value').then((snap) => {
                let chatrooms = snap.val();
                if (!chatrooms) {
                    return Promise.reject(new Error());
                }
                if (!chatroomId) {
                    appsChatroomsMessages[appId] = {
                        chatrooms: chatrooms
                    };
                    return Promise.resolve(null);
                }

                if (chatroomId && chatrooms[chatroomId]) {
                    let chatroom = chatrooms[chatroomId];
                    appsChatroomsMessages[appId] = {
                        chatrooms: {
                            [chatroomId]: chatroom
                        }
                    };
                    return Promise.resolve(null);
                }
                
            });
        })).then((appsChatroomsMessages) => {
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
    let instance = new AppsChatroomsMessages();
    return instance;
})();
