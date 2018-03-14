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
     * 輸入 指定 appId 的陣列清單，取得該 App 所有自動回覆的資料
     *
     * @param {string} appId
     * @param {Function} callback
     */
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

    /**
     * 輸入 appId 的陣列清單，取得每個 app 的關鍵字回覆的資料
     *
     * @param {string[]} appIds
     * @param {Function} callback
     */
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

    /**
     * 輸入指定的 appId 取得一筆關鍵字回覆的資料
     *
     * @param {string} appId
     * @param {*} autoreplyId
     * @param {Function} callback
     */
    AppsAutorepliesModel.prototype.findOne = (appId, autoreplyId, callback) => {
        let appsAutoreplies = {};

        return admin.database().ref('apps/' + appId + '/autoreplies' + autoreplyId).once('value').then((snap) => {
            let autoreplies = snap.val() || {};
            if (1 === autoreplies.isDeleted) {
                Promise.reject(new Error());
            }
            appsAutoreplies[appId] = {
                autoreplies: autoreplies
            };
        }).then(() => {
            callback(appsAutoreplies);
        }).catch(() => {
            callback(null);
        });
    };

    return instance;
})();
