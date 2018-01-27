var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

apps._schema = (callback) => {
    var json = {
        id1: "",
        id2: "",
        name: "",
        secret: "",
        token1: "",
        token2: "",
        type: "",
        user_id: "",
        webhook_id: "",
        isDeleted: 0
    };
    callback(json);
};

apps.findByAppId = (appId, callback) => {
    var ref = "apps/" + appId;
    admin.database().ref(ref).once("value", snap => {
        var app = snap.val();
        delete app.autoreplies;
        delete app.templates;

        var apps = {};
        apps[snap.key] = app;
        callback(apps);
    });
};

apps.findAppByWebhookId = (webhookId, callback) => {
    var procced = Promise.resolve();

    procced.then(() => {
        return admin.database().ref('webhooks/' + webhookId).once('value');
    }).then((snap) => {
        var webhook = snap.val();
        var appId = webhook.app_id;
        return admin.database().ref('apps/' + appId).once('value');;
    }).then((snap) => {
        var app = snap.val();
        callback(app);
    }).catch((error) => {
        callback(false);
    });
};

apps.findAppsByAppIds = (appIds, callback) => {

    var apps = {};

    Promise.all(appIds.map((appId) => {

        return admin.database().ref("apps/" + appId).once('value').then((snap) => {
            let app = snap.val();

            // DB 沒有取到資料
            if (null === app || undefined === app || '' === app) {
                return Promise.resolve(null);
            }

            // 已刪除資料，不呈現於 API
            if (app.hasOwnProperty('isDeleted') && 1 === app.isDeleted) {
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

apps.insertByUserid = (userid, postApp, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return new Promise((resolve, reject) => {
            apps._schema(initApp => {
                resolve(initApp);
            });
        });
    }).then((initApp) => {
        var app = Object.assign(initApp, postApp);

        return new Promise((resolve, reject) => {
            var appId = admin.database().ref("apps").push(app).key;
            resolve(appId);
        });
    }).then((appId) => {
        return new Promise((resolve, reject) => {
            admin.database().ref("users/" + userid).once("value", snap => {
                var user = snap.val();
                var appIds = !user.hasOwnProperty("app_ids") ? [] : user.app_ids;
                if (null === user || "" === user || undefined === user) {
                    reject();
                    return;
                }
                var n = appIds.length;
                var i;
                for (i = 0; i < n; i++) {
                    var _appId = appIds[i];
                    if (_appId == appId) {
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

            admin.database().ref("webhooks").push(webhook).then((ref) => {
                var webhookId = ref.key;
                var user = {
                    app_ids: appIds
                };
                var app = {
                    webhook_id: webhookId
                };
                return Promise.all([admin.database().ref("users/" + userid).update(user), app]);
            }).then((result) => {
                var app = result[1];
                return admin.database().ref("apps/" + appIds[0]).update(app);
            }).then(() => {
                resolve();
            });

        });
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

apps.updateByAppId = (appId, putApp, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref("apps/" + appId).once("value", snap => {
                var app = snap.val();
                if (undefined === app || "" === app || null === app) {
                    reject();
                    return;
                }

                // 已刪除資料不能更新
                if (1 === app.delete) {
                    reject();
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        return admin.database().ref("apps/" + appId).update(putApp);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

apps.removeByAppId = (appId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    deleteApp = {
        isDeleted: 1
    };

    procced.then(() => {
        return admin.database().ref("apps/" + appId).update(deleteApp);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

module.exports = apps;