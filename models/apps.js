var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

apps._init = (callback) => {

    var json = {
        id1 : "",
        id2 : "",
        name : "",
        secret : "",
        token1 : "",
        token2 : "",
        type : "",
        user_id : "",
        webhook_id : ""
    };
    callback(json);
      
}
apps.findByAppId = (appId, callback) =>{
    var ref = 'apps/' + appId;
    admin.database().ref(ref).once('value', snap => {
        var apps = {};
        apps[snap.key] = snap.val();
        callback(apps);
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
            this.getAppsByAppIds(appIds, (data) => {
                var apps = data;
                resolve(apps);
            });
        });
    });



}


apps.getAppsByAppIds = (appIds, callback) => {
    var a = appIds;

    var apps = {};
    next(0, callback);


    function next(i, cb) {
        var p = new Promise((resolve, reject) => {
            resolve();
        });

        p.then(() => {
            return new Promise((resolve, reject) => {
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
                    var key = snap.key;
                    if (null === app || undefined === app || '' === app) {
                        resolve(apps);
                        return;
                    }

                    apps[key] = app;
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

apps.insertByUserid = (userid, postData, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced
    .then(()=>{
        return new Promise((resolve, reject)=>{
            this._init((json)=>{
                resolve(json);
            });
        });
    }).then((json)=>{

        admin.database().ref('apps').set(postData);
    }).catch(()=>{
        callback(false);
    });
}


module.exports = apps;