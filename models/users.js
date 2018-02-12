module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function UsersModel() {}

    UsersModel.prototype.get = function(callback) {
        admin.database().ref('users/').once('value', snap => {
            let data = snap.val();
            callback(data);
        });
    };

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

    UsersModel.prototype.findUser = function(userId, callback) {
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
