module.exports = (function() {
    function AuthenticationsModel() {};
    const admin = require('firebase-admin');
    /**
     * 藉由 firebase.admin.auth 與 email 取得該 Authentication 帳號資訊
     * @param {string|string[]} uerIds
     * @param {string|string[]} emails
     * @param {Function} callback
     */
    AuthenticationsModel.prototype.findUser = function(userIds, emails, callback) {


        if ('string' === typeof userIds || null === userIds) {
            userIds = [userIds];
        };

        if ('string' === typeof emails || null === emails) {
            emails = [emails];
        };

        var authentications = {};
        Promise.all([Promise.all(userIds.map((userId) => {
            if (null === userId || 0 === userId || '0' === userId || undefined === userId) {
                return Promise.resolve();
            };
            return admin.auth().getUser(userId).then((userRecord) => {
                if (null === userRecord || undefined === userRecord || '' === userRecord) {
                    return Promise.resolve(null);
                };

                authentications[userRecord.uid] = userRecord;
                return Promise.resolve(userRecord);
            });
        })), Promise.all(emails.map((email) => {
            if (null === email || 0 === email || '0' === email || undefined === email) {
                return Promise.resolve();
            };
            return admin.auth().getUserByEmail(email).then((userRecord) => {
                if (null === userRecord || undefined === userRecord || '' === userRecord) {
                    return Promise.resolve(null);
                };
                authentications[userRecord.uid] = userRecord;
                return Promise.resolve(userRecord);
            });
        }))]).then(() => {
            callback(authentications);
        }).catch((ERROR) => {
            callback(null);
        });
    };

    return new AuthenticationsModel();
})();