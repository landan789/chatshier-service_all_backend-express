module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsMessagersModel() {} // 宣告物件因為module需要物件

    AppsMessagersModel._schema = function(callback) {
        let json = {
            name: '',
            photo: '',
            age: '',
            telephone: '',
            assigned: '',
            email: '',
            remark: '',
            firstChat: Date.now(),
            recentChat: Date.now(),
            avgChat: 1,
            totalChat: 1,
            chatTimeCount: 1,
            unRead: 1,
            chatroom_id: ''
        };
        callback(json);
    };

    /**
     * 取得所有 App 及其所有 Messager
     *
     * @param {string[]} appIds
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findAppMessagersByAppIds = function(appIds, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            if (!appIds) {
                return;
            }

            let messagersMap = {};
            let findTasks = [];

            // 每個 messager 的清單取得後，依照 appId 的鍵值塞到對應的欄位
            for (let idx in appIds) {
                let appId = appIds[idx];
                findTasks.push(new Promise((resolve, reject) => {
                    admin.database().ref('apps/' + appId + '/messagers').on('value', (data) => {
                        if (!data) {
                            messagersMap[appId] = [];
                            resolve();
                            return;
                        }
                        let messagers = data.val();
                        messagersMap[appId] = messagers;
                        resolve();
                    });
                }));
            }

            // 同時發送所有查找請求，所有請求處理完畢後再將對應表往下傳
            return Promise.all(findTasks).then(() => {
                return messagersMap;
            });
        }).then((result) => {
            if (!result) {
                callback(null);
                return;
            }
            callback(result);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 指定 AppId 取得所有 Messager
     *
     * @param {string} appId
     * @param {Function} callback
     */
    AppsMessagersModel.prototype.findAppMessagersByAppId = function(appId, callback) {
        admin.database().ref('apps/' + appId + '/messagers').on('value', (data) => {
            if (!data) {
                callback();
                return;
            }
            let messagers = data.val();
            callback(messagers);
        });
    };

    return new AppsMessagersModel();
})();
