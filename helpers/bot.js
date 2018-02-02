module.exports = (function() {
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    var line = require('@line/bot-sdk');
    var facebook = require('facebook-bot-messenger'); // facebook串接
    function Bot() {};

    Bot.prototype.sendMessages = function(replyToken, Uid, messages, type) {
        switch (type) {
            case LINE:
                return lineBot.replyMessage(replyToken, messages);

            case FACEBOOK:
                return Promise.all(messages.map((message) => {
                    return fbBot.sendTextMessage(Uid, message);
                }))
        }
    };

    return new Bot();
})();