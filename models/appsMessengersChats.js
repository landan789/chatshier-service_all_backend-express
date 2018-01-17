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
        firstChat: "",
        recentChat: "",
        avgChat: 0,
        totalChat: 0,
        chatTimeCount: 0,
        unRead: 0
    };
    callback(json);
};
appsMessengersChats.findChatData = callback => {
    admin.database().ref().child('chats/Data').once('value', snapshot => {
        let chatData = snapshot.val();
        callback(chatData);
    });
}
appsMessengersChats.create = obj => {
    admin.database().ref().child('chats/Data').push(obj);
}
appsMessengersChats.update = obj => {
    admin.database().ref().child('chats/Data').update(obj);
}
appsMessengersChats.updateObj = (i, obj) => {
    admin.database().ref().child('chats/Data').child(i).child("Profile").update(obj);
}
appsMessengersChats.insertChats = (appId,msgId,msgObj,callback) => {
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve,reject) => {
                admin.database().ref('apps/' + appId + '/messengers/' + msgId + '/chats').once('value', (snap) => {
                    let chats = snap.val();
                    resolve(chats);
                });
            });
        })
        .then((data) => {
            let chats = data;
            if(null === chats || undefined === chats) {
                admin.database().ref('apps/' + appId + '/messengers/' + msgId + '/chats/0').update(msgObj);
            } else {
                let length = data.length;
                admin.database().ref('apps/' + appId + '/messengers/' + msgId + '/chats/' + length).update(msgObj);
            }
            callback();
        })
        .catch(() => {
            callback(false);
        });
}
appsMessengersChats.insertMessengerInfo = (appId,msgId,infoObj,callback) => {
    let name = infoObj.name;
    let photo = infoObj.photo;
    let recentChat = infoObj.recentChat;
    let nowTime = infoObj.recentChat;
    
    let proceed = new Promise((resolve,reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve,reject) => {
                admin.database().ref('apps/' + appId + '/messengers/' + msgId).once('value', snap => {
                    let messenger = snap.val();
                    resolve(messenger);
                });
            });
        })
        .then((data) => {
            let messenger = data;
            return new Promise((resolve,reject) => {
                appsMessengersChats._schema((initApp) => {
                    resolve({messenger,initApp});
                });
            });
        })
        .then((data) => {
            let messenger = data.messenger;
            let initApp = data.initApp;
            return new Promise((resolve,reject) => {
                if(null === messenger.name || undefined === messenger.name || '' === messenger.name) {
                    let createAoo = initApp;
                    createAoo.name = name;
                    createAoo.photo = photo;
                    createAoo.firstChat = recentChat;
                    createAoo.recentChat = recentChat;
                    createAoo.avgChat = 1;
                    createAoo.totalChat = 1;
                    createAoo.chatTimeCount = 1;
                    createAoo.unRead = 1;
                    admin.database().ref('apps/' + appId + '/messengers/' + msgId).update(createAoo);
                    resolve(createAoo);
                } else {
                    let newApp = Object.assign(initApp,messenger);
                    let count =  nowTime - newApp.recentChat >= 900000 ? newApp.totalChat+1 : newApp.totalChat;
                    newApp.totalChat = count;
                    newApp.unRead += 1;
                    newApp.recentChat = recentChat;
                    admin.database().ref('apps/' + appId + '/messengers/' + msgId).update(newApp);
                    resolve(newApp);
                }
            });
        })
        .then((data) => {
            let info = data;
            callback(info);
        })
        .catch(() => {
            callback(false);
        })
}
appsMessengersChats.loadChatHistory = (chatData, callback) => {
    let sendData = [];
    for (let i in chatData) {
        let profile = chatData[i].Profile;
        let _lastMsg = chatData[i].Messages[chatData[i].Messages.length - 1];
        if (profile.recentChat != _lastMsg.time) {
            profile.recentChat = _lastMsg.time;
            let timeArr = chatData[i].Messages.map(function(ele) {
                return ele.time;
            });
            let times = [];
            let j = 0;
            const GAP = 1000 * 60 * 15; //15 min
            let headTime;
            let tailTime;
            while (j < timeArr.length) {
                headTime = tailTime = timeArr[j];
                while (timeArr[j] - tailTime < GAP) {
                    tailTime = timeArr[j];
                    j++;
                    if (j == timeArr.length) break;
                }
                let num = tailTime - headTime;
                if (num < 1000) num = 1000;
                times.push(num);
            }
            let sum = 0;
            for (let j in times) sum += times[j];
            sum /= 60000;
            profile.totalChat = sum;
            profile.avgChat = sum / times.length;
            profile.chatTimeCount = times.length;
            if (isNaN(profile.avgChat) || profile.avgChat < 1) profile.avgChat = 1;
            if (isNaN(profile.totalChat) || profile.totalChat < 1) profile.totalChat = 1;
            let updateObj = {};
            chats.updateObj(i, {
                "avgChat": profile.avgChat,
                "totalChat": profile.totalChat,
                "chatTimeCount": profile.chatTimeCount,
                "recentChat": profile.recentChat
            });
        }
        let msgs = chatData[i].Messages;
        let position = 0;
        if (msgs.length > 20) {
            position = msgs.length - 20;
            msgs = msgs.slice(position);
        }
        sendData.push({
            Messages: msgs,
            position: position,
            Profile: profile
        });
    }
    callback(sendData);
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

module.exports = appsMessengersChats;