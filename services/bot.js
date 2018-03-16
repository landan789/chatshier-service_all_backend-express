module.exports = (function() {
    const line = require('@line/bot-sdk');
    const Wechat = require('wechat');
    const WechatAPI = require('wechat-api');
    const bodyParser = require('body-parser');
    const facebook = require('facebook-bot-messenger'); // facebook串接
    const chatshierCfg = require('../config/chatshier');

    const API_ERROR = require('../config/api_error');
    const appsMdl = require('../models/apps');
    const StorageHlp = require('../helpers/storage');

    // app type defined
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const WECHAT = 'WECHAT';

    const LINE_WEBHOOK_VERIFY_UID = 'Udeadbeefdeadbeefdeadbeefdeadbeef';
    const WECHAT_WEBHOOK_VERIFY_TOKEN = 'verify_token';

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
                    case WECHAT:
                        let getToken = (callback) => {
                            // 此 callback 在 instance 被建立會要發 API 時會執行
                            // 從資料庫抓取出目前 app 的 accessToken 回傳給 instance
                            if (app.token1) {
                                let accessToken = {
                                    accessToken: app.token1,
                                    expireTime: app.token1ExpireTime
                                };
                                callback(null, accessToken);
                                return;
                            }
                            callback();
                        };

                        let setToken = (tokenJson, callback) => {
                            // 當 wechat sdk 發送 API 時，沒有 accessToken 或是 accessToken 過期
                            // 會自動抓取新的 accessToken 並呼叫此函式
                            // 此時將新的 wechat app accessToken 更新至資料庫中
                            app.token1 = tokenJson.accessToken;
                            app.token1ExpireTime = tokenJson.expireTime;
                            let _app = {
                                token1: app.token1,
                                token1ExpireTime: app.token1ExpireTime
                            };
                            appsMdl.update(appId, _app, (apps) => {
                                if (!apps) {
                                    callback(API_ERROR.APP_FAILED_TO_UPDATE);
                                    return;
                                }
                                callback();
                            });
                        };
                        this.bots[appId] = new WechatAPI(app.id1, app.secret, getToken, setToken);
                        resolve();
                        break;
                    default:
                        resolve();
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
                    case WECHAT:
                        Wechat(WECHAT_WEBHOOK_VERIFY_TOKEN, () => {
                            resolve({});
                        })(req, res);
                        break;
                    default:
                        resolve({});
                        break;
                }
            });
        }
        /**
         * 根據不同 BOT 把 webhook 打進來的 HTTP BODY 轉換成 message 格式
         * @return {any}
         */

        getReceivedMessages(req, appId, app) {
            let body = req.body;
            let media = {
                image: 'png',
                audio: 'mp3',
                voice: 'mp3', // wechat only
                video: 'mp4',
                shortvideo: 'mp4' // wechat only
            };
            let messages = [];
            switch (app.type) {
                case LINE:
                    let events = body.events;
                    return Promise.all(events.map((event) => {
                        // LINE 系統 webhook 測試不理會
                        if (LINE_WEBHOOK_VERIFY_UID === event.source.userId) {
                            return Promise.resolve();
                        }
                        let _message = {
                            messager_id: event.source.userId, // LINE 平台的 sender id
                            from: LINE,
                            type: undefined === event.message ? '' : event.message.type, // LINE POST 訊息型別
                            eventType: event.type, // LINE POST 事件型別
                            time: Date.now(), // 將要回覆的訊息加上時戳
                            replyToken: event.replyToken,
                            message_id: undefined === event.message ? '' : event.message.id, // LINE 平台的 訊息 id
                            fromPath: `/${Date.now()}.${media[event.message.type]}`
                        };
                        if (undefined !== event.message && 'text' === event.message.type) {
                            _message.text = event.message.text;
                            messages.push(_message);
                            return Promise.resolve();
                        };

                        if (undefined !== event.message && 'sticker' === event.message.type) {
                            let stickerId = event.message.stickerId;
                            _message.src = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                            messages.push(_message);
                            return Promise.resolve();
                        };

                        if (undefined !== event.message && 'location' === event.message.type) {
                            let latitude = event.message.latitude;
                            let longitude = event.message.longitude;
                            _message.src = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                            messages.push(_message);
                            return Promise.resolve();
                        };

                        let bot = this.bots[appId];

                        if (undefined !== event.message && ['image', 'audio', 'video'].includes(event.message.type)) {
                            return new Promise((resolve, reject) => {
                                bot.getMessageContent(event.message.id).then((stream) => {
                                    let bufs = [];
                                    stream.on('data', (chunk) => {
                                        bufs.push(chunk);
                                    });

                                    stream.on('end', () => {
                                        let buf = Buffer.concat(bufs);
                                        _message.text = '';
                                        return StorageHlp.filesUpload(_message.fromPath, buf).then(function() {
                                            return Promise.resolve();
                                        }).then(function() {
                                            return StorageHlp.sharingCreateSharedLink(_message.fromPath);
                                        }).then(function(response) {
                                            var wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                                            var src = wwwurl.replace('?dl=0', '');
                                            _message.src = src;
                                            messages.push(_message);
                                            resolve();
                                        });
                                    });

                                    stream.on('error', (err) => {
                                        console.log(err);
                                    });
                                });
                            });
                        };
                        messages.push(_message);
                        return Promise.resolve();
                    })).then(() => {
                        return messages;
                    });
                case FACEBOOK:
                    let entry = body.entry;
                    messages = [];
                    entry.map((_entry) => {
                        let messaging = _entry.messaging;
                        messaging.map((_messaging) => {
                            let attachments = _messaging.message.attachments || '';
                            let text = _messaging.message.text || '';
                            // !attachments 沒有夾帶檔案
                            if (!attachments && text) {
                                let _message = {
                                    messager_id: _messaging.sender.id, // FACEBOOK 平台的 sender id
                                    from: FACEBOOK,
                                    text: text,
                                    type: 'text',
                                    time: Date.now(), // 將要回覆的訊息加上時戳
                                    src: '',
                                    message_id: _messaging.message.mid // FACEBOOK 平台的 訊息 id
                                };
                                messages.push(_message);
                                return;
                            }
                            attachments.map((attachment) => {
                                let src;
                                if ('location' === attachment.type) {
                                    let coordinates = attachment.payload.coordinates;
                                    let latitude = coordinates.lat;
                                    let longitude = coordinates.long;
                                    src = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                                };

                                if ('fallback' === attachment.type) {
                                    text = attachment.fallback.title;
                                    src = attachment.fallback.url;
                                };

                                if ('image' === attachment.type) {
                                    src = attachment.payload.url;
                                };

                                if ('video' === attachment.type) {
                                    src = attachment.payload.url;
                                };

                                if ('audio' === attachment.type) {
                                    src = attachment.payload.url;
                                };

                                if ('file' === attachment.type) {
                                    src = attachment.payload.url;
                                };

                                let _message = {
                                    messager_id: _messaging.sender.id, // FACEBOOK 平台的 sender id
                                    from: FACEBOOK,
                                    text: text,
                                    type: attachment.type || 'text',
                                    time: Date.now(), // 將要回覆的訊息加上時戳
                                    src: src,
                                    message_id: _messaging.message.mid // FACEBOOK 平台的 訊息 id
                                };

                                messages.push(_message);
                            });
                        });
                    });
                    return messages;
                case WECHAT:
                    let weixin = req.weixin;
                    let message = {
                        messager_id: weixin.FromUserName, // WECHAT 平台的 sender id
                        type: weixin.MsgType,
                        time: parseInt(weixin.CreateTime) * 1000,
                        from: WECHAT,
                        text: '',
                        src: '',
                        message_id: weixin.MsgId // WECHAT 平台的 訊息 id
                    };

                    return new Promise((resolve, reject) => {
                        let bot = this.bots[appId];
                        if (!bot) {
                            reject(new Error('bot undefined'));
                            return;
                        }

                        if ('text' === message.type) {
                            message.text = weixin.Content;
                            messages.push(message);
                        } else if (weixin.MediaId) {
                            message.fromPath = `/${weixin.CreateTime}.${media[weixin.MsgType]}`;
                            bot.getMedia(weixin.MediaId, (err, buffer, res) => {
                                if (err) {
                                    reject(new Error(err));
                                    return;
                                }

                                return StorageHlp.filesUpload(message.fromPath, buffer).then(function() {
                                    return StorageHlp.sharingCreateSharedLink(message.fromPath);
                                }).then(function(response) {
                                    var wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                                    var src = wwwurl.replace('?dl=0', '');
                                    message.src = src;
                                    messages.push(message);
                                    resolve();
                                });
                            });
                        }
                        resolve();
                    }).then(() => {
                        return messages;
                    });
                default:
                    return messages;
            }
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
                    case WECHAT:
                        return new Promise((resolve, reject) => {
                            // http://doxmate.cool/node-webot/wechat-api/api.html#api_api_user
                            bot.getUser({ openid: senderId, lang: 'zh_TW' }, (err, wxUser) => {
                                if (err) {
                                    console.log(err);
                                    reject(new Error(err));
                                    return;
                                }
                                wxUser = wxUser || {};
                                senderProfile.gender = !wxUser.sex ? '' : (1 === wxUser.sex ? 'MALE' : (2 === wxUser.sex ? 'FEMALE' : ''));
                                senderProfile.name = wxUser.nickname;
                                senderProfile.photo = wxUser.headimgurl;
                                resolve(senderProfile);
                            });
                        });
                    default:
                        return senderProfile;
                }
            });
        }

        /**
         * @param {string} messagerId
         * @param {string} replyToken
         * @param {any[]|any} messages
         * @param {string} appId
         * @param {any} app
         */
        replyMessage(res, messagerId, replyToken, messages, appId, app) {
            let bot = this.bots[appId];
            if (!bot) {
                return Promise.reject(new Error('bot undefined'));
            };
            if (!(messages instanceof Array)) {
                messages = [messages];
            };

            return Promise.resolve().then(() => {
                switch (app.type) {
                    case LINE:
                        return bot.replyMessage(replyToken, messages).then(() => {
                            // 一同將 webhook 打過來的 http request 回覆 200 狀態
                            return res.status(200).send('');
                        });
                    case FACEBOOK:
                        return Promise.all(messages.map((message) => {
                            if ('text' === message.type) {
                                return bot.sendTextMessage(messagerId, message.text);
                            };
                            if ('image' === message.type) {
                                return bot.sendImageMessage(messagerId, message.src, true);
                            };
                            if ('audio' === message.type) {
                                return bot.sendAudioMessage(messagerId, message.src, true);
                            };
                            if ('video' === message.type) {
                                return bot.sendVideoMessage(messagerId, message.src, true);
                            };
                            return bot.sendTextMessage(messagerId, message.text);
                        })).then(() => {
                            // 一同將 webhook 打過來的 http request 回覆 200 狀態
                            return res.status(200).send('');
                        });
                    case WECHAT:
                        // wechat bot sdk 的 middleware 會將 reply 方法包裝在 res 內
                        // 因此直接呼叫 res.reply 回應訊息
                        let message = messages[0] || {};
                        return res.reply(message.text || '');
                    default:
                        break;
                }
            });
        }

        pushMessage(messagerId, message, appId, app) {
            let bot = this.bots[appId];
            switch (app.type) {
                case LINE:
                    let _message = {};
                    if ('text' === message.type) {
                        _message.type = message.type;
                        _message.text = message.text;
                    };
                    if ('image' === message.type) {
                        _message.type = message.type;
                        _message.previewImageUrl = message.src;
                        _message.originalContentUrl = message.src;
                    };
                    if ('audio' === message.type) {
                        _message.type = message.type;
                        _message.duration = 240000;
                        _message.originalContentUrl = message.src;
                    };
                    if ('video' === message.type) {
                        _message.type = message.type;
                        _message.previewImageUrl = chatshierCfg.LINE.PREVIEW_IMAGE_URL;
                        _message.originalContentUrl = message.src;
                    };
                    if ('sticker' === message.type) {
                        _message.type = message.type;
                        _message.stickerId = message.text.substr(message.text.lastIndexOf(' '));
                        _message.packageId = message.text.substr(message.text.indexOf(' '));
                    };

                    return bot.pushMessage(messagerId, _message);
                case FACEBOOK:
                    if ('text' === message.type) {
                        return bot.sendTextMessage(messagerId, message.text);
                    };
                    if ('image' === message.type) {
                        return bot.sendImageMessage(messagerId, message.src, true);
                    };
                    if ('audio' === message.type) {
                        return bot.sendAudioMessage(messagerId, message.src, true);
                    };
                    if ('video' === message.type) {
                        return bot.sendVideoMessage(messagerId, message.src, true);
                    };
                    return bot.sendTextMessage(messagerId, message.text);
                case WECHAT:
                    return new Promise((resolve, reject) => {
                        if ('text' === message.type) {
                            return bot.sendText(messagerId, message.text, (err, result) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(result);
                            });
                        };
                        if ('image' === message.type) {

                        };
                        if ('audio' === message.type) {

                        };
                        if ('video' === message.type) {

                        };
                        bot.sendText(messagerId, message.text, (err, result) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve(result);
                        });
                    });
                default:
                    return Promise.resolve();
            }
        };

        /**
         * @param {string[]} messagerIds
         * @param {any[]} messages
         * @param {string} appId
         * @param {any} app
         */
        multicast(messagerIds, messages, appId, app) {
            let bot = this.bots[appId];
            let _multicast;
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
                            function nextPromise(i) {
                                if (i >= messages.length) {
                                    return Promise.resolve();
                                };

                                let message = messages[i];
                                return bot.sendTextMessage(messagerId, message.text).then(() => {
                                    return nextPromise(i + 1);
                                });
                            };
                            return nextPromise(0);
                        }));
                    };

                    return _multicast(messagerIds, messages);
                default:
                    return Promise.resolve([]);
            }
        };

        /**
         * @param {string} appId
         */
        getRichMenuList(appId) {
            let bot = this.bots[appId];
            return bot.getRichMenuList();
        };

        /**
         * @param {string} richmenuId
         * @param {string} appId
         */
        getRichMenu(richmenuId, appId) {
            let bot = this.bots[appId];
            return bot.getRichMenu(richmenuId);
        };

        /**
         * @param {string} richmenuId
         * @param {string} appId
         */
        getRichMenuImage(richmenuId, appId) {
            let bot = this.bots[appId];
            return bot.getRichMenuImage(richmenuId);
        };

        /**
         * @param {any} richmenu
         * @param {string} appId
         */
        createRichMenu(richmenu, appId) {
            let bot = this.bots[appId];
            return bot.createRichMenu(richmenu);
        };

        /**
         * @param {string} richmenuId
         * @param {string} richmenuImg
         * @param {string} appId
         */
        setRichMenuImage(richmenuId, richmenuImg, appId) {
            let bot = this.bots[appId];
            let contentType = '';
            return bot.setRichMenuImage(richmenuId, richmenuImg, contentType);
        };

        /**
         * @param {string} userId
         * @param {string} richmenuId
         * @param {string} appId
         */
        linkRichMenuToUser(userId, richmenuId, appId) {
            let bot = this.bots[appId];
            return bot.linkRichMenuToUser(userId, richmenuId);
        }

        /**
         * @param {string} userId
         * @param {string} richmenuId
         * @param {string} appId
         */
        unlinkRichMenuFromUser(userId, richmenuId, appId) {
            let bot = this.bots[appId];
            return bot.unlinkRichMenuFromUser(userId, richmenuId);
        }

        /**
         * @param {string} richmenuId
         * @param {string} appId
         */
        deleteRichMenu(richmenuId, appId) {
            let bot = this.bots[appId];
            return bot.deleteRichMenu(richmenuId);
        };
    }

    return new BotService();
})();
