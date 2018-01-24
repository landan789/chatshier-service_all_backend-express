var admin = require('firebase-admin'); // firebase admin SDK
var appsChatroomsMessengers = {}; // 宣告物件因為module需要物件

appsChatroomsMessengers._schema = (callback) => {
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

appsChatroomsMessengers.updateMessenger = (appId, msgerId, chatroomId, name, picUrl, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value');
    }).then((snap) => {
        let messenger = snap.val();
        return new Promise((resolve, reject) => {
            if (null === messenger || undefined === messenger || '' === messenger) {
                resolve(null);
                return;
            }
            resolve(messenger);
        });
    }).then((messenger) => {
        return new Promise((resolve, reject) => {
            appsChatroomsMessengers._schema((initApp) => {
                if (null === messenger || undefined === messenger || '' === messenger) {
                    initApp.name = name;
                    initApp.picUrl = picUrl;
                    initApp.chatroom_id = chatroomId;
                    resolve({initApp});
                    return;
                }
                resolve({messenger, initApp});
            });
        });
    }).then((data) => {
        let messenger = data.messenger;
        let initApp = data.initApp;
        if (null === messenger || undefined === messenger || '' === messenger) { // 新客戶
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).set(initApp);
        } else { // 舊客戶
            let nowTime = Date.now();
            let newApp = Object.assign(initApp, messenger);
            // 儲存最後聊天時間
            newApp.recentChat = nowTime;
            // 超過15分鐘聊天次數就多一次
            let count = 900000 <= (nowTime - newApp.recentChat) ? newApp.chatTimeCount++ : newApp.chatTimeCount;
            newApp.totalChat = count;
            // 訊息進線就多一筆未讀訊息
            newApp.unRead++;
            // 計算總聊天時間
            return admin.database().ref('apps/' + appId + '/messagers/' + msgerId).update(newApp);
        }
    }).then(() => {
        // admin.database().ref('apps/' + appId + '/messagers/' + msgerId).once('value', (snap) => {
        //     let messenger = snap.val();
        //     if (null === messenger || undefined === messenger || '' === messenger) {
        //         callback(null);
        //         return;
        //     }
        //     callback(messenger);
        // });
        callback();
    }).catch(() => {
        callback(false);
    });
};

module.exports = appsChatroomsMessengers;
