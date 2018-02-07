module.exports = (function() {
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    var line = require('@line/bot-sdk');
    var facebook = require('facebook-bot-messenger'); // facebook串接
    function Bot() {};

    Bot.prototype.sendMessages = function(replyToken, Uid, messages, type) {
        switch (type) {
            case LINE:
                return line.replyMessage(replyToken, messages);

            case FACEBOOK:
                return Promise.all(messages.map((message) => {
                    return facebook.sendTextMessage(Uid, message);
                }))
        }
    };

    /**
     * 回覆訊息
     *
     * @param {Object} fbBot
     * @param {string} psid
     * @param {string} msgStr
     * @param {Function} callback
     */
    Bot.prototype.replyMessages = function(fbBot, psid, msgStr, callback) {
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
    Bot.prototype.sendMessage = function(bot, receiverId, apps, callback) {
        switch (apps.textType) {
            case 'image':
                bot.sendImageMessage(receiverId, apps.src, true);
                callback();
                break;
            case 'audio':
                bot.sendAudioMessage(receiverId, apps.src, true);
                callback();
                break;
            case 'video':
                bot.sendVideoMessage(receiverId, apps.src, true);
                callback();
                break;
            default:
                bot.sendTextMessage(receiverId, apps.msg);
                callback();
        }
    };

    Bot.prototype._lineFileBinaryConvert = function(linebot, event, callback) {
        let proceed = Promise.resolve();
        proceed.then(() => {
            return linebot.getMessageContent(event.message.id);
        }).then((stream) => {
            let bufs = [];
            stream.on('data', (chunk) => {
                bufs.push(chunk);
            }).on('end', () => {
                let buf = Buffer.concat(bufs);
                let data = buf.toString('base64');
                let url;
                switch (event.message.type) {
                    case 'image':
                        url = 'data:image/png;base64, ' + data;
                        break;
                    case 'audio':
                        url = 'data:audio/m4a;base64, ' + data;
                        break;
                    case 'video':
                        url = 'data:video/mp4;base64, ' + data;
                        break;
                }
                callback(url);
            });
            stream.on('error', (err) => {
                console.log(err);
            });
        }).catch(() => {
            callback(null);
        });
    };

    Bot.prototype.lineMessageType = function(linebot, event, message, callback) {
        switch (event.message.type) {
            case 'text':
                let text = event.message.text;
                message.text = text;
                callback(message);
                break;
            case 'sticker':
                let stickerId = event.message.stickerId;
                let stickerUrl = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                message.text = '';
                message.src = stickerUrl;
                callback(message);
                break;
            case 'location':
                let latitude = event.message.latitude;
                let longitude = event.message.longitude;
                let locationUrl = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                message.text = '';
                message.src = locationUrl;
                callback(message);
                break;
            default:
                Bot.prototype._lineFileBinaryConvert(linebot, event, (url) => {
                    message.text = '';
                    message.src = url;
                    callback(message);
                });
        }
    };

    Bot.prototype.facebookMessageType = function(message, inMessage, callback) {
        if (message.attachments) {
            switch (message.attachments[0].type) {
                case 'image':
                    inMessage.src = message.attachments[0].payload.url;
                    inMessage.text = '';
                    inMessage.type = message.attachments[0].type;
                    callback(inMessage);
                    break;
                case 'video':
                    inMessage.src = message.attachments[0].payload.url;
                    inMessage.text = '';
                    inMessage.type = message.attachments[0].type;
                    callback(inMessage);
                    break;
                case 'audio':
                    inMessage.src = message.attachments[0].payload.url;
                    inMessage.text = '';
                    inMessage.type = message.attachments[0].type;
                    callback(inMessage);
                    break;
                case 'file':
                    inMessage.src = message.attachments[0].payload.url;
                    inMessage.text = '';
                    inMessage.type = message.attachments[0].type;
                    callback(inMessage);
                    break;
                case 'location':
                    inMessage.src = message.attachments[0].url;
                    inMessage.text = '';
                    inMessage.type = message.attachments[0].type;
                    callback(inMessage);
                    break;
            }
        } else {
            inMessage.text = message.text;
            callback(inMessage);
        }
    };

    return new Bot();
})();
