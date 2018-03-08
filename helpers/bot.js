module.exports = (function() {
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const FOLLOW = 'FOLLOW';
    const line = require('@line/bot-sdk');
    const facebook = require('facebook-bot-messenger');
    let appsGreetingsMdl = require('../models/apps_greetings');

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
     * @param {string} recipientId
     * @param {Object} app
     * @param {Function} callback
     */
    BotHelper.prototype.sendMessage = function(bot, recipientId, app, callback) {
        switch (app.textType) {
            case 'image':
                bot.sendImageMessage(recipientId, app.src, true);
                callback();
                break;
            case 'audio':
                bot.sendAudioMessage(recipientId, app.src, true);
                callback();
                break;
            case 'video':
                bot.sendVideoMessage(recipientId, app.src, true);
                callback();
                break;
            default:
                bot.sendTextMessage(recipientId, app.msg);
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
     * @param {any} bot
     * @param {ChatshierMessageInterface} message
     * @param {string} appType
     * @param {any} option
     * @returns {Promise<ChatshierMessageInterface[]>}
     */
    BotHelper.prototype.convertMessage = function(bot, message, option, app) {
        return Promise.resolve().then(() => {
            switch (app.type) {
                case LINE:
                    /** @type {ChatshierMessageInterface} */
                    let _message = {
                        from: message.from,
                        time: message.time,
                        text: '',
                        type: option.event.message.type,
                        messager_id: message.messager_id
                    };

                    return Promise.resolve().then(() => {
                        switch (option.event.message.type) {
                            case 'text':
                                let text = option.event.message.text;
                                _message.text = text;
                                return [_message];
                            case 'sticker':
                                let stickerId = option.event.message.stickerId;
                                let stickerUrl = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                                _message.src = stickerUrl;
                                return [_message];
                            case 'location':
                                let latitude = option.event.message.latitude;
                                let longitude = option.event.message.longitude;
                                let locationUrl = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                                _message.src = locationUrl;
                                return [_message];
                            case 'image':
                            default:
                                return new Promise((resolve) => {
                                    instance._lineFileBinaryConvert(bot, option.event, (url) => {
                                        _message.src = url;
                                        resolve([_message]);
                                    });
                                });
                        }
                    });
                case FACEBOOK:
                    return Promise.resolve().then(() => {
                        if (!option.message.attachments) {
                            let messages = [message];
                            return Promise.resolve(messages);
                        }

                        return option.message.attachments.map((attachment) => {
                            /** @type {ChatshierMessageInterface} */
                            let _message = {
                                from: message.from,
                                time: message.time,
                                text: '',
                                type: attachment.type,
                                messager_id: message.messager_id
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
                    });
                default:
                    let messages = [message];
                    return Promise.resolve(messages);
            }
        }).then((messages) => {
            return Promise.resolve(messages);
        });
    };

    /**
     * 取得 Chatshier 平台需要回傳的訊息
     */
    BotHelper.prototype.findChatshierReplyMessages = function(type, text, senderId, option, apps) {
        let appId = Object.keys(apps)[0];
        let app = apps[appId];
        return Promise.all([
            new Promise((resolve, reject) => {
                if (FOLLOW !== type) {
                    resolve(null);
                };
                appsGreetingsMdl.findGreetings(appId, (greetings) => {
                    if (null === greetings) {
                        resolve(null);
                    };
                    resolve(greetings);
                });
            }),
            new Promise((resolve, reject) => {

            }),
            new Promise((resolve, reject) => {

            }),
            new Promise((resolve, reject) => {

            })
        ]);

    }

    let instance = new BotHelper();
    return instance;
})();
