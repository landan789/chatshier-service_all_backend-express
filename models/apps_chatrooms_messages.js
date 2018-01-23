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
            })
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
    admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).on('value', (snap) => {
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
                        if (undefined === app.messengers || !app.hasOwnProperty('messengers') || 0 === Object.values(app.messengers).length) {
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

appsChatroomsMessages.insertChatroomMessage = (appId, msgId, msgObj, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/chatrooms/' + msgId + '/messages').push(msgObj);
    }).then(() => {
        callback();
    }).catch(() => {
        callback(false);
    });
};

module.exports = appsChatroomsMessages;
