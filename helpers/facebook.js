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
     * @param {string} receiverId
     * @param {Object} apps
     * @param {Function} callback
     */
    Facebook.prototype.sendMessage = function(bot, receiverId, apps, callback) {
        switch (apps.textType) {
            case 'image':
                bot.sendImageMessage(receiverId, apps.url, true);
                callback();
                break;
            case 'audio':
                bot.sendAudioMessage(receiverId, apps.url, true);
                callback();
                break;
            case 'video':
                bot.sendVideoMessage(receiverId, apps.url, true);
                callback();
                break;
            default:
                bot.sendTextMessage(receiverId, apps.msg);
                callback();
        }
    };

    return new Facebook();
})();
