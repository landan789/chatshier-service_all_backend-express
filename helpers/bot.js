module.exports = (function() {
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const line = require('@line/bot-sdk');
    const facebook = require('facebook-bot-messenger');

    function BotHelper() {};

    BotHelper.prototype.sendMessages = function(replyToken, Uid, messages, type) {
        switch (type) {
            case LINE:
                return line.replyMessage(replyToken, messages);
            case FACEBOOK:
                return Promise.all(messages.map((message) => {
                    return facebook.sendTextMessage(Uid, message);
                }));
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
    BotHelper.prototype.replyMessages = function(fbBot, psid, msgStr, callback) {
        sendMessage(0, callback);

        function sendMessage(index, cb) {
            let proceed = Promise.resolve();

            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (index >= msgStr.length) {
                        reject(new Error());
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
     * @param {Object} app
     * @param {Function} callback
     */
    BotHelper.prototype.sendMessage = function(bot, receiverId, app, callback) {
        switch (app.textType) {
            case 'image':
                bot.sendImageMessage(receiverId, app.src, true);
                callback();
                break;
            case 'audio':
                bot.sendAudioMessage(receiverId, app.src, true);
                callback();
                break;
            case 'video':
                bot.sendVideoMessage(receiverId, app.src, true);
                callback();
                break;
            default:
                bot.sendTextMessage(receiverId, app.msg);
                callback();
        }
    };

    BotHelper.prototype._lineFileBinaryConvert = function(linebot, event, callback) {
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

    /**
     * @param {LineWebhookEventObject} event
     * @param {ChatshierMessageInterface} message
     * @param {(outMessages: ChatshierMessageInterface[]) => any} callback
     */
    BotHelper.prototype.lineMessageType = function(linebot, event, message, callback) {
        let outMessages = [];

        switch (event.message.type) {
            case 'text':
                let text = event.message.text;
                message.text = text;
                outMessages.push(message);
                callback(outMessages);
                break;
            case 'sticker':
                let stickerId = event.message.stickerId;
                let stickerUrl = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                message.text = '';
                message.src = stickerUrl;
                outMessages.push(message);
                callback(outMessages);
                break;
            case 'location':
                let latitude = event.message.latitude;
                let longitude = event.message.longitude;
                let locationUrl = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                message.text = '';
                message.src = locationUrl;
                outMessages.push(message);
                callback(outMessages);
                break;
            default:
                instance._lineFileBinaryConvert(linebot, event, (url) => {
                    message.text = '';
                    message.src = url;
                    outMessages.push(message);
                    callback(outMessages);
                });
        }
    };

    /**
     * @param {FacebookMessageEventObject} fbMessage
     * @param {ChatshierMessageInterface} inMessage
     * @param {(outMessage: ChatshierMessageInterface[]) => any} callback
     */
    BotHelper.prototype.facebookMessageType = function(fbMessage, inMessage, callback) { 
        if (!fbMessage.attachments) {
            let outMessages = [inMessage];
            callback(outMessages);
            return;
        }

        let outMessages = fbMessage.attachments.map((attachment) => {
            /** @type {ChatshierMessageInterface} */
            let message = {
                messager_id: inMessage.messager_id,
                from: inMessage.from,
                text: '',
                type: attachment.type
            };

            switch (attachment.type) {
                case 'location':
                    message.src = attachment.payload.coordinates;
                    break;
                case 'fallback':
                    message.src = attachment.fallback;
                    break;
                case 'image':
                case 'video':
                case 'audio':
                case 'file':
                default:
                    message.src = attachment.payload.url;
                    break;
            }
            return message;
        });

        callback(outMessages);
    };

    let instance = new BotHelper();
    return instance;
})();
