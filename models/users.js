module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function UsersModel() {}

    UsersModel.prototype.get = function(callback) {
        admin.database().ref('users/').once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.findUserByUserId = function(userId, callback) {
        admin.database().ref('users/' + userId).once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.findAppIdsByUserId = function(userId, callback) {
        admin.database().ref('users/' + userId + '/app_ids').on('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.findCalendarIdByUserId = function(userId, callback) {
        admin.database().ref('users/' + userId + '/calendar_id').on('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.findUserByUserId = function(userId, callback) {
        admin.database().ref('users/' + userId).once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.updateUserByUserId = function(userId, obj, callback) {
        admin.database().ref('users/' + userId).update(obj).then(() => {
            callback();
        });
    };

    return new UsersModel();
})();
