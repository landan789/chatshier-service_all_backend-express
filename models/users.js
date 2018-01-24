var admin = require("firebase-admin"); //firebase admin SDK
var users = {};
users.get = callback => {
    admin.database().ref('users/').once('value', snap => {
        let data = snap.val();
        callback(data);
    });
};
users.findUserByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId).once('value', snap => {
        let data = snap.val();
        callback(data);
    });
};

users.findAppIdsByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId + '/app_ids').on('value', snap => {
        let data = snap.val();
        callback(data);
    });
};

users.findCalendarIdByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId + '/calendar_id').on('value', snap => {
        let data = snap.val();
        callback(data);
    });
};

users.findUserByUserId = (userId, callback) => {
    admin.database().ref('users/' + userId).once('value', snap => {
        let data = snap.val();
        callback(data);
    });
};

users.updateUserByUserId = (userId, obj) => {
    admin.database().ref('users/' + userId).update(obj);
};
module.exports = users;