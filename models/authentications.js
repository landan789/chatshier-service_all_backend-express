module.exports = (function() {
    function AuthenticationsModel() {};
    const admin = require('firebase-admin');
    /**
     * 藉由 firebase.admin.auth 與 email 取得該 Authentication 帳號資訊
     * @param {string|string[]} userIds
     * @param {string|string[]} emails
     * @param {Function} callback
     */
    AuthenticationsModel.prototype.findUser = function(userIds, emails, callback) {
        if ('string' === typeof userIds || !userIds) {
            userIds = [userIds];
        };

        if ('string' === typeof emails || !emails) {
            emails = [emails];
        };

        let authentications = {};
        let findUsersPromise = Promise.all(userIds.map((userId) => {
            if (!userId || '0' === userId) {
                return Promise.resolve(null);
            };
            return admin.auth().getUser(userId).then((userRecord) => {
                if (!userRecord) {
                    return null;
                };

                authentications[userRecord.uid] = userRecord;
                return userRecord;
            });
        }));

        let findEmailsPromise = Promise.all(emails.map((email) => {
            if (!email || '0' === email) {
                return Promise.resolve(null);
            };
            return admin.auth().getUserByEmail(email).then((userRecord) => {
                if (!userRecord) {
                    return null;
                };

                authentications[userRecord.uid] = userRecord;
                return userRecord;
            });
        }));

        Promise.all([findUsersPromise, findEmailsPromise]).then(() => {
            callback(authentications);
        }).catch((ERROR) => {
            callback(null);
        });
    };

    return new AuthenticationsModel();
})();
