var admin = require('firebase-admin'); // firebase admin SDK
var apps = {};

apps._schema = (callback) => {
    var json = {
        id1: '',
        id2: '',
        name: '',
        secret: '',
        token1: '',
        token2: '',
        type: '',
        user_id: '',
        webhook_id: '',
        isDeleted: 0
    };
    callback(json);
};

apps.findByAppId = (appId, callback) => {
    var ref = 'apps/' + appId;
    admin.database().ref(ref).once('value', snap => {
        var app = snap.val();
        delete app.keywordreplies;
        delete app.autoreplies;
        delete app.templates;
        delete app.greetings;
        delete app.composes;

        var apps = {};
        apps[snap.key] = app;
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
        callback(false);
    });
};

apps.findAppsByAppIds = (appIds, callback) => {
    var apps = {};

    Promise.all(appIds.map((appId) => {
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

            delete app.autoreplies;
            delete app.templates;
            apps[appId] = app;
            return Promise.resolve();
        });
    })).then(() => {
        callback(apps);
    }).catch(() => {
        callback(null);
    });
};

apps.insert = (userId, postApp, callback) => {
    var groupId = postApp.group_id;
    var appId;
    var app;
    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            apps._schema(initApp => {
                resolve(initApp);
            });
        });
    }).then((initApp) => {
        app = Object.assign(initApp, postApp);

        return new Promise((resolve, reject) => {
            appId = admin.database().ref('apps').push(app).key;
            resolve(appId);
        });
    }).then((appId) => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId).once('value', (snap) => {
                var user = snap.val();
                var _groupIds = user.group_ids;

                // 當下 user 沒有 該 group ，則不能新增 app
                if (0 > _groupIds.indexOf(groupId)) {
                    return Promise.reject();
                };

                var appIds = !user.hasOwnProperty('app_ids') ? [] : user.app_ids;
                if (null === user || '' === user || undefined === user) {
                    reject(new Error());
                    return;
                }
                var n = appIds.length;
                var i;
                for (i = 0; i < n; i++) {
                    var _appId = appIds[i];
                    if (_appId === appId) {
                        appIds.slice(i, 1);
                    }
                }

                appIds.unshift(appId);
                resolve(appIds);
            });
        });
    }).then((appIds) => {
        return new Promise((resolve, reject) => {
            var webhook = {
                app_id: appIds[0]
            };

            admin.database().ref('webhooks').push(webhook).then((ref) => {
                var webhookId = ref.key;
                var user = {
                    app_ids: appIds
                };
                app = {
                    webhook_id: webhookId
                };
                return app;
            }).then((app) => {
                return admin.database().ref('apps/' + appIds[0]).update(app);
            }).then(() => {
                return admin.database().ref('groups/' + groupId).once('value');
            }).then((snap) => {
                var group = snap.val();
                var appIds = group.app_ids || [];
                appIds.unshift(appId);
                var _group = {
                    app_ids: appIds
                };

                return admin.database().ref('groups/' + groupId).update(_group);
            }).then(() => {
                resolve();
            });
        });
    }).then(() => {
        return admin.database().ref('apps/' + appId).once('value');
    }).then((snap) => {
        app = snap.val();
        var apps = {
            [appId]: app
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
        isDeleted: 1
    };
    deleteApp.updatedTime = Date.now();

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