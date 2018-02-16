module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsGreetingsModel() {}

    /**
     * 回傳預設的 Greeting 資料結構
     */
    AppsGreetingsModel._schema = function(callback) {
        let json = {
            updatedTime: Date.now(),
            type: 'text',
            text: '',
            isDeleted: 0
        };
        callback(json);
    };
    /**
     * 輸入全部的 appId 取得該 App 所有加好友回覆的資料
     *
     * @param {string[]} appIds
     * @param {Function} callback
     * @return {object} appsGreetings
     */
    AppsGreetingsModel.prototype.findAll = (appIds, callback) => {
        let appsGreetings = {};

        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/greetings').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                let greeting = snap.val() || {};
                appsGreetings[appId] = {
                    greetings: greeting
                };
            });
        })).then(() => {
            callback(appsGreetings);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 取得該 App 所有加好友回覆的資料
     *
     * @param {string} appId
     * @param {Function} callback
     * @return {object} appsGreetings
     */
    AppsGreetingsModel.prototype.find = (appId, callback) => {
        return admin.database().ref('apps/' + appId + '/greetings').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
            let greeting = snap.val() || {};
            let appsGreetings = {
                [appId]: {
                    greetings: greeting
                }
            };
            callback(appsGreetings);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 查詢指定 appId 內指定的加好友回覆訊息
     *
     * @param {string} appId
     * @param {string[]} greetingId
     * @param {function({ type: string, text: string}[])} callback
     * @return {object} appsGreetings
     */
    AppsGreetingsModel.prototype.findOne = (appId, greetingId, callback) => {
        admin.database().ref('apps/' + appId + '/greetings/' + greetingId).once('value').then((snap) => {
            let greeting = snap.val() || {};
            let appsGreetings = {
                [appId]: {
                    greetings: {
                        [greetingId]: greeting
                    }
                }
            };
            callback(appsGreetings);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 找到 加好友回覆未刪除的資料包，不含 apps 結構
     *
     * @param {string} appId
     * @param {function({ type: string, text: string}[])} callback
     * @return {object} greetings
     */

    AppsGreetingsModel.prototype.findGreetings = (appId, callback) => {
        admin.database().ref('apps/' + appId + '/greetings/').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
            let greetings = snap.val() || {};
            return greetings;
        }).then((greetings) => {
            callback(greetings);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 新增一筆加好友回覆的資料
     *
     * @param {string} appId
     * @param {any} postGreeting
     * @param {(appsGreetings: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsGreetingsModel.prototype.insert = (appId, postGreeting, callback) => {
        let procced = Promise.resolve();

        return procced.then(() => {
            return new Promise((resolve, reject) => {
                AppsGreetingsModel._schema((initGreeting) => {
                    let greeting = Object.assign(initGreeting, postGreeting);
                    resolve(greeting);
                });
            });
        }).then((greeting) => {
            return admin.database().ref('apps/' + appId + '/greetings').push(greeting).then((ref) => {
                let greetingId = ref.key;
                let appsGreetings = {
                    [appId]: {
                        greetings: {
                            [greetingId]: greeting
                        }
                    }
                };
                return appsGreetings;
            });
        }).then((appsGreetings) => {
            ('function' === typeof callback) && callback(appsGreetings);
            return appsGreetings;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * 輸入指定的 appId 與 greetingId 刪除該加好友回覆的資料
     *
     * @param {string} appId
     * @param {string} greetingId
     * @param {Function} callback
     * @return {object} appsGreetings
     */
    AppsGreetingsModel.prototype.remove = (appId, greetingId, callback) => {
        let procced = new Promise((resolve, reject) => {
            resolve();
        });

        let deleteGreeting = {
            isDeleted: 1
        };
        admin.database().ref('apps/' + appId + '/greetings/' + greetingId).update(deleteGreeting).then(() => {
            return admin.database().ref('apps/' + appId + '/greetings/' + greetingId).once('value');
        }).then((snap) => {
            let greeting = snap.val();
            let greetingId = snap.ref.key;
            let appsGreetings = {};
            let _greetings = {};
            _greetings[greetingId] = greeting;
            appsGreetings[appId] = {
                greetings: _greetings
            };
            callback(appsGreetings);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsGreetingsModel();
})();