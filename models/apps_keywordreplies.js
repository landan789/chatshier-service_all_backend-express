
module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsKeywordrepliesModel() {}

    /**
     * 回傳預設的 Keywordreply 資料結構
     */
    AppsKeywordrepliesModel._schema = function() {
        return {
            keyword: '',
            subKeywords: '',
            text: '',
            type: 'text',
            replyCount: 0,
            status: 1,
            createdTime: Date.now(),
            updatedTime: Date.now(),
            isDeleted: 0
        };
    };

    /**
     * 輸入 appId，取得每個 app 的關鍵字回覆的資料
     *
     * @param {string|string[]} appIds
     * @param {string|null} keywordreplyId
     * @param {(appsKeywordreples: any) => any} callback
     */
    AppsKeywordrepliesModel.prototype.find = function(appIds, keywordreplyId, callback) {
        Promise.resolve().then(() => {
            let appsKeywordreples = {};
            if (undefined === appIds) {
                return Promise.resolve({});
            };

            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            // 準備批次查詢的 promise 工作
            return Promise.all(appIds.map((appId) => {
                return admin.database().ref('apps/' + appId + '/keywordreplies').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                    let keywordreplies = snap.val() || {};

                    if (!keywordreplies) {
                        return Promise.reject(new Error());
                    }

                    if (!keywordreplyId) {
                        appsKeywordreples[appId] = {
                            keywordreplies: keywordreplies
                        };
                        return Promise.resolve(null);
                    }

                    if (keywordreplyId && keywordreplies[keywordreplyId]) {
                        let keywordreply = keywordreplies[keywordreplyId];
                        appsKeywordreples[appId] = {
                            keywordreplies: {
                                [keywordreplyId]: keywordreply
                            }
                        };
                        return Promise.resolve(null);
                    }
                });
            })).then(() => {
                return Promise.resolve(appsKeywordreples);
            });
        }).then((appsKeywordreples) => {
            callback(appsKeywordreples);
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
    AppsKeywordrepliesModel.prototype.insert = (appId, postKeywordreply, callback) => {
        let keywordreply;
        Promise.resolve().then(() => {
            if (!appId || !postKeywordreply) {
                return Promise.reject(new Error());
            }

            // 1. 將傳入的資料與初始化資料合併，確保訂定的欄位一定有值
            let initKeywordreply = AppsKeywordrepliesModel._schema();
            keywordreply = Object.assign(initKeywordreply, postKeywordreply);
            let keyword = keywordreply.keyword;
            if (!keyword) {
                return Promise.reject(new Error());
            }

            // 2. 將關鍵字的文字編碼成一個唯一的 hash 值當作 messages 欄位的鍵值
            return admin.database().ref('apps/' + appId + '/keywordreplies').push(keywordreply);
        }).then((ref) => {
            let keywordreplyId = ref.key;
            let appsKeywordreplies = {
                [appId]: {
                    keywordreplies: {
                        [keywordreplyId]: keywordreply
                    }
                }
            };
            return Promise.resolve(appsKeywordreplies);
        }).then((appsKeywordreplies) => {
            callback(appsKeywordreplies);
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
    AppsKeywordrepliesModel.prototype.update = (appId, keywordreplyId, putKeywordreply, callback) => {
        Promise.resolve().then(() => {
            if (!appId || !keywordreplyId) {
                return Promise.reject(new Error());
            };

            let _keywordreply = {
                updatedTime: Date.now()
            };
            let keywordreply = Object.assign(putKeywordreply, _keywordreply);

            // 1. 更新關鍵字回覆的資料
            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).update(keywordreply);
        }).then((data) => {
            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).once('value');
        }).then((snap) => {
            let keywordreply = snap.val();
            let appsKeywordreples = {
                [appId]: {
                    keywordreplies: {
                        [keywordreplyId]: keywordreply
                    }
                }
            };
            return Promise.resolve(appsKeywordreples);
        }).then((appsKeywordreples) => {
            callback(appsKeywordreples);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 增加指定關鍵字回覆的回覆次數 1 次
     *
     * @param {string} appId
     * @param {string|string[]} keywordreplyIds
     * @param {() => any} [callback]
     */
    AppsKeywordrepliesModel.prototype.increaseReplyCount = (appId, keywordreplyIds, callback) => {
        if ('string' === typeof keywordreplyIds) {
            keywordreplyIds = [keywordreplyIds];
        }

        let _keywordreplyIds = keywordreplyIds || [];
        return Promise.all(_keywordreplyIds.map((keywordreplyId) => {
            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).once('value').then((snap) => {
                let keywordreply = snap.val();
                let putKeywordreply = {
                    replyCount: keywordreply.replyCount + 1
                };
                return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).update(putKeywordreply);
            });
        })).then(() => {
            ('function' === typeof callback) && callback();
        });
    };

    /**
     * 輸入指定的 appId 與 keywordreplyId 刪除該關鍵字回覆的資料
     *
     * @param {string} appId
     * @param {string} keywordreplyId
     * @param {Function} callback
     */
    AppsKeywordrepliesModel.prototype.remove = (appId, keywordreplyId, callback) => {
        Promise.resolve().then(() => {
            if (!appId || !keywordreplyId) {
                return Promise.reject(new Error());
            }

            let deleteKeywordreply = {
                isDeleted: 1,
                updatedTime: Date.now()
            };

            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).update(deleteKeywordreply);
        }).then(() => {
            return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).once('value');
        }).then((snap) => {
            let keywordreply = snap.val();
            let appsKeywordreplies = {
                [appId]: {
                    keywordreplies: {
                        [keywordreplyId]: keywordreply
                    }
                }
            };
            return Promise.resolve(appsKeywordreplies);
        }).then((appsKeywordreplies) => {
            callback(appsKeywordreplies);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsKeywordrepliesModel();
})();