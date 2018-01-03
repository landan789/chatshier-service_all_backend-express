var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

apps.findByAppId = (appId, callback) =>{
    var ref = 'apps/' + appId;
    admin.database().ref(ref).once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}

apps.getAll = (callback) => {
    admin.database().ref('apps').once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}

apps.getById = (appId, callback) => {
    admin.database().ref('apps/' + appId).once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}

apps.getAppsByUserId = (userId, callback) => {
    var p = new Promise((resolve, reject) => {
        resolve();
    });

    p.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId).once('value', snap => {
                var appIds = snap.val();
                resolve(appIds);
            });
        });
    }).then((data) => {
        var appIds = data;
        return new Promise((resolve, reject) => {
            this.getAppsByAppIds(appIds, () => {

            });
        });
    });



}


apps.getAppsByAppIds = (appIds, callback) => {
    var a = appIds;

    var apps = [];
    next(0, callback);


    function next(i, cb) {
        var p = new Promise((resolve, reject) => {
            resolve();
        });

        p.then(() => {
            return new Promise((resolve, reject) => {
                console.log(appIds);
                if (i >= appIds.length) {
                    reject(apps);
                    return;
                }
                resolve();

            });
        }).then(() => {
            return new Promise((resolve, reject) => {

                var appId = appIds[i];
                admin.database().ref('apps/' + appId).once('value', snap => {
                    var app = snap.val();
                    if (null === app || undefined === app || '' === app) {
                        resolve(apps);
                        return;
                    }

                    apps.push(app);
                    resolve(apps);
                });
            });
        }).then((data) => {
            var apps = data;
            next(i + 1, cb);
        }).catch((data) => {
            cb(data);
        });

    }

}



module.exports = apps;