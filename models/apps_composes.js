module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsComposesModel() {}

    /**
     * 回傳預設的 compose 資料結構
     * @param {Function} callback
     */
    AppsComposesModel._schema = function(callback) {
        var json = {
            time: '',
            status: '',
            type: 'text',
            text: '',
            isDeleted: 0
        };
        callback(json);
    };

    /**
     * 輸入指定的 appId 取得該 App 所有群發的資料
     *
     * @param {string} appId
     * @param {Function} callback
     * @return {object} appsComposes
     */
    AppsComposesModel.prototype.findAll = (appId, callback) => {
        let procced = new Promise((resolve, reject) => {
            resolve();
        });
        procced.then(() => {
            return new Promise((resolve, reject) => {
                admin.database().ref('apps/' + appId + '/composes').once('value', snap => {
                    let info = snap.val();
                    if (null === info || undefined === info) {
                        reject();
                        return;
                    }
                    resolve(info);
                });
            });
        }).then((data) => {
            let compose = data;
            for (let a in compose) {
                if (1 === compose[a].isDeleted) {
                    delete compose[a];
                }
            }
            var appsComposes = {};
            appsComposes[appId] = {
                composes: compose
            };
            callback(appsComposes);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 查詢指定 appId 內指定的群發
     *
     * @param {string} appId
     * @param {string[]} composeId
     * @param {function({ type: string, text: string}[])} callback
     * @return {object} appsComposes
     */
    AppsComposesModel.prototype.findOne = (appId, callback) => {
        admin.database().ref('apps/' + appId + '/composes').once('value', snap => {
            let data = snap.val();
            if (null === data || undefined === data) {
                reject();
                return;
            }
            var appsComposes = {};
            var _composes = {};
            _composes = data;
            appsComposes[appId] = {
                composes: _composes
            };
            callback(appsComposes);
        });
    };

    /**
     * 找到 群發未刪除的資料包，不含 apps 結構
     *
     * @param {string} appId
     * @param {function({ type: string, text: string}[])} callback
     * @return {object} composes
     */

    AppsComposesModel.prototype.findComposes = (appId, callback) => {
        admin.database().ref('apps/' + appId + '/composes/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
            var composes = snap.val();
            if (null === composes || undefined === composes || '' === composes) {
                return Promise.reject();
            }
            return Promise.resolve(composes);
        }).then((composes) => {
            callback(composes);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 新增一筆群發的資料
     *
     * @param {string} appId
     * @param {*} postCompose
     * @param {Function} callback
     * @return {object} appsComposes
     */
    AppsComposesModel.prototype.insert = (appId, postCompose, callback) => {
        var procced = Promise.resolve();

        procced.then(() => {
            return new Promise((resolve, reject) => {
                AppsComposesModel._schema((initCompose) => {
                    let compose = Object.assign(initCompose, postCompose);
                    resolve(compose);
                });
            });
        }).then((compose) => {
            return Promise.all([admin.database().ref('apps/' + appId + '/composes').push(), compose]);
        }).then((result) => {
            let ref = result[0];
            let compose = result[1];
            let composeId = ref.key;
            return Promise.all([admin.database().ref('apps/' + appId + '/composes/' + composeId).update(compose), composeId]);
        }).then((result) => {
            let composeId = result[1];
            return admin.database().ref('apps/' + appId + '/composes/' + composeId).once('value');
        }).then((snap) => {
            let composes = snap.val();
            let composeId = snap.ref.key;
            var appsComposes = {};
            var _composes = {};
            _composes[composeId] = composes;
            appsComposes[appId] = {
                composes: _composes
            };
            callback(appsComposes);
        }).catch(() => {
            callback(null);
        });
    };
    /**
     * 輸入指定的 appId 與 composeId 更新該群發的資料
     *
     * @param {string} appId
     * @param {string} composeId
     * @param {*} putcompose
     * @param {Function} callback
     */
    AppsComposesModel.prototype.update = (appId, composeId, putcompose, callback) => {
        let procced = Promise.resolve();
        procced.then(() => {
            if (!appId || !composeId) {
                return Promise.reject(new Error());
            }
            // 1. 更新群發的資料
            return admin.database().ref('apps/' + appId + '/composes/' + composeId).update(putcompose).then(() => {
                return { composeId };
            });
        }).then((data) => {
            callback(data);
        }).catch(() => {
            callback(null);
        });
    };
    /**
     * 輸入指定的 appId 與 composeId 刪除該群發的資料
     *
     * @param {string} appId
     * @param {string} composesId
     * @param {Function} callback
     * @return {object} appsComposes
     */
    AppsComposesModel.prototype.remove = (appId, composesId, callback) => {
        var procced = new Promise((resolve, reject) => {
            resolve();
        });

        var deleteCompose = {
            isDeleted: 1
        };
        admin.database().ref('apps/' + appId + '/composes/' + composesId).update(deleteCompose).then(() => {
            return admin.database().ref('apps/' + appId + '/composes/' + composesId).once('value');
        }).then((snap) => {
            let compose = snap.val();
            let composeId = snap.ref.key;
            var appsComposes = {};
            var _composes = {};
            _composes[composeId] = compose;
            appsComposes[appId] = {
                composes: _composes
            };
            callback(appsComposes);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsComposesModel();
})();