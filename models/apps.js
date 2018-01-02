var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

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

apps.getAutoById = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies').once('value', snap => {
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

apps.updateKeyFromAutoreplies = (key,element) => {
    admin.database().ref('apps/' + key + '/autoreplies').once('value', (data) => {
        let arr = data.val();
        // console.log(arr)
        if(arr === null) {
            admin.database().ref('apps/' + key + '/autoreplies/0').set(element);
        } else {
            arr.push(element);
            admin.database().ref('apps/' + key + '/autoreplies').set(arr);
        }
    });
}

apps.removeAutoInAppsById = (appId, hash, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies').once('value', (snap) => {
        let arr = snap.val();
        let filteredArr = arr.filter((key) => ( key != hash));
        if(filteredArr.length !== 0) {
            admin.database().ref('apps/' + appId + '/autoreplies').set(filteredArr);
        } else {
            admin.database().ref('apps/' + appId + '/autoreplies').remove();
        }
        callback();
    });
}

module.exports = apps;