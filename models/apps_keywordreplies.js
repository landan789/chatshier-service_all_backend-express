module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsKeywordrepliesModel() {}

    /**
     * 回傳預設的 Keywordreply 資料結構
     */
    AppsKeywordrepliesModel._schema = function() {
        return {
            isDeleted: 0
        };
    };

    /**
     * 查詢指定 appId 內的所有關鍵字的關鍵字訊息 (回傳的資料型態為陣列)
     *
     * @param {string} appId
     * @param {string[]} keywordreplyIds
     * @param {function({ type: string, text: string}[])} callback
     */
    AppsKeywordrepliesModel.prototype.findMessagesArrayByAppIdAndKeywordIds = function(appId, keywordreplyIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appId || !keywordreplyIds || !(keywordreplyIds instanceof Array)) {
                return;
            }
            let keywordreples = [];
            let findTasks = [];

            // 準備批次查詢的 promise 工作
            for (let idx in keywordreplyIds) {
                let keywordreplyId = keywordreplyIds[idx];

                findTasks.push(new Promise((resolve, reject) => {
                    admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).once('value', (snap) => {
                        if (!snap) {
                            resolve();
                            return;
                        }

                        // 這裡沒有做 index 儲存，因此由於非同步工作的關係
                        // 每次最後所產生的陣列順序可能有所不同
                        let replyMessage = snap.val();
                        if (replyMessage) {
                            // 每一次收到回應後將結果丟入陣列
                            keywordreples.push({ // 推入新的物件過濾所需資料
                                type: replyMessage.type,
                                text: replyMessage.text
                            });
                        }
                        resolve();
                    });
                }));
            }

            return Promise.all(findTasks).then(() => {
                return keywordreples;
            });
        }).then((result) => {
            callback(result);
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
    AppsKeywordrepliesModel.prototype.findKeywordrepliesByAppIds = function(appIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appIds || !(appIds instanceof Array)) {
                return;
            }
            let appsKeywordreplesMap = {};
            let findTasks = [];

            // 準備批次查詢的 promise 工作
            for (let idx in appIds) {
                let appId = appIds[idx];

                // 根據查詢路徑建立回傳的資料結構
                if (!appsKeywordreplesMap[appId]) {
                    appsKeywordreplesMap[appId] = {
                        keywordreplies: {}
                    };
                }

                findTasks.push(new Promise((resolve, reject) => {
                    admin.database().ref('apps/' + appId + '/keywordreplies').once('value', (snap) => {
                        if (!snap) {
                            resolve();
                            return;
                        }

                        let replyMessage = snap.val() || {};
                        appsKeywordreplesMap[appId].keywordreplies = replyMessage;
                        resolve();
                    });
                }));
            }

            // 最後的資料結構型式:
            // {
            //   ($appId)
            //   ($appId)
            //     ⌞keywordreplies
            //       ⌞($keywordreplyId)
            //       ⌞($keywordreplyId)
            // }
            return Promise.all(findTasks).then(() => {
                return appsKeywordreplesMap;
            });
        }).then((result) => {
            callback(result || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 與 keywordreplyId 取得該關鍵字回覆的資料
     *
     * @param {string} appId
     * @param {string} keywordreplyId
     * @param {Function} callback
     */
    AppsKeywordrepliesModel.prototype.findKeywordrepliesByAppIdByKeywordreplyId = function(appId, keywordreplyId, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appId || !keywordreplyId) {
                return;
            }

            return new Promise((resolve, reject) => {
                admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).once('value', (snap) => {
                    if (!snap) {
                        resolve();
                        return;
                    }

                    let keywordreplyData = snap.val() || {};
                    resolve(keywordreplyData);
                });
            });
        }).then((result) => {
            callback(result || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 新增一筆關鍵字回覆的資料
     *
     * @param {string} appId
     * @param {*} postKeywordreply
     * @param {Function} callback
     */
    AppsKeywordrepliesModel.prototype.insertByAppId = (appId, postKeywordreply, callback) => {
        let procced = Promise.resolve();
        procced.then(() => {
            if (!appId || !postKeywordreply) {
                return Promise.reject(new Error());
            }
            let initKeywordreply = AppsKeywordrepliesModel._schema();
            let newKeywordreply = Object.assign(initKeywordreply, postKeywordreply);
            return admin.database().ref('apps/' + appId + '/keywordreplies').push(newKeywordreply);
        }).then(() => {
            callback(true);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 與 keywordreplyId 更新該關鍵字回覆的資料
     *
     * @param {string} appId
     * @param {string} keywordreplyId
     * @param {*} putKeywordreply
     * @param {Function} callback
     */
    AppsKeywordrepliesModel.prototype.updateByAppIdByKeywordreplyId = (appId, keywordreplyId, putKeywordreply, callback) => {
        let procced = Promise.resolve();
        procced.then(() => {
            if (!appId || !keywordreplyId) {
                return;
            }

            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).update(putKeywordreply);
        }).then(() => {
            callback(true);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 與 keywordreplyId 刪除該關鍵字回覆的資料
     *
     * @param {string} appId
     * @param {string} keywordreplyId
     * @param {Function} callback
     */
    AppsKeywordrepliesModel.prototype.removeByAppIdByKeywordreplyId = (appId, keywordreplyId, callback) => {
        let procced = Promise.resolve();

        procced.then(() => {
            if (!appId || !keywordreplyId) {
                return;
            }

            let deleteKeywordreply = {
                isDeleted: 1
            };

            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).update(deleteKeywordreply);
        }).then(() => {
            callback(true);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsKeywordrepliesModel();
})();
