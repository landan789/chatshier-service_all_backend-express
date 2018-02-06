module.exports = (function() {
    function AuthenticationsModel() {};
    const admin = require('firebase-admin');
    /**
     * 藉由 firebase.admin.auth 與 email 取得該 Authentication 帳號資訊
     * @param {string} email
     * @param {Function} callback
     */
    AuthenticationsModel.prototype.findUser = function(email, callback) {
        admin.auth().getUserByEmail(email).then((userRecord) => {
            if (null === userRecord || undefined === userRecord || '' === userRecord) {
                return Promise.reject();
            };
            return Promise.resolve(userRecord);
        }).then((userRecord) => {
            var authentications = {
                [userRecord.uid]: userRecord
            };
            return Promise.resolve(authentications);
        }).then((authentications) => {
            callback(authentications);
        }).catch(() => {
            callback(null);
        });
    };

    return new AuthenticationsModel();
})();