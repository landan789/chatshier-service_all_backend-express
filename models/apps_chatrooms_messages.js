var admin = require('firebase-admin'); // firebase admin SDK
var appsChatroomsMessages = {};

appsChatroomsMessages.findByUserId = (userId, callback) => {
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
        appsChatroomsMessages.findByAppIds(appIds, (data) => {
            var appsMessengers = data;
            callback(appsMessengers);
        });
    }).catch((ERROR) => {
        callback(false);
    });
};

appsChatroomsMessages.findByAppIdAndMessageId = (appId, msgId, callback) => {
    admin.database().ref('apps/' + appId + '/messagers/' + msgId).once('value', (snap) => {
        let messenger = snap.val();
        if (null === messenger || undefined === messenger || '' === messenger) {
            callback(null);
            return;
        }
        callback(messenger);
    });
};

appsChatroomsMessages.findByAppIds = (appIds, callback) => {
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

                        var value = app.messengers;
                        if (undefined === app.messengers || !app.hasOwnProperty('messagers') || 0 === Object.values(app.messengers).length) {
                            value = Object.assign({});
                        }
                        appsMessengers[appId] = {
                            messengers: value
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

appsChatroomsMessages.findAppByWebhookId = (webhookId, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('webhooks/' + webhookId).once('value', (snap) => {
                let appId = snap.val();
                if (null === appId || undefined === appId || '' === appId) {
                    reject();
                    return;
                }
                resolve(appId);
            });
        });
    }).then((data) => {
        let appId = data;
        callback(appId);
    }).catch(() => {
        callback(false);
    });
};

appsChatroomsMessages.insertChatroomMessage = (appId, msgerId, message, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messagers/' + msgerId + '/chatroom_id').once('value');
    }).then((snap) => {
        let chatroomId = null === snap.val() ? '' : snap.val();
        return new Promise((resolve, reject) => {
            if (null === chatroomId || undefined === chatroomId || '' === chatroomId) {
                let newChatroomId = admin.database().ref('apps/' + appId + '/chatrooms').push().key;
                resolve(newChatroomId);
                return;
            }
            resolve(chatroomId);
        });
    }).then((chatroomId) => {
        return new Promise((resolve, reject) => {
            let chatroomMessageId = admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push().key;
            resolve({chatroomId, chatroomMessageId});
        });
    }).then((data) => {
        let chatroomId = data.chatroomId;
        let messageId = data.chatroomMessageId;
        return new Promise((resolve, reject) => {
            admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages/' + messageId).set(message).then(() => {
                resolve(chatroomId);
            });
        });
    }).then((chatroomId) => {
        callback(chatroomId);
    }).catch(() => {
        callback(false);
    });
}

appsChatroomsMessages.insertReplyMessages = (appId, msgerId, messages, callback) => {
    let proceed = Promise.resolve();

    if (0 === messages.length) {
        callback();
    }

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messagers/' + msgerId + '/chatroom_id').once('value');
    }).then((snap) => {
        let chatroomId = null === snap.val() ? '' : snap.val();
        return new Promise((resolve, reject) => {
            if (null === chatroomId || undefined === chatroomId || '' === chatroomId) {
                let newChatroomId = admin.database().ref('apps/' + appId + '/chatrooms').push().key;
                resolve(newChatroomId);
                return;
            }
            resolve(chatroomId);
        });
    }).then((chatroomId) => {
        appsChatroomsMessages.passMessages(appId, chatroomId, messages, () => {
            callback();
        });
    }).catch(() => {
        callback(false);
    });
};

appsChatroomsMessages.passMessages = (appId, chatroomId, messages, callback) => {
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
            return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push({
                from: 'line',
                text: 'text' === message.type ? message.text : 'show ' + message.type,
                name: 'bot',
                owner: 'agent',
                time: Date.now()
            });
        }).then(() => {
            insertMessage(index + 1, cb);
        }).catch(() => {
            cb();
        });
    }
};

module.exports = appsChatroomsMessages;
