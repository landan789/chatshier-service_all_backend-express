module.exports = (function() {
    const line = require('@line/bot-sdk');
    const bodyParser = require('body-parser');
    const facebook = require('facebook-bot-messenger'); // facebook串接

    const SCHEMA = require('../config/schema');

    // app type defined
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';

    // messager type defined

    class BotService {
        constructor() {
            this.bots = {};
        }

        create(appId, app) {
            return new Promise((resolve, reject) => {
                if (this.bots[appId]) {
                    resolve(this.bots[appId]);
                    return;
                }
                switch (app.type) {
                    case LINE:
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        let lineBot = new line.Client(lineConfig);
                        this.bots[appId] = lineBot;
                        resolve(lineBot);
                        break;
                    case FACEBOOK:
                        let facebookConfig = {
                            pageID: app.id1,
                            appID: app.id2 || '',
                            appSecret: app.secret,
                            validationToken: app.token1,
                            pageToken: app.token2 || ''
                        };
                        // fbBot 因為無法取得 json 因此需要在 bodyParser 才能解析，所以拉到這層
                        let facebookBot = facebook.create(facebookConfig);
                        this.bots[appId] = facebookBot;
                        resolve(facebookBot);
                        break;
                }
            });
        };

        /**
         * @param {any} req
         * @param {any} res
         * @param {any} server
         * @param {string} appId
         * @param {any} app
         */
        parser(req, res, server, appId, app) {
            return new Promise((resolve, reject) => {
                switch (app.type) {
                    case LINE:
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        line.middleware(lineConfig)(req, res, () => {
                            resolve({});
                        });
                        break;
                    case FACEBOOK:
                        bodyParser.json()(req, res, () => {
                            resolve({});
                        });
                        break;
                    default:
                        resolve({});
                        break;
                }
            });
        }

        /**
         * 多型處理， 取得 LINE 或 FACEBOOK 來的 customer 用戶端資料
         * @param {string} senderId
         * @param {string} appId
         * @param {*} app
         */
        getProfile(senderId, appId, app) {
            let bot = this.bots[appId];
            if (!bot) {
                return Promise.reject(new Error('bot undefined'));
            }

            return Promise.resolve().then(() => {
                let senderProfile = {
                    name: '',
                    photo: ''
                };

                switch (app.type) {
                    case LINE:
                        return bot.getProfile(senderId).then((lineUserProfile) => {
                            lineUserProfile = lineUserProfile || {};
                            senderProfile.name = lineUserProfile.displayName;
                            senderProfile.photo = lineUserProfile.pictureUrl;
                            return senderProfile;
                        });
                    case FACEBOOK:
                        return bot.getProfile(senderId).then((fbUserProfile) => {
                            fbUserProfile = fbUserProfile || {};
                            senderProfile.name = fbUserProfile.first_name + ' ' + fbUserProfile.last_name;
                            senderProfile.photo = fbUserProfile.profile_pic;
                            return senderProfile;
                        });
                    default:
                        return senderProfile;
                }
            });
        }

        /**
         * @param {string} senderId
         * @param {string} replyToken
         * @param {any[]} messages
         * @param {string} appId
         * @param {any} app
         */
        replyMessage(senderId, replyToken, messages, appId, app) {
            let bot = this.bots[appId];
            if (!bot) {
                return Promise.reject(new Error('bot undefined'));
            }

            return Promise.resolve().then(() => {
                switch (app.type) {
                    case LINE:
                        return bot.replyMessage(replyToken, messages);
                    case FACEBOOK:
                        return Promise.all(messages.map((message) => {
                            switch (message.type) {
                                case 'image':
                                    return bot.sendImageMessage(senderId, message.src);
                                case 'audio':
                                    return bot.sendAudioMessage(senderId, message.src);
                                case 'video':
                                    return bot.sendVideoMessage(senderId, message.src);
                                case 'text':
                                default:
                                    return bot.sendTextMessage(senderId, message.text);
                            }
                        }));
                    default:
                        break;
                }
            });
        }
        /**
         * @param {string[]} recipientIds
         * @param {any[]} messages
         * @param {string} appId
         * @param {any} app
         */
        multicast(messagerIds, messages, appId, app) {
            let bot = this.bots[appId];
            let _multicast;
            switch (app.type) {
                case LINE:
                    if (!this.bots[appId]) {
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        bot = new line.Client(lineConfig);
                        this.bots[appId] = bot;
                    }
                    _multicast = (messagerIds, messages) => {
                        let multicasts = [];
                        // 把 messages 分批，每五個一包，因為 line.multicast 方法 一次只能寄出五次
                        while (messages.length > 5) {
                            multicasts.push(messages.splice(0, 5));
                        }
                        multicasts.push(messages);

                        function nextPromise(i) {
                            if (i >= multicasts.length) {
                                return Promise.resolve();
                            };
                            let messages = multicasts[i];
                            return bot.multicast(messagerIds, messages).then(() => {
                                return nextPromise(i + 1);
                            });
                        };
                        return nextPromise(0);
                    };

                    return _multicast(messagerIds, messages);
                case FACEBOOK:
                    if (!bot) {
                        let facebookConfig = {
                            pageID: app.id1,
                            appID: app.id2 || '',
                            appSecret: app.secret,
                            validationToken: app.token1,
                            pageToken: app.token2 || ''
                        };
                        bot = facebook.create(facebookConfig);
                        this.bots[appId] = bot;
                    };

                    _multicast = (messagerIds, messages) => {
                        return Promise.all(messagerIds.map((messagerId) => {
                            return Promise.all(messages.map((message) => {
                                return bot.sendTextMessage(messagerId, message.text);
                            }));
                        }));
                    };

                    return _multicast(messagerIds, messages);
                default:
                    return Promise.resolve([]);
            }
        }
    }

    return new BotService();
})();
