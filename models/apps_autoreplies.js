module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    let instance = new AppsAutorepliesModel();

    function AppsAutorepliesModel() {};

    /**
     * 回傳預設的 Autoreply 資料結構
     */
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

    /**
     * 輸入 指定 appId 的陣列清單，新增一筆自動回覆的資料
     *
     * @param {string} appId
     * @param {Function} callback
     */
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
    /**
     * 輸入 指定 appId 的陣列清單，修改一筆自動回覆的資料
     *
     * @param {string} appId
     * @param {Function} callback
     */
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

    /**
     * 輸入 指定 appId 的陣列清單，刪除一筆自動回覆的資料
     *
     * @param {string} appId
     * @param {Function} callback
     */
    AppsAutorepliesModel.prototype.remove = (appId, autoreplyId, callback) => {
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
    AppsAutorepliesModel.prototype.findAutoreplies = (appIds, callback) => {
        if ('string' === typeof appIds) {
            appIds = [appIds];
        };
        let autoreplies = {};
        return Promise.all((appIds).map((appId) => {
            return admin.database().ref('apps/' + appId + '/autoreplies/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                let _autoreplies = snap.val();
                if (null === _autoreplies || undefined === _autoreplies || '' === _autoreplies) {
                    return Promise.resolve(null);
                };
                Object.assign(autoreplies, _autoreplies);
                return Promise.resolve(null);
            });
        })).then(() => {
            callback(autoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入 appId 的陣列清單，取得每個 app 的關鍵字回覆的資料
     *
     * @param {string[]|string} appIds
     * @param {string|null} autoreplyId
     * @param {Function} callback
     */
    AppsAutorepliesModel.prototype.find = (appIds, autoreplyId, callback) => {
        let appsAutoreplies = {};
        if ('string' === appIds) {
            appIds = [appIds];
        };
        let autoreplies = {};
        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/autoreplies').once('value').then((snap) => {
                let autoreplies = snap.val() || {};
                if (!autoreplies) {
                    return Promise.resolve();
                };

                // polymorphsim to autoreplyId. null autoreplyId returns all autoreplies of each app.
                if (!autoreplyId) {
                    appsAutoreplies[appId] = {
                        autoreplies: autoreplies
                    };
                    return Promise.resolve();
                };
                if (autoreplies[autoreplyId]) {
                    appsAutoreplies[appId] = {
                        autoreplies: autoreplies
                    };
                    return Promise.resolve();
                };

                return Promise.resolve();
            });
        })).then(() => {
            callback(appsAutoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    return instance;
})();
