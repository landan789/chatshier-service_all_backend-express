module.exports = (function() {
    const admin = require('firebase-admin');

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
            if (!appIds || !(appIds instanceof Array)) {
                return;
            }
            let appsChatroomsMap = {};
            let findTasks = [];

            // 準備批次查詢的 promise 工作，將結果依照 appId 的鍵值塞到對應的欄位
            for (let idx in appIds) {
                let appId = appIds[idx];

                // 根據查詢路徑建立回傳的資料結構
                if (!appsChatroomsMap[appId]) {
                    appsChatroomsMap[appId] = {
                        chatrooms: {}
                    };
                }

                findTasks.push(new Promise((resolve, reject) => {
                    admin.database().ref('apps/' + appId + '/chatrooms/').once('value', (snap) => {
                        if (!snap) {
                            resolve();
                            return;
                        }

                        let chatroomsData = snap.val() || {};
                        appsChatroomsMap[appId].chatrooms = chatroomsData;
                        resolve();
                    });
                }));
            }

            // 最後的資料結構型式:
            // {
            //   ($appId)
            //   ($appId)
            //     ⌞chatrooms
            //       ⌞($chatroomId)
            //       ⌞($chatroomId)
            // }
            return Promise.all(findTasks).then(() => {
                return appsChatroomsMap;
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
     * 根據app ID跟messager ID去修改客戶未讀訊息
     *
     * @param {string} appId
     * @param {string} msgId
     */
    AppsChatroomsMessages.prototype.updateUnreadStatus = function(appId, msgId) {
        admin.database().ref('apps/' + appId + '/messagers/' + msgId).update({unRead: 0});
    };

    /**
     * 內部功能 儲存訊息 有遞迴的功能
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {Array} messages
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype._passMessages = function(appId, chatroomId, messages, callback) {
        insertMessage(0, callback);
        function insertMessage(index, cb) {
            let proceed = Promise.resolve();
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (index >= messages.length) {
                        reject();
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                let message = messages[index];
                let msg = {
                    from: 'line',
                    text: 'text' === message.type ? message.text : 'show ' + message.type,
                    name: 'bot',
                    owner: 'agent',
                    time: Date.now()
                };
                return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push(msg);
            }).then(() => {
                insertMessage(index + 1, cb);
            }).catch(() => {
                cb();
            });
        }
    };

    /**
     * 儲存訊息 使用內部功能_passMessages
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {Array} messages
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.insertReplyMessages = function(appId, chatroomId, messages, callback) {
        let proceed = Promise.resolve();
        if (0 === messages.length) {
            callback();
            return;
        }
        proceed.then(() => {
            AppsChatroomsMessages._passMessages(appId, chatroomId, messages, () => {
                callback();
            });
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 存單一訊息
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {Object} message
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.insertChatroomMessage = function(appId, chatroomId, message, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                let chatroomMessageId = admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push().key;
                resolve(chatroomMessageId);
            });
        }).then((chatroomMessageId) => {
            return new Promise((resolve, reject) => {
                admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages/' + chatroomMessageId).set(message).then(() => {
                    resolve(chatroomId);
                });
            });
        }).then((chatroomId) => {
            callback(chatroomId);
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
                        reject();
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var appIds = user.app_ids;
            AppsChatroomsMessages.prototype.findByAppIds(appIds, (data) => {
                var appsMessengers = data;
                callback(appsMessengers);
            });
        }).catch((ERROR) => {
            callback(false);
        });
    };

    /**
     * 根據App ID, Chatroom ID, Message ID找到 Message 資訊
     *
     * @param {string} appId
     * @param {string} chatroomId
     * @param {string} messageId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findByAppIdByChatroomIdByMessageId = function(appId, chatroomId, callback) {
        let address = 'apps/' + appId + '/chatrooms/' + chatroomId + '/messages';
        admin.database().ref(address).once('value').then((snap) => {
            let message = snap.val();
            if (null === message || undefined === message || '' === message) {
                callback(null);
                return;
            }
            callback(message);
        });
    };

    /**
     * 根據 App ID 找到message物件
     *
     * @param {string} appIds
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findByAppIds = function(appIds, callback) {
        var appsMessengers = {};
        next(0, callback);

        function next(i, cb) {
            var procced = new Promise((resolve, reject) => {
                resolve();
            });

            procced
                .then(() => {
                    return new Promise((resolve, reject) => {
                        if (i >= appIds.length) {
                            reject(appsMessengers);
                            return;
                        }
                        resolve();
                    });
                }).then(() => {
                    return new Promise((resolve, reject) => {
                        var appId = appIds[i];
                        admin.database().ref('apps/' + appId).once('value', snap => {
                            var app = snap.val();

                            var messagers = app.messagers;
                            var chatrooms = app.chatrooms;
                            if (undefined === app.chatrooms || !app.hasOwnProperty('chatrooms') || 0 === Object.values(app.chatrooms).length) {
                                chatrooms = Object.assign({});
                                messagers = Object.assign({});
                            }
                            appsMessengers[appId] = {
                                messagers,
                                chatrooms
                            };

                            resolve();
                        });
                    });
                }).then(() => {
                    next(i + 1, cb);
                })
                .catch(() => {
                    cb(appsMessengers);
                });
        }
    };

    return new AppsChatroomsMessages();
})();
