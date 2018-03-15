var admin = require('firebase-admin'); // firebase admin SDK
var apps = {};

const typeEnum = Object.freeze({
    LINE: 'LINE',
    FACEBOOK: 'FACEBOOK',
    CHATSHIER: 'CHATSHIER'
});

apps.typeEnum = typeEnum;

apps._schema = (callback) => {
    var json = {
        id1: '',
        id2: '',
        name: '',
        secret: '',
        token1: '',
        token2: '',
        type: '',
        group_id: '',
        webhook_id: '',
        isDeleted: 0,
        updatedTime: Date.now(),
        createdTime: Date.now()
    };
    callback(json);
};

apps.findByAppId = (appId, callback) => {
    var ref = 'apps/' + appId;
    admin.database().ref(ref).once('value', (snap) => {
        var app = snap.val();
        var appId = snap.key;
        delete app.keywordreplies;
        delete app.autoreplies;
        delete app.templates;
        delete app.greetings;
        delete app.composes;
        var _app = {
            group_id: app.group_id,
            id1: app.id1,
            id2: app.id2,
            isDeleted: app.isDeleted,
            name: app.name,
            secret: app.secret,
            token1: app.token1,
            token2: app.token2,
            type: app.type,
            webhook_id: app.webhook_id
        };
        var apps = {};
        apps[appId] = _app;
        callback(apps);
    });
};

/**
 * 處理取得某個 webhook 對應到的 apps
 */
apps.findAppsByWebhookId = (webhookId, callback) => {
    var procced = Promise.resolve();

    procced.then(() => {
        return admin.database().ref('webhooks/' + webhookId).once('value');
    }).then((snap) => {
        var webhook = snap.val();
        var appId = webhook.app_id;
        return Promise.all([admin.database().ref('apps/' + appId).once('value'), appId]);
    }).then((result) => {
        var snap = result[0];
        var appId = result[1];

        var app = snap.val();
        var apps = {};
        apps[appId] = app;
        callback(apps);
    }).catch(() => {
        callback(null);
    });
};
/**
     * 多型判斷要回傳apps還是appid下資料
     *
     * @param {string|string[]} appIds || ''
     * @param {Function} callback
     * @returns {Promise<any>}
     */
apps.findAppsByAppIds = (appIds, callback) => {
    var apps = {};

    Promise.resolve().then(() => {
        // 值為空回傳整包apps
        if ('' === appIds || !appIds) {
            return admin.database().ref('apps').once('value').then((snap) => {
                apps = snap.val();
                return Promise.resolve();
            });
        };
        if ('string' === typeof appIds) {
            appIds = [appIds];
        };
        return Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId).once('value').then((snap) => {
                let app = snap.val();
                // DB 沒有取到資料
                if (null === app || undefined === app || '' === app) {
                    return Promise.resolve(null);
                }
                // 已刪除資料，不呈現於 API
                if (app.isDeleted) {
                    return Promise.resolve(null);
                }
                var _app = {
                    group_id: app.group_id,
                    id1: app.id1,
                    id2: app.id2,
                    isDeleted: app.isDeleted,
                    name: app.name,
                    secret: app.secret,
                    token1: app.token1,
                    token2: app.token2,
                    type: app.type,
                    webhook_id: app.webhook_id
                };
                apps[appId] = _app;
                return Promise.resolve();
            });
        }));
    }).then(() => {
        callback(apps);
    }).catch(() => {
        callback(null);
    });
};

apps.insert = (userId, postApp, callback) => {
    let groupId = postApp.group_id;
    let appId = '';

    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            apps._schema((initApp) => {
                postApp = Object.assign(initApp, postApp);
                resolve(postApp);
            });
        });
    }).then(() => {
        return admin.database().ref('apps').push(postApp);
    }).then((appPushRef) => {
        appId = appPushRef.key;
        return admin.database().ref('users/' + userId).once('value');
    }).then((snap) => {
        let user = snap.val();
        let _groupIds = user.group_ids;

        // 當下 user 沒有該 group ，則不能新增 app
        if (0 > _groupIds.indexOf(groupId)) {
            return Promise.reject(new Error());
        };
        return Promise.resolve();
    }).then(() => {
        // 如果新增的 app 為 CHATSHIER 內部聊天室，則不需進行新增 webhooks 的動作
        if (apps.typeEnum.CHATSHIER === postApp.type) {
            return;
        }

        let webhook = {
            app_id: appId
        };
        let webhooksPushRef = admin.database().ref('webhooks').push(webhook);
        let webhookId = webhooksPushRef.key;

        webhooksPushRef.then(() => {
            let appWebhook = {
                webhook_id: webhookId
            };
            return admin.database().ref('apps/' + appId).update(appWebhook);
        });
    }).then(() => {
        return admin.database().ref('groups/' + groupId).once('value').then((snap) => {
            let group = snap.val();
            let appIds = group.app_ids || [];

            appIds.unshift(appId);
            let _group = {
                app_ids: appIds
            };

            return admin.database().ref('groups/' + groupId).update(_group);
        });
    }).then(() => {
        // 將資料庫中的 app 資料完整取出後回傳
        return admin.database().ref('apps/' + appId).once('value');
    }).then((snap) => {
        let appInDB = snap.val() || {};
        let apps = {
            [appId]: appInDB
        };
        callback(apps);
    }).catch(() => {
        callback(null);
    });
};

apps.update = (appId, putApp, callback) => {
    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('apps/' + appId).once('value', snap => {
                var app = snap.val();
                if (undefined === app || '' === app || null === app) {
                    reject(new Error());
                    return;
                }

                // 已刪除資料不能更新
                if (1 === app.delete) {
                    reject(new Error());
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        putApp.updatedTime = Date.now();
        return admin.database().ref('apps/' + appId).update(putApp);
    }).then(() => {
        return admin.database().ref('apps/' + appId).once('value');
    }).then((snap) => {
        var app = snap.val();
        var apps = {
            [appId]: app
        };
        return Promise.resolve(apps);
    }).then((apps) => {
        callback(apps);
    }).catch(() => {
        callback(null);
    });
};

apps.remove = (appId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    var deleteApp = {
        isDeleted: 1,
        updatedTime: Date.now()
    };
    procced.then(() => {
        return admin.database().ref('apps/' + appId).update(deleteApp);
    }).then(() => {
        return admin.database().ref('apps/' + appId).once('value');
    }).then((snap) => {
        var app = snap.val();
        var apps = {
            [appId]: app
        };
        return Promise.resolve(apps);
    }).then((apps) => {
        callback(apps);
    }).catch(() => {
        callback(null);
    });
};

module.exports = apps;