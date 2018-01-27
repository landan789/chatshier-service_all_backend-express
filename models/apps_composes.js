var admin = require("firebase-admin"); //firebase admin SDK
var composes = {};

composes._schema = (callback) => {

    var json = {
        time: "",
        titleStaus: "",
        type: "",
        text: "",
        app: "",
        isdelete: 0
    };
    callback(json);
}

composes.findAllByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/composes/').once('value', snap => {
        let info = snap.val();
        callback(info);
    });
}

composes.findOneByAppIdByComposesId = (appId, composesId, callback) => {
    var composes = {};
    admin.database().ref('apps/' + appId + '/composes/' + composesId).once('value', snap => {
        let data = snap.val();
        let key = snap.key;
        composes[key] = data;
        callback(composes);
    });
}

composes.insertByAppId = (appId, postComposes, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });
    procced
        .then(() => {
            return new Promise((resolve, reject) => {
                composes._schema((initComposes) => {
                    resolve(initComposes);
                });
            });
        }).then((initComposes) => {
            return new Promise((resolve, reject) => {
                var composes = Object.assign(initComposes, postComposes);
                resolve(composes);
            });
        })
        .then((composes) => {
            return admin.database().ref('apps/' + appId + '/composes').push()
                .then((ref) => {
                    var composesId = ref.key;
                    return admin.database().ref('apps/' + appId + '/composes/' + composesId).update(composes);
                })
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        })

}


composes.updateByAppIdByComposesId = (appId, composesId, obj, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });
    procced
        .then(() => {
            return admin.database().ref('apps/' + appId + '/composes/' + composesId).update(obj);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        })
}


composes.removeByAppIdByComposesId = (appId, composesId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    deleteComposes = {
        delete: 1
    }

    procced
        .then(() => {
            return admin.database().ref('apps/' + appId + '/composes/' + composesId).update(deleteComposes);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        })
}
module.exports = composes;