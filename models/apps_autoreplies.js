var admin = require("firebase-admin"); //firebase admin SDK
var appsAutoreplies = {};

appsAutoreplies.insert = (appId, obj, callback) => {
    let autorepliesId = admin.database().ref('apps/' + appId + '/autoreplies').push().key;
    admin.database().ref('apps/' + appId + '/autoreplies/' + autorepliesId).update(obj);
    callback(autorepliesId);
}

appsAutoreplies.find = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies').once('value', snap => {
        let info = snap.val();
        callback(info);
    });
}

appsAutoreplies.findOne = (appId, autoreplyId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value', snap => {
        let info = snap.val();
        callback(info);
    });
}

appsAutoreplies.update = (appId, autoreplyId, obj, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(obj)
        .then(() => {
            callback();
        })
        .catch(() => {
            callback(false);
        });

}

appsAutoreplies.removeByAutoreplyId = (appId, autoreplyId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update({
            delete: 1
        })
        .then(() => {
            callback();
        })
        .catch(() => {
            callback(false);
        });
}

appsAutoreplies.findMessagesByAppIdAndAutoreplyIds = (appId, autoreplyIds, callback) => {
    let autoreplies = [];
    autoreplyIds.map((autoreplyId, index) => {
        let address = 'apps/' + appId + '/autoreplies/' + autoreplyId;
        admin.database().ref(address).on('value', (snap) => {
            let replyMessageContent = snap.val().format;
            let replyMessageStartTime = new Date(snap.val().start).getTime(); // 開始時間
            let replyMessageEndTime = new Date(snap.val().end).getTime(); // 結束時間
            let now = DateTimezone(8);
            let tpeTime = now.getTime();
            if (tpeTime < replyMessageEndTime && tpeTime > replyMessageStartTime) {
                autoreplies.push(replyMessageContent);
            }
            if (index === (autoreplyIds.length - 1)) {
                callback(autoreplies);
            }
        });
    });
}

// appsAutoreplies.findAutoreplyMessageByAutoreplyId = (appId, autoreplyId, callback) => {
//     admin.database().ref('apps/' + appId + '/')
// }

function DateTimezone(offset) {
    // 建立現在時間的物件
    let d = new Date();
    // 取得 UTC time
    let utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    // 新增不同時區的日期資料
    return new Date(utc + (3600000 * offset));

}

module.exports = appsAutoreplies;
