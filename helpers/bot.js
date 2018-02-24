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
        return linebot.getMessageContent(event.message.id).then((stream) => {
            let bufs = [];
            stream.on('data', (chunk) => {
                bufs.push(chunk);
            });

            stream.on('end', () => {
                let buf = Buffer.concat(bufs);
                let base64Data = buf.toString('base64');
                let base64Url = '';
                switch (event.message.type) {
                    case 'image':
                        base64Url = 'data:image/png;base64,' + base64Data;
                        break;
                    case 'audio':
                        base64Url = 'data:audio/m4a;base64,' + base64Data;
                        break;
                    case 'video':
                        base64Url = 'data:video/mp4;base64,' + base64Data;
                        break;
                }
                callback(base64Url);
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
     * @param {ChatshierMessageInterface} prototypeMsg
     * @param {(outMessages: ChatshierMessageInterface[]) => any} callback
     */
    BotHelper.prototype.convertMsgByLineMsgType = function(linebot, event, prototypeMsg, callback) {
        /** @type {ChatshierMessageInterface} */
        let _message = {
            from: prototypeMsg.from,
            time: prototypeMsg.time,
            text: '',
            type: prototypeMsg.type,
            messager_id: prototypeMsg.messager_id
        };

        Promise.resolve().then(() => {
            switch (event.message.type) {
                case 'text':
                    let text = event.message.text;
                    _message.text = text;
                    return;
                case 'sticker':
                    let stickerId = event.message.stickerId;
                    let stickerUrl = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                    _message.src = stickerUrl;
                    return;
                case 'location':
                    let latitude = event.message.latitude;
                    let longitude = event.message.longitude;
                    let locationUrl = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                    _message.src = locationUrl;
                    return;
                case 'image':
                default:
                    return new Promise((resolve) => {
                        instance._lineFileBinaryConvert(linebot, event, (url) => {
                            _message.src = url;
                            resolve();
                        });
                    });
            }
        }).then(() => {
            let outMessages = [_message];
            callback(outMessages);
        });

        switch (event.message.type) {
            case 'text':
                let text = event.message.text;
                _message.text = text;
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
            case 'image':
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
     * @param {ChatshierMessageInterface} prototypeMsg
     * @param {(outMessage: ChatshierMessageInterface[]) => any} callback
     */
    BotHelper.prototype.convertMsgByFbAttachType = function(fbMessage, prototypeMsg, callback) { 
        if (!fbMessage.attachments) {
            let outMessages = [prototypeMsg];
            callback(outMessages);
            return;
        }

        let outMessages = fbMessage.attachments.map((attachment) => {
            /** @type {ChatshierMessageInterface} */
            let _message = {
                from: prototypeMsg.from,
                time: prototypeMsg.time,
                text: '',
                type: attachment.type,
                messager_id: prototypeMsg.messager_id
            };

            switch (attachment.type) {
                case 'location':
                    let coordinates = attachment.payload.coordinates;
                    let latitude = coordinates.lat;
                    let longitude = coordinates.long;
                    let locationUrl = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                    _message.src = locationUrl;
                    break;
                case 'fallback':
                    _message.text = attachment.fallback.title;
                    _message.src = attachment.fallback.url;
                    break;
                case 'image':
                case 'video':
                case 'audio':
                case 'file':
                default:
                    _message.src = attachment.payload.url;
                    break;
            }
            return _message;
        });

        callback(outMessages);
    };

    let instance = new BotHelper();
    return instance;
})();
