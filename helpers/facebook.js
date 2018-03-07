module.exports = (function() {
    function Facebook() {};

    /**
     * 回覆訊息
     *
     * @param {Object} fbBot
     * @param {string} psid
     * @param {string} msgStr
     * @param {Function} callback
     */
    Facebook.prototype.replyMessages = function(fbBot, psid, msgStr, callback) {
        sendMessage(0, callback);

        function sendMessage(index, cb) {
            let proceed = Promise.resolve();

            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (index >= msgStr.length) {
                        reject();
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    fbBot.sendTextMessage(psid, msgStr[index].text);
                    resolve();
                });
            }).then(() => {
                sendMessage(index + 1, cb);
            }).catch(() => {
                cb();
            });
        }
    };

    /**
     * 發送FACEBOOK訊息
     *
     * @param {Object} bot
     * @param {string} recipientId
     * @param {ChatshierMessageInterface} message
     */
    Facebook.prototype.sendMessage = function(bot, recipientId, message) {
        return Promise.resolve().then(() => {
            switch (message.type) {
                case 'image':
                    return bot.sendImageMessage(recipientId, message.src, true);
                case 'audio':
                    return bot.sendAudioMessage(recipientId, message.src, true);
                case 'video':
                    return bot.sendVideoMessage(recipientId, message.src, true);
                default:
                    return bot.sendTextMessage(recipientId, message.text);
            }
        });
    };

    return new Facebook();
})();
