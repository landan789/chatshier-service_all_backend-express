module.exports = (function() {
    const admin = require('firebase-admin');

    function AppsChatroomsMessages() {}

    /**
     * 根據 App ID 清單，取得對應的所有聊天室訊息
     *
     * @param {string[]} appIds
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findChatroomMessagesByAppIds = function(appIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appIds || !(appIds instanceof Array)) {
                return;
            }
            let appsChatroomsMap = {};
            let findTasks = [];

            // 準備批次查詢的 promise 工作，將結果依照 appId 的鍵值塞到對應的欄位
            for (let idx in appIds) {
                let appId = appIds[idx];

                // 根據查詢路徑建立回傳的資料結構
                if (!appsChatroomsMap[appId]) {
                    appsChatroomsMap[appId] = {
                        chatrooms: {}
                    };
                }

                findTasks.push(new Promise((resolve, reject) => {
                    admin.database().ref('apps/' + appId + '/chatrooms/').on('value', (data) => {
                        if (!data) {
                            resolve();
                            return;
                        }

                        let chatroomsData = data.val();
                        if (chatroomsData) {
                            appsChatroomsMap[appId].chatrooms = chatroomsData;
                        }
                        resolve();
                    });
                }));
            }

            return Promise.all(findTasks).then(() => {
                return appsChatroomsMap;
            });
        }).then((result) => {
            callback(result);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據指定的 App ID，取得對應的所有聊天室訊息
     *
     * @param {string} appId
     * @param {Function} callback
     */
    AppsChatroomsMessages.prototype.findChatroomMessagesByAppId = function(appId, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appId) {
                return;
            }

            // 根據查詢路徑建立回傳的資料結構
            let appsChatroomsMap = {
                [appId]: {
                    chatrooms: {}
                }
            };

            return new Promise((resolve) => {
                admin.database().ref('apps/' + appId + '/chatrooms/').on('value', (data) => {
                    if (!data) {
                        resolve(appsChatroomsMap);
                        return;
                    }

                    let chatroomsData = data.val();
                    if (chatroomsData) {
                        appsChatroomsMap[appId].chatrooms = chatroomsData;
                    }
                    resolve(appsChatroomsMap);
                });
            });
        }).then((result) => {
            callback(result);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsChatroomsMessages();
})();
