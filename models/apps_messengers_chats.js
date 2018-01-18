var admin = require("firebase-admin"); //firebase admin SDK
var appsMessengersChats = {}; // 宣告物件因為module需要物件

appsMessengersChats._schema = (callback) => {
    var json = {
        name: "",
        photo: "",
        age: "",
        telephone: "",
        assigned: "",
        email: "",
        remark: "",
        firstChat: Date.now(),
        recentChat: "",
        avgChat: 0,
        totalChat: 0,
        chatTimeCount: 0,
        unRead: 0
    };
    callback(json);
};

appsMessengersChats.insertMessengerChats = (appId,msgId,msgObj,callback) => {
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messengers/' + msgId + '/chats/').push(msgObj);
    }).then(() => {
        callback();
    }).catch(() => {
        callback(false);
    });
}

appsMessengersChats.updateMessenger = (appId,msgId,msgObj,callback) => {    
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve,reject) => {
            admin.database().ref('apps/' + appId + '/messengers/' + msgId).once('value', snap => {
                let messenger = snap.val();
                resolve(messenger);
            });
        });
    }).then((data) => {
        let messenger = data;
        return new Promise((resolve,reject) => {
            appsMessengersChats._schema((initApp) => {
                resolve({messenger,initApp});
            });
        });
    }).then((data) => {
        let messenger = data.messenger;
        let initApp = data.initApp;
        if(null === messenger.name || undefined === messenger.name || '' === messenger.name) { // 新客戶
            let createApp = Object.assign(initApp,msgObj);
            return admin.database().ref('apps/' + appId + '/messengers/' + msgId).update(createApp);
        } else { // 舊客戶
            let nowTime = Date.now();
            console.log(new Date(nowTime + 28800000));
            let newApp = Object.assign(initApp, messenger);
            // 儲存最後聊天時間
            initApp.recentChat = nowTime;
            // 超過15分鐘聊天次數就多一次
            let count =  nowTime - newApp.recentChat >= 900000 ? newApp.chatTimeCount++ : newApp.chatTimeCount; 
            newApp.totalChat = count;
            // 訊息進線就多一筆未讀訊息
            newApp.unRead++;
            // 計算總聊天時間 
            let d = new Date(newApp.firstChat);
            let firstTime = d.getTime();
            let totalChatTime = (nowTime + 28800000) - firstTime;
            newApp.totalChat = getTotalMin(totalChatTime);
            // console.log(newApp);
            return admin.database().ref('apps/' + appId + '/messengers/' + msgId).update(newApp);
        }
    }).then(() => {
        admin.database().ref('apps/' + appId + '/messengers/' + msgId).once('value', (snap) => {
            let messengers = snap.val();
            if(null === messengers || undefined === messengers || '' === messengers) {
                callback(false);
                return;
            }
            callback(messengers);
        });
    }).catch(() => {
        callback(false);
    });
}

appsMessengersChats.updateUnreadStatus = (appId, msgId) => {
    admin.database().ref('apps/' + appId + '/messengers/' + msgId).update({unRead: 0});
}

appsMessengersChats.findByUserId = (userId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId).once("value", snap => {
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
        appsMessengersChats.findByAppIds(appIds, (data) => {
            var appsMessengers = data;
            callback(appsMessengers);
        });
    }).catch((ERROR) => {
        callback(false);
    });
}

appsMessengersChats.findByAppIds = (appIds, callback) => {
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
                    admin.database().ref("apps/" + appId).once("value", snap => {
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
}

appsMessengersChats.findAppByWebhookId = (webhookId,callback) => {
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve,reject) => {
            admin.database().ref('webhooks/' + webhookId).once('value', (snap) => {
                let appId = snap.val();
                if(null === appId || undefined === appId || '' === appId) {
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
}

appsMessengersChats.findByWebhookId = (webhookId,callback) => {
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve,reject) => {
                admin.database().ref('webhooks/' + webhookId).once('value', (snap) => {
                    let appId = snap.val();
                    if(null === appId || undefined === appId || '' === appId) {
                        reject();
                        return;
                    }
                    resolve(appId);
                });
            });
        })
        .then((data) => {
            let appId = data;
            callback(appId);
        })
        .catch(() => {
            callback(false);
        });
}

function getTotalMin(time) {
    var minutes = time / 1000 / 60;
    return minutes;
}

module.exports = appsMessengersChats;