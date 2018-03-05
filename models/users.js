module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    const SCHEMA = require('../config/schema');

    function UsersModel() {}

    /**
     * 根據 使用者ID 取得該使用者
     * @param {string} userId
     * @param {function} callback
     * @returns {object} 
     */

    UsersModel.prototype.findUser = function(userId, callback) {
        admin.database().ref('users/' + userId).once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.insert = function(userId, user, callback) {
        let users = {};

        Promise.resolve().then(() => {
            user = Object.assign(SCHEMA.USER, user);
            return admin.database().ref('users/' + userId).push(user);
        }).then(() => {
            return admin.database().ref('users/' + userId).once('value');
        }).then((snap) => {
            let user = snap.val();
            users = {
                [userId]: user
            };
            callback(users);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據輸入的使用者 ID 取得使用者擁有的 appId 清單
     *
     * @param {string} userId
     * @param {(appIds: string[]) => any} callback
     */
    UsersModel.prototype.findAppIdsByUserId = function(userId, callback) {
        admin.database().ref('users/' + userId + '/app_ids').once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.findCalendarIdByUserId = function(userId, callback) {
        admin.database().ref('users/' + userId + '/calendar_id').once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

    UsersModel.prototype.updateUserByUserId = function(userId, user, callback) {
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
