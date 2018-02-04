module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsGreetingsModel() {}

    /**
     * 回傳預設的 Keywordreply 資料結構
     */
    AppsGreetingsModel._schema = function() {
        return {
            updatedTime: Date.now(),
            type: '',
            text: '',
            isDeleted: 0
        };
    };

    /**
     * 輸入指定的 appId 取得該 App 所有加好友回覆的資料
     *
     * @param {string} appId
     * @param {Function} callback
     * @return {object} appsGreetings
     */
    AppsGreetingsModel.prototype.findAll = (appId, callback) => {
        let procced = new Promise((resolve, reject) => {
            resolve();
        });
        procced.then(() => {
            return new Promise((resolve, reject) => {
                admin.database().ref('apps/' + appId + '/greetings').once('value', snap => {
                    let info = snap.val();
                    if (null === info || undefined === info) {
                        reject();
                        return;
                    }
                    resolve(info);
                });
            });
        }).then((data) => {
            let greeting = data;
            for (let a in greeting) {
                if (1 === greeting[a].isDeleted) {
                    delete greeting[a];
                }
            }
            var appsGreetings = {};
            appsGreetings[appId] = {
                greetings: greeting
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
        admin.database().ref('apps/' + appId + '/greetings/' + greetingId).once('value', snap => {
            let data = snap.val();
            if (null === data || undefined === data) {
                reject();
                return;
            }
            var appsGreetings = {};
            var _greetings = {};
            _greetings[greetingId] = data;
            appsGreetings[appId] = {
                greetings: _greetings
            };
            callback(appsGreetings);
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
            var greetings = snap.val();
            if (null === greetings || undefined === greetings || '' === greetings) {
                return Promise.reject();
            }
            return Promise.resolve(greetings);
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
     * @param {*} postGreeting
     * @param {Function} callback
     * @return {object} appsGreetings
     */
    AppsGreetingsModel.prototype.insert = (appId, postGreeting, callback) => {
        var procced = Promise.resolve();

        procced.then(() => {
            return new Promise((resolve, reject) => {
                let initGreeting = AppsGreetingsModel._schema();
                let greeting = Object.assign(initGreeting, postGreeting);
                resolve(greeting);
            });
        }).then((greeting) => {
            return Promise.all([admin.database().ref('apps/' + appId + '/greetings').push(), greeting]);
        }).then((result) => {
            let ref = result[0];
            let greeting = result[1];
            let greetingId = ref.key;
            return Promise.all([admin.database().ref('apps/' + appId + '/greetings/' + greetingId).update(greeting), greetingId]);
        }).then((result) => {
            let greetingId = result[1];
            return admin.database().ref('apps/' + appId + '/greetings/' + greetingId).once('value');
        }).then((snap) => {
            let greeting = snap.val();
            let greetingId = snap.ref.key;
            var appsGreetings = {};
            var _greetings = {};
            _greetings[greetingId] = greeting;
            appsGreetings[appId] = {
                greetings: _greetings
            };
            callback(appsGreetings);
        }).catch(() => {
            callback(null);
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
        var procced = new Promise((resolve, reject) => {
            resolve();
        });

        var deleteGreeting = {
            isDeleted: 1
        };
        admin.database().ref('apps/' + appId + '/greetings/' + greetingId).update(deleteGreeting).then(() => {
            return admin.database().ref('apps/' + appId + '/greetings/' + greetingId).once('value');
        }).then((snap) => {
            let greeting = snap.val();
            let greetingId = snap.ref.key;
            var appsGreetings = {};
            var _greetings = {};
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
