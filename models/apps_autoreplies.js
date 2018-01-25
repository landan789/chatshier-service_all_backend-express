var admin = require('firebase-admin'); // firebase admin SDK
var utility = require('../helpers/utility');
var appsAutoreplies = {};

appsAutoreplies._schema = (callback) => {
    var json = {
        isDeleted: 0,
        createdTime: 0,
        startedTime: 0,
        endedTime: 0,
        title: '',
        text: '',
        type: 'text'
    };
    callback(json)
};
appsAutoreplies.insert = (appId, autoreply, callback) => {

    admin.database().ref('apps/' + appId + '/autoreplies').push().then((ref) => {
        var autoreplyId = ref.key;
        return new Promise((resolve, reject) => {
            appsAutoreplies._schema((initAutoreply) => {
                autoreply = Object.assign(initAutoreply, autoreply);
                resolve([autoreplyId, autoreply]);
            });
        });
    }).then((result) => {
        var autoreplyId = result[0];
        autoreply = result[1];
        return Promise.all([admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(autoreply), autoreplyId]);
    }).then((result) => {
        var autoreplyId = result[1];
        return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value');
    }).then((snap) => {
        let autoreply = snap.val();
        var autoreplyId = snap.ref.key;
        var appsAutoreplies = {};
        var _autoreplies = {};
        _autoreplies[autoreplyId] = autoreply;
        appsAutoreplies[appId] = {
            autoreplies: _autoreplies
        };
        callback(appsAutoreplies);
    }).catch(() => {
        callback(null);
    });

};

appsAutoreplies.find = (appId, autoreplyId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value', snap => {
        let autoreply = snap.val();
        if (undefined === autoreplyId || '' === autoreplyId || null === autoreplyId) {
            callback(null);
            return;
        }
        var appsAutoreplies = {};
        var _autoreplies = {};
        _autoreplies[autoreplyId] = autoreply;
        appsAutoreplies[appId] = {
            autoreplies: _autoreplies
        };
        callback(appsAutoreplies);
    });
};

appsAutoreplies.update = (appId, autoreplyId, autoreply, callback) => {

    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value').then((snap) => {
        var autoreply = snap.val();
        if (1 === autoreply.isDeleted || '1' === autoreply.isDeleted) {
            return Promise.reject(new Error());
        }
        return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(autoreply);
    }).then(() => {
        return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value');
    }).then((snap) => {
        var autoreply = snap.val();
        var appsAutoreplies = {};
        var _autoreplies = {};
        _autoreplies[autoreplyId] = autoreply;
        appsAutoreplies[appId] = {
            autoreplies: _autoreplies
        };
        callback(appsAutoreplies);

    }).catch(() => {
        callback(null);
    });

};

appsAutoreplies.removeByAppIdByAutoreplyId = (appId, autoreplyId, callback) => {
    var autoreply = {
        isDeleted: 1
    };
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(autoreply).then(() => {
        return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value');
    }).then((snap) => {
        var autoreply = snap.val();
        var appsAutoreplies = {};
        var _autoreplies = {};
        _autoreplies[autoreplyId] = autoreply;
        appsAutoreplies[appId] = {
            autoreplies: _autoreplies
        };
        callback(appsAutoreplies);

    }).catch(() => {
        callback(null);
    });
};

appsAutoreplies.findMessagesByAppIdAndAutoreplyIds = (appId, autoreplyIds, callback) => {
    let autoreplies = [];
    if (!autoreplyIds) {
        callback(autoreplies);
        return;
    }
    autoreplyIds.map((autoreplyId, index) => {
        let address = 'apps/' + appId + '/autoreplies/' + autoreplyId;
        admin.database().ref(address).on('value', (snap) => {
            let replyMessageContent = snap.val();
            if (null === replyMessageContent || undefined === replyMessageContent || '' === replyMessageContent) {
                callback(null);
                return;
            }
            let createdTime = replyMessageContent.createdTime;
            let finishedTime = replyMessageContent.finishedTime;
            let now = utility.DateTimezone(8);
            let tpeTime = now.getTime();
            if (tpeTime < finishedTime && tpeTime > createdTime) {
                autoreplies.push({type: replyMessageContent.type, text: replyMessageContent.text});
            }
            if (index === (autoreplyIds.length - 1)) {
                callback(autoreplies);
            }
        });
    });
};

appsAutoreplies.findByAppIds = (appIds, callback) => {

    var procced = Promise.resolve();
    var appsAutoreplies = {};
    nextPromise(0).then(() => {
        callback(appsAutoreplies);
    });

    function nextPromise(i) {
        return procced.then(() => {
            var appId = appIds[i];
            return admin.database().ref('apps/' + appId + '/autoreplies').once('value');
        }).then((snap) => {
            if (i >= appIds.length) {
                return Promise.resolve();
            }
            var autoreplies = snap.val();
            var appId = snap.ref.parent.key;
            appsAutoreplies[appId] = {
                autoreplies: autoreplies
            };

            return nextPromise(i + 1);
        });
    }
};

module.exports = appsAutoreplies;
