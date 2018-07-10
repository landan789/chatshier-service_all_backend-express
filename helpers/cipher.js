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
            }
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

        /**
         * @param {string} plainText
         * @param {string} key
         * @param {string} iv
         * @param {string} [algorithm='aes-256-cbc']
         * @param {boolean} [shouldAppendFinal=false]
         */
        aesEncrypt(plainText, key, iv, algorithm = 'aes-256-cbc', shouldAppendFinal = false) {
            let encipher = crypto.createCipheriv(algorithm, key, iv);
            let encrypted = encipher.update(plainText, 'utf8', 'hex');
            return encrypted + (shouldAppendFinal ? encipher.final('hex') : '');
        }

        /**
         * @param {string} encryptedText
         * @param {string} key
         * @param {string} iv
         * @param {string} [algorithm='aes-256-cbc']
         */
        aesDecrypt(encryptedText, key, iv, algorithm = 'aes-256-cbc') {
            let decrypt = crypto.createDecipheriv(algorithm, key, iv);
            decrypt.setAutoPadding(false);
            let text = decrypt.update(encryptedText, 'hex', 'utf8');
            // eslint-disable-next-line no-control-regex
            let plainText = text.replace(/[\x00-\x20]+/g, '');
            return plainText;
        }

        /**
         * @param {string} rawText
         * @param {string} [algorithm='sha256']
         */
        createHash(rawText, algorithm = 'sha256') {
            return crypto.createHash(algorithm).update(rawText).digest('hex');
        }
    }
    return new CipherHelper();
})();
