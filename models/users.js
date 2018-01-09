var admin = require("firebase-admin"); //firebase admin SDK
var usersModel = {};
usersModel.get = callback => {
    admin.database().ref('users/').once('value', snap => {
        let Data = snap.val();
        callback(Data);
    });
}
usersModel.getUser = (userId, callback) => {
    admin.database().ref('users/' + userId).once('value', snap => {
        let Data = snap.val();
        callback(Data);
    });
}
usersModel.findUserByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId).once('value', snap => {
        let Data = snap.val();
        callback(Data);
    });
}
usersModel.findAppIdsByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId + '/app_ids').on('value', snap => {
        let data = snap.val();
        callback(data);
    });
}
usersModel.updateUserByUserId = (userId, obj) => {
    admin.database().ref('users/' + userId).update(obj);
}
module.exports = usersModel;