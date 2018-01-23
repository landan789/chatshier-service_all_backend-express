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
        recentChat: '',
        avgChat: 0,
        totalChat: 0,
        chatTimeCount: 0,
        unRead: 0
    };
    callback(json);
};

appsChatroomsMessengers.updateMessengerInfo = (appId, msgId, msgObj, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).once('value', snap => {
                let messenger = snap.val();
                resolve(messenger);
            });
        });
    }).then((data) => {
        let messenger = data;
        return new Promise((resolve, reject) => {
            appsChatroomsMessengers._schema((initApp) => {
                resolve({messenger, initApp});
            });
        });
    }).then((data) => {
        let messenger = data.messenger;
        let initApp = data.initApp;
        if (null === messenger.name || undefined === messenger.name || '' === messenger.name) { // 新客戶
            let createApp = Object.assign(initApp, msgObj);
            return admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).update(createApp);
        } else { // 舊客戶
            let nowTime = Date.now();
            console.log(new Date(nowTime + 28800000));
            let newApp = Object.assign(initApp, messenger);
            // 儲存最後聊天時間
            initApp.recentChat = nowTime;
            // 超過15分鐘聊天次數就多一次
            let count = nowTime - newApp.recentChat >= 900000 ? newApp.chatTimeCount++ : newApp.chatTimeCount; 
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
        return admin.database().ref('apps/' + appId + '/chatrooms/' + msgId + '/messengers/' + msgId).set(msgObj.name);
    }).then(() => {
        admin.database().ref('apps/' + appId + '/chatrooms/' + msgId).once('value', (snap) => {
            let chatrooms = snap.val();
            if (null === chatrooms || undefined === chatrooms || '' === chatrooms) {
                callback(false);
                return;
            }
            callback(chatrooms);
        });
    }).catch(() => {
        callback(false);
    });
}

module.exports = appsChatroomsMessengers;
