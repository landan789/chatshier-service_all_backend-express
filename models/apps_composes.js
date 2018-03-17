module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    let instance = new AppsComposesModel();

    function AppsComposesModel() {}

    /**
     * 回傳預設的 compose 資料結構
     * @param {Function} callback
     */
    AppsComposesModel.prototype._schema = function(callback) {
        let json = {
            time: '',
            status: '',
            type: 'text',
            text: '',
            isDeleted: 0,
            age: '',
            gender: '',
            tag_ids: {}
        };
        callback(json);
    };

    /**
     * 輸入指定的 appId 取得該 App 所有群發的資料
     *
     * @param {string[]} appIds
     * @param {string[]|null} composeId
     * @param {Function} callback
     */
    AppsComposesModel.prototype.findAll = (appIds, composeId, callback) => {
        let appsComposes = {};

        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/composes').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                let compose = snap.val();
                if (!compose) {
                    return Promise.resolve(null);
                }
                appsComposes[appId] = {
                    composes: compose
                };
                return Promise.resolve(null);
            });
        })).then(() => {
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
     * @returns {Promise<any>}
     */
    AppsComposesModel.prototype.findOne = (appId, compsoeId, callback) => {
        return admin.database().ref('apps/' + appId + '/composes/' + composeId).once('value').then((snap) => {
            let composes = snap.val() || {};
            if (1 === composes.isDeleted) {
                Promise.reject(new Error());
            }
            let appsComposes = {
                [appId]: {
                    composes: composes
                }
            };
            callback(appsComposes);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 找到 群發未刪除的資料包，不含 apps 結構
     *
     * @param {string} appId
     * @param {(composes: any) => any} callback
     * @returns {Promise<any>}
     */

    AppsComposesModel.prototype.findComposes = (appId, callback) => {
        return admin.database().ref('apps/' + appId + '/composes/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
            let composes = snap.val();
            if (!composes) {
                return Promise.reject(new Error());
            }
            return composes;
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
     * @param {(appsComposes: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsComposesModel.prototype.insert = (appId, postCompose, callback) => {
        return new Promise((resolve, reject) => {
            instance._schema((initCompose) => {
                var _compose = {
                    createdTime: Date.now(),
                    updatedTime: Date.now()
                };
                let compose = Object.assign(initCompose, postCompose, _compose);
                resolve(compose);
            });
        }).then((compose) => {
            return admin.database().ref('apps/' + appId + '/composes').push(compose).then((ref) => {
                let composeId = ref.key;
                let appsComposes = {
                    [appId]: {
                        composes: {
                            [composeId]: compose
                        }
                    }
                };
                return appsComposes;
            });
        }).then((appsComposes) => {
            ('function' === typeof callback) && callback(appsComposes);
            return appsComposes;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };
    /**
     * 輸入指定的 appId 與 composeId 更新該群發的資料
     *
     * @param {string} appId
     * @param {string} composeId
     * @param {*} putCompose
     * @param {Function} callback
     * @returns {Promise<any>}
     */
    AppsComposesModel.prototype.update = (appId, composeId, putCompose, callback) => {
        let procced = Promise.resolve();
        return procced.then(() => {
            if (!appId || !composeId) {
                return Promise.reject(new Error());
            }
            // 1. 更新群發的資料
            return admin.database().ref('apps/' + appId + '/composes/' + composeId).update(putCompose).then(() => {
                let appsComposes = {
                    [appId]: {
                        composes: {
                            [composeId]: putCompose
                        }
                    }
                };
                return appsComposes;
            });
        }).then((appsComposes) => {
            callback(appsComposes);
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
     * @returns {Promise<any>}
     */
    AppsComposesModel.prototype.remove = (appId, composeId, callback) => {
        let deleteCompose = {
            isDeleted: 1
        };

        let composeRef = admin.database().ref('apps/' + appId + '/composes/' + composeId);
        return composeRef.update(deleteCompose).then(() => {
            return composeRef.once('value');
        }).then((snap) => {
            let compose = snap.val();
            let composeId = snap.ref.key;
            let appsComposes = {
                [appId]: {
                    composes: {
                        [composeId]: compose
                    }
                }
            };
            callback(appsComposes);
        }).catch(() => {
            callback(null);
        });
    };

    return instance;
})();