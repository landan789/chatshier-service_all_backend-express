var admin = require("firebase-admin"); //firebase admin SDK
var appsMessagersChats = {}; // 宣告物件因為module需要物件

appsMessagersChats._schema = (callback) => {
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

appsMessagersChats.insertChatroomMessage = (appId,crId,msgObj,callback) => {
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            let messengeKey = admin.database().ref('apps/' + appId + '/chatrooms/' + crId + '/messenges').push().key;
            resolve({messengeKey});
        });
    }).then((data) => {
        let messengeKey = data.messengeKey;
        return admin.database().ref('apps/' + appId + '/chatrooms/' + crId + '/messenges/' + messengeKey).update(msgObj);
    }).then(() => {
        let messengerId = crId;
        return admin.database().ref('apps/' + appId + '/chatrooms/' + crId + '/messengers/' + messengerId ).update({name: msgObj.name});
    }).then(() => {
        callback();
    }).catch(() => {
        callback(false);
    });
}

appsMessagersChats.updateMessengerInfo = (appId,msgId,msgObj,callback) => {    
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve,reject) => {
            admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).once('value', snap => {
                let messenger = snap.val();
                resolve(messenger);
            });
        });
    }).then((data) => {
        let messenger = data;
        return new Promise((resolve,reject) => {
            appsMessagersChats._schema((initApp) => {
                resolve({messenger,initApp});
            });
        });
    }).then((data) => {
        let messenger = data.messenger;
        let initApp = data.initApp;
        if(null === messenger.name || undefined === messenger.name || '' === messenger.name) { // 新客戶
            let createApp = Object.assign(initApp,msgObj);
            return admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).update(createApp);
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
            // let d = new Date(newApp.firstChat);
            // let firstTime = d.getTime();
            // let totalChatTime = (nowTime + 28800000) - firstTime;
            // newApp.totalChat = getTotalMin(totalChatTime);
            // console.log(newApp);
            return admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).update(newApp);
        }
    }).then(() => {
        admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).once('value', (snap) => {
            let chatrooms = snap.val();
            if(null === chatrooms || undefined === chatrooms || '' === chatrooms) {
                callback(false);
                return;
            }
            callback(chatrooms);
        });
    }).catch(() => {
        callback(false);
    });
}

appsMessagersChats.updateUnreadStatus = (appId, msgId) => {
    admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).update({unRead: 0});
}

appsMessagersChats.findByUserId = (userId, callback) => {
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
        appsMessagersChats.findByAppIds(appIds, (data) => {
            var appsMessengers = data;
            callback(appsMessengers);
        });
    }).catch((ERROR) => {
        callback(false);
    });
}

appsMessagersChats.findByAppIds = (appIds, callback) => {
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

                        var value = app.chatrooms;
                        if (undefined === app.chatrooms || !app.hasOwnProperty('chatrooms') || 0 === Object.values(app.chatrooms).length) {
                            value = Object.assign({});
                        }
                        appsMessengers[appId] = {
                            chatrooms: value
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

appsMessagersChats.findAppByWebhookId = (webhookId,callback) => {
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

module.exports = appsMessagersChats;