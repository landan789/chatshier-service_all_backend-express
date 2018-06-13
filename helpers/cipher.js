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

        /**
         * @param {number} [len=20]
         */
        generateRandomHex(len = 20) {
            return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
        }
    }
    return new CipherHelper();
})();
