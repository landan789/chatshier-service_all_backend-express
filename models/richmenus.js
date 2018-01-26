var admin = require("firebase-admin"); //firebase admin SDK
var richmenus = {};

richmenus._schema = (callback) => {

    var json = {
        size: {
            height: "",
            width: ""
        },
        name: "",
        selected: "",
        chatBarText: "",
        areas: [{
            bounds: {
                height: "",
                wigth: "",
                x: "",
                y: "",
            },
            action: {
                data: "",
                text: "",
            }
        }],
        delete: 0
    };
    callback(json);
}

richmenus.findAllByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/richmenus').once('value', snap => {
        let info = snap.val();
        callback(info);
    });
}

richmenus.findOneByAppIdByRichmenuId = (appId, richmenuId, callback) => {
    var richmenu = {};
    admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).once('value', snap => {
        let data = snap.val();
        let key = snap.key;
        richmenu[key] = data;
        callback(richmenu);
    });
}

richmenus.insertByAppId = (appId, postRichmenu, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenus._schema((initRichmenu) => {
                    resolve(initRichmenu);
                });
            });
        }).then((initRichmenu) => {
            return new Promise((resolve, reject) => {
                var richmenu = Object.assign(initRichmenu, postRichmenu);
                resolve(richmenu);
            });
        })
        .then((richmenu) => {
            let richmenusId = admin.database().ref('apps/' + appId + '/richmenus').push().key;
            return admin.database().ref('apps/' + appId + '/richmenus/' + richmenusId).update(richmenu);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        })

}

richmenus.updateByAppIdByRichmenuId = (appId, richmenuId, obj, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });
    procced
        .then(() => {
            return admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).update(obj);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        })
}

richmenus.removeByAppIdByRichmenuId = (appId, richmenuId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    deleteRichmenu = {
        delete: 1
    }

    procced
        .then(() => {
            return admin.database().ref('apps/' + appId + '/richmenus/' + richmenuId).update(deleteRichmenu);
        })
        .then(() => {
            callback(true);
        })
        .catch(() => {
            callback(false);
        })
}

module.exports = richmenus;