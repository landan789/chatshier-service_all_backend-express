module.exports = (function() {
    const line = require('@line/bot-sdk');
    const bodyParser = require('body-parser');
    const facebook = require('facebook-bot-messenger'); // facebook串接

    const SCHEMA = require('../config/schema');
    const appsMessagersMdl = require('../models/apps_messagers');
    const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');

    // app type defined
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';

    // messager type defined
    const SYSTEM = 'SYSTEM';

    class BotService {
        constructor() {
            this.bots = {};
        }

        init(appId, app) {
            return new Promise((resolve, reject) => {
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
            // if (this.bots[appId]) {
            //     return Promise.resolve(this.bots[appId]);
            // }

            return new Promise((resolve, reject) => {
                switch (app.type) {
                    case LINE:
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        line.middleware(lineConfig)(req, res, () => {
                            let lineBot = new line.Client(lineConfig);
                            this.bots[appId] = lineBot;
                            resolve(lineBot);
                        });
                        break;
                    case FACEBOOK:
                        bodyParser.json()(req, res, () => {
                            let facebookConfig = {
                                pageID: app.id1,
                                appID: app.id2 || '',
                                appSecret: app.secret,
                                validationToken: app.token1,
                                pageToken: app.token2 || ''
                            };
                            // fbBot 因為無法取得 json 因此需要在 bodyParser 才能解析，所以拉到這層
                            let facebookBot = facebook.create(facebookConfig, server);
                            this.bots[appId] = facebookBot;
                            resolve(facebookBot);
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
         * @returns {Promise<any>}
         */
        multicast(recipientIds, messages, appId, app) {
            // 把 messages 分批，每五個一包，因為 line.multicast 方法 一次只能寄出五次
            let multicasts = [];
            while (messages.length > 5) {
                multicasts.push(messages.splice(0, 5));
            }
            multicasts.push(messages);
            let bot = this.bots[appId];

            switch (app.type) {
                case LINE:
                    if (!bot) {
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        bot = new line.Client(lineConfig);
                        this.bots[appId] = bot;
                    }

                    let sendLineMulticastsWithRecursive = (multicasts) => {
                        return (function nextPromise(i) {
                            if (i >= multicasts.length) {
                                return Promise.resolve();
                            }

                            let messages = multicasts[i];
                            return bot.multicast(recipientIds, messages).then(() => {
                                // 每完成發送一次 1 ~ 5 筆的 multicast messages
                                // 就進行資料庫寫入，流程為 發送 multicast -> 寫資料庫 -> 下一筆 multicast
                                return Promise.all(recipientIds.map((messagerId) => {
                                    // 從資料庫中抓取出接收人的 chatroomId
                                    // 將已發送的所有訊息新增到此 chatroom 裡
                                    return appsMessagersMdl.findMessagerChatroomId(appId, messagerId).then((chatroomId) => {
                                        if (!chatroomId) {
                                            return Promise.reject(new Error(messagerId + ' chatroomId not found'));
                                        }

                                        return Promise.all(messages.map((message) => {
                                            let _message = {
                                                from: SYSTEM,
                                                messager_id: '',
                                                text: message.text,
                                                time: Date.now(),
                                                type: 'text'
                                            };
                                            message = Object.assign(SCHEMA.APP_CHATROOM_MESSAGE, message, _message);
                                            console.log('[database] insert to db each message each messager[' + messagerId + '] ... ');
                                            return appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, message);
                                        }));
                                    });
                                }));
                            }).then(() => {
                                return nextPromise(i + 1);
                            });
                        })(0);
                    };

                    return sendLineMulticastsWithRecursive(multicasts);
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
                    }

                    let sendFbMessagesWithRecursive = (recipientId, chatroomId, messages) => {
                        return (function nextPromise(i) {
                            if (i >= messages.length) {
                                return Promise.resolve();
                            }

                            let message = messages[i];
                            return bot.sendTextMessage(recipientId, message.text).then(() => {
                                let _message = {
                                    from: SYSTEM,
                                    messager_id: '',
                                    text: message.text,
                                    time: Date.now(),
                                    type: 'text'
                                };
                                message = Object.assign(SCHEMA.APP_CHATROOM_MESSAGE, message, _message);
                                console.log('[database] insert to db each message each messager[' + recipientId + '] ... ');
                                return appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, message);
                            }).then(() => {
                                return nextPromise(i + 1);
                            });
                        })(0);
                    };

                    return Promise.all(multicasts.map((messages) => {
                        return Promise.all(recipientIds.map((messagerId) => {
                            return appsMessagersMdl.findMessagerChatroomId(appId, messagerId).then((chatroomId) => {
                                if (!chatroomId) {
                                    return Promise.reject(new Error(messagerId + ' chatroomId not found'));
                                }
                                return sendFbMessagesWithRecursive(messagerId, chatroomId, messages);
                            });
                        }));
                    }));
                default:
                    return Promise.resolve([]);
            }
        }
    }

    return new BotService();
})();
