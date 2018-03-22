module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    const SCHEMA = require('../config/schema');

    function UsersModel() {}

    /**
     * 根據 使用者ID 取得該使用者
     *
     * @param {string} userId
     * @param {string|null} email
     * @param {(data: any) => any} callback
     * @returns {void}
     */
    UsersModel.prototype.find = function(userId, email, callback) {
        admin.database().ref('users/' + userId).once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.insert = function(userId, user, callback) {
        let users = {};
        user = Object.assign(SCHEMA.USER, user);

        admin.database().ref('users/' + userId).once('value').then((snap) => {
            let _user = snap.val();
            if (_user) {
                // 使用者已經存在無法新增
                return Promise.reject(new Error());
            };
            return admin.database().ref('users/' + userId).set(user);
        }).then(() => {
            users = {
                [userId]: user
            };
            callback(users);
        }).catch(() => {
            callback(null);
        });
    };
    UsersModel.prototype.findCalendarId = function(userId, callback) {
        admin.database().ref('users/' + userId + '/calendar_id').once('value', snap => {
            let data = snap.val();
            callback(data);
        }).catch(() => {
            callback(null);
        });
    };

    UsersModel.prototype.update = function(userId, user, callback) {
        admin.database().ref('users/' + userId).update(user).then(() => {
            let users = {
                [userId]: user
            };
            callback(users);
        }).catch(() => {
            callback(null);
        });
    };

    return new UsersModel();
})();
