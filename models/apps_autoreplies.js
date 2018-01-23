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
            let replyMessageContent = snap.val().content;
            let replyMessageStartTime = new Date(snap.val().start).getTime(); // 開始時間
            let replyMessageEndTime = new Date(snap.val().end).getTime(); // 結束時間
            let now = Date.now(); // 現在時間
            console.log(now, replyMessageEndTime, replyMessageStartTime);
            if (now < replyMessageEndTime && now > replyMessageStartTime) {
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

module.exports = appsAutoreplies;
