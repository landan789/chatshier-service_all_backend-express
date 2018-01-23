var admin = require("firebase-admin"); //firebase admin SDK
var usersModel = {};
usersModel.get = callback => {
    admin.database().ref('users/').once('value', snap => {
        let data = snap.val();
        callback(data);
    });
}
usersModel.findUserByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId).once('value', snap => {
        let data = snap.val();
        callback(data);
    });
}

usersModel.findAppIdsByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId + '/app_ids').on('value', snap => {
        let data = snap.val();
        callback(data);
    });
}

usersModel.findCalendarIdByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId + '/calendar_id').on('value', snap => {
        let data = snap.val();
        callback(data);
    });
}

usersModel.findUserByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId).once('value', snap => {
        let data = snap.val();
        callback(data);
    });
}

usersModel.updateUserByUserId = (userId, obj) => {
    admin.database().ref('users/' + userId).update(obj);
}
module.exports = usersModel;