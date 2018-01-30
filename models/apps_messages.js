module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsMessagesModel() {}

    /**
     * 根據 appId 與 messageId 取得該訊息的關鍵字回覆
     *
     * @param {string} appId
     * @param {string} messageId
     * @param {Function} callback
     */
    AppsMessagesModel.prototype.findMessage = function(appId, messageId, callback) {
        let proceed = Promise.resolve();

        proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messages/' + messageId).once('value');
        }).then((snap) => {
            let message = snap.val();
            if (null === message || undefined === message || '' === message) {
                return Promise.reject(new Error());
            }
            return Promise.resolve(message);
        }).then((message) => {
            callback(message);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 appId 與 messageId 取得該訊息的關鍵字回覆的 ID 清單
     *
     * @param {string} appId
     * @param {string} messageId
     * @param {Function} callback
     */
    AppsMessagesModel.prototype.findKeywordreplyIds = function(appId, messageId, callback) {
        let proceed = Promise.resolve();

        proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messages/' + messageId).once('value');
        }).then((snap) => {
            let keywordreplies = snap.val();
            if (!keywordreplies) {
                return Promise.reject(new Error());
            }
            callback(keywordreplies.keywordreply_ids);
        }).catch(() => {
            callback(null);
        });
    };

    AppsMessagesModel.prototype.findTemplateIds = function(appId, messageId, callback) {
        let proceed = Promise.resolve();

        proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messages/' + messageId).once('value');
        }).then((snap) => {
            let templatereplies = snap.val();
            if (!templatereplies) {
                return Promise.reject(new Error());
            }
            callback(templatereplies.template_ids);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 appId 與 messageId 更新關鍵字回覆的 ID 清單
     *
     * @param {string} appId
     * @param {string} messageId
     * @param {string[]} keywordreplyIds
     * @param {Function} callback
     */
    AppsMessagesModel.prototype.updateKeywordreplyIds = function(appId, messageId, keywordreplyIds, callback) {
        let proceed = Promise.resolve();

        proceed.then(() => {
            return admin.database().ref('apps/' + appId + '/messages/' + messageId + '/keywordreply_ids').set(keywordreplyIds);
        }).then(() => {
            callback(true);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsMessagesModel();
})();