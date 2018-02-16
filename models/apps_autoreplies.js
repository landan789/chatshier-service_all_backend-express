module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    // const utility = require('../helpers/utility');

    let instance = new AppsAutorepliesModel();

    function AppsAutorepliesModel() {};

    AppsAutorepliesModel.prototype._schema = (callback) => {
        let json = {
            isDeleted: 0,
            createdTime: Date.now(),
            startedTime: 0,
            endedTime: 0,
            title: '',
            text: '',
            type: 'text',
            updatedTime: Date.now()
        };
        callback(json);
    };

    AppsAutorepliesModel.prototype.insert = (appId, autoreply, callback) => {
        return new Promise((resolve, reject) => {
            instance._schema((initAutoreply) => {
                var _autoreply = Object.assign(initAutoreply, autoreply);
                resolve(_autoreply);
            });
        }).then((_autoreply) => {
            return admin.database().ref('apps/' + appId + '/autoreplies').push(_autoreply).then((ref) => {
                let autoreplyId = ref.key;
                let appsAutoreplies = {
                    [appId]: {
                        autoreplies: {
                            [autoreplyId]: _autoreply
                        }
                    }
                };
                return appsAutoreplies;
            });
        }).then((appsAutoreplies) => {
            ('function' === typeof callback) && callback(appsAutoreplies);
            return appsAutoreplies;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    AppsAutorepliesModel.prototype.find = (appId, callback) => {
        admin.database().ref('apps/' + appId + '/autoreplies/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
            let autoreplies = snap.val() || {};
            let appsAutoreplies = {
                [appId]: {
                    autoreplies: autoreplies
                }
            };
            callback(appsAutoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    AppsAutorepliesModel.prototype.update = (appId, autoreplyId, autoreply, callback) => {
        admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value').then((snap) => {
            let autoreplyCheck = snap.val();
            if (1 === autoreplyCheck.isDeleted || '1' === autoreplyCheck.isDeleted) {
                return Promise.reject(new Error());
            }
            autoreply.updatedTime = Date.now();
            return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(autoreply);
        }).then(() => {
            return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value');
        }).then((snap) => {
            let autoreply = snap.val();
            let appsAutoreplies = {};
            let _autoreplies = {};
            _autoreplies[autoreplyId] = autoreply;
            appsAutoreplies[appId] = {
                autoreplies: _autoreplies
            };
            callback(appsAutoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    AppsAutorepliesModel.prototype.removeByAppIdByAutoreplyId = (appId, autoreplyId, callback) => {
        let autoreply = {
            isDeleted: 1
        };
        admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(autoreply).then(() => {
            return admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value');
        }).then((snap) => {
            let autoreply = snap.val();
            let appsAutoreplies = {};
            let _autoreplies = {};
            _autoreplies[autoreplyId] = autoreply;
            appsAutoreplies[appId] = {
                autoreplies: _autoreplies
            };
            callback(appsAutoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 找到 自動回復未刪除的資料包，不含 apps 結構
     */
    AppsAutorepliesModel.prototype.findAutorepliesByAppId = (appId, callback) => {
        admin.database().ref('apps/' + appId + '/autoreplies/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
            let autoreplies = snap.val();
            if (null === autoreplies || undefined === autoreplies || '' === autoreplies) {
                return Promise.reject(new Error());
            }
            return Promise.resolve(autoreplies);
        }).then((autoreplies) => {
            callback(autoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    AppsAutorepliesModel.prototype.findByAppIds = (appIds, callback) => {
        let appsAutoreplies = {};

        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/autoreplies').once('value').then((snap) => {
                let autoreplies = snap.val() || {};
                appsAutoreplies[appId] = {
                    autoreplies: autoreplies
                };
            });
        })).then(() => {
            callback(appsAutoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    return instance;
})();
