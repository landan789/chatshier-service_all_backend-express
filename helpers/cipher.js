module.exports = (function() {
    const crypto = require('crypto');
    const chatshierConfig = require('../config/chatshier_config');
    const SECRET = chatshierConfig.SECRET;

    function Cipher() {}

    /**
     * 產生一組不可逆的 hash key
     *
     * @param {string} content
     */
    Cipher.prototype.createHashKey = function(content) {
        if (!content) {
            return content;
        }
        let sum = crypto.createHmac(SECRET.ALGORITHM, SECRET.APP_MESSAGE_KEY);
        sum.write(content);
        return sum.digest('hex');
    };

    return new Cipher();
})();
