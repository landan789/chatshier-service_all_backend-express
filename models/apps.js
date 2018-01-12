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
        delete: 0
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

apps.findActiveAppsByUserId = (userId, callback) => {

    let procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced
        .then(() => {
            return new Promise((resolve,reject) => {
                admin.database().ref('users/' + userId + '/app_ids').on('value', snap => {
                    let data = snap.val();
                    resolve(data);
                });
            });
        })
        .then((data) => {
            let appids = data;
            return new Promise((resolve,reject) => {
                let active = {};
                appids.map((appId) => {
                    let ref = "apps/" + appId;
                    admin.database().ref(ref).once("value", snap => {
                        let app = snap.val();
                        active[appId] = app;
                        if(Object.keys(active).length === appids.length) {
                            resolve(active);
                        }
                    });
                });
            });
        })
        .then((data) => {
            let appObj = data;
            let appIds = [];
            for(let a in appObj) {
                if(appObj[a].delete === 0) {
                    appIds.push(a);
                }
            }
            callback(appIds);
        })
        .catch(() => {
            console.log('error');
        });

    
};

apps.findAppsByAppIds = (appIds, callback) => {
    var a = appIds;

    var apps = {};
    next(0, callback);

    function next(i, cb) {
        var procced = new Promise((resolve, reject) => {
            resolve();
        });

        procced
            .then(() => {
                return new Promise((resolve, reject) => {
                    if (i >= appIds.length) {
                        reject(apps);
                        return;
                    }
                    resolve();
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    var appId = appIds[i];
                    admin.database().ref("apps/" + appId).once("value", snap => {
                        var app = snap.val();
                        delete app.autoreplies;
                        delete app.templates;
                        var key = snap.key;
                        if (null === app || undefined === app || "" === app) {
                            resolve(apps);
                            return;
                        }

                        apps[key] = app;
                        resolve(apps);
                    });
                });
            })
            .then(data => {
                var apps = data;
                next(i + 1, cb);
            })
            .catch(data => {
                cb(data);
            });
    }
};

apps.insertByUserid = (userid, postApp, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced
        .then(() => {
            return new Promise((resolve, reject) => {
                apps._schema(initApp => {
                    resolve(initApp);
                });
            });
        })
        .then((initApp) => {
            var app = Object.assign(initApp, postApp);

            return new Promise((resolve, reject) => {
                var appId = admin.database().ref("apps").push(app).key;
                resolve(appId);
            });
        })
        .then((appId) => {
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
        })
        .then((appIds) => {
            return new Promise((resolve, reject) => {
                var webhook = {
                    app_id: appIds[0]
                };

                var webhookId = admin.database().ref("webhooks").push(webhook).key;

                var user = {
                    app_ids: appIds
                };

                var app = {
                    webhook_id: webhookId
                };
                admin.database().ref("users/" + userid).update(user)
                    .then(() => {
                        return admin.database().ref("apps/" + appIds[0]).update(app);
                    })
                    .then(() => {
                        resolve();
                    });
            });
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        });
};

apps.updateByAppId = (appId, putApp, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced
        .then(() => {
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
        })
        .then(() => {
            return admin.database().ref("apps/" + appId).update(putApp);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        });
};

apps.removeByAppId = (appId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    deleteApp = {
        delete: 1
    };

    procced
        .then(() => {
            return admin.database().ref("apps/" + appId).update(deleteApp);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        });
};

module.exports = apps;