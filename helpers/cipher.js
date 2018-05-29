module.exports = (function() {
    const crypto = require('crypto');
    const CHATSHIER = require('../config/chatshier');

    class CipherHelper {
        /**
         * encode user.password from original string to encoded string
         * @param {string} password
         */
        encode(password) {
            if (!password) {
                return password;
            };
            let hmac = crypto.createHmac(CHATSHIER.CRYPTO.ALGORITHM, CHATSHIER.CRYPTO.SECRET);
            hmac.write(password);
            return hmac.digest('hex');
        }
    }
    return new CipherHelper();
})();
