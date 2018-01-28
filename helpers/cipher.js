module.exports = (function() {
    const crypto = require('crypto');
    const SECRET_KEY = 'chatshier777';
    const ALGORITHM = 'sha1';

    function ChatshierCipher() {}

    /**
     * 產生一組不可逆的 hash key
     *
     * @param {string} content
     */
    ChatshierCipher.prototype.createHashKey = function(content) {
        if (!content) {
            return content;
        }
        let sum = crypto.createHmac(ALGORITHM, SECRET_KEY);
        sum.write(content);
        return sum.digest('hex');
    };

    return new ChatshierCipher();
})();
