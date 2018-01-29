var admin = require('firebase-admin'); // firebase admin SDK
var utility = require('../helpers/utility');
var appsAutoreplies = {};

appsAutoreplies._schema = (callback) => {
    var json = {
        isDeleted: 0,
        createdTime: Date.now(),
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
            return Promise.reject();
        }
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

appsAutoreplies.findAutorepliesByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
        callback(snap);
    }).catch(() => {
        callback(false);
    });
};

appsAutoreplies.update = (appId, autoreplyId, autoreply, callback) => {

    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value').then((snap) => {
        var autoreplyCheck = snap.val();
        if (1 === autoreplyCheck.isDeleted || '1' === autoreplyCheck.isDeleted) {
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

appsAutoreplies.findAutoreplyIds = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/').once('value').then((snap) => {
        var appsAutoreplies = snap.val();
        if (undefined === appsAutoreplies || '' === appsAutoreplies || null === appsAutoreplies) {
            return Promise.reject();
        }
        var autoreplyIds = Object.keys(appsAutoreplies);

        callback(autoreplyIds);
    }).catch(() => {
        callback(null);
    });
};

/**
 * 找到 自動回復未刪除的資料包，不含 apps 結構
 */

appsAutoreplies.findAutorepliesByAppId = (appId, callback) => {

    var procced = Promise.resolve();

    admin.database().ref('apps/' + appId + '/autoreplies/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
        var autoreplies = snap.val();
        if (null === autoreplies || undefined === autoreplies || '' === autoreplies) {
            return Promise.reject();
        }
        return Promise.resolve(autoreplies);
    }).then((autoreplies) => {
        callback(autoreplies);
    }).catch(() => {
        callback(null);
    });
};

appsAutoreplies.findByAppIds = (appIds, callback) => {

    var procced = Promise.resolve();
    var appsAutoreplies = {};
    nextPromise(0).then(() => {
        callback(appsAutoreplies);
    }).catch(() => {
        callback(null);
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