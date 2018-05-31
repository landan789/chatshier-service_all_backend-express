module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    const line = require('@line/bot-sdk');
    const Wechat = require('wechat');
    const WechatAPI = require('wechat-api');
    const bodyParser = require('body-parser');
    const facebook = require('facebook-bot-messenger'); // facebook串接
    const chatshierCfg = require('../config/chatshier');

    const appsMdl = require('../models/apps');
    const appsChatroomsMdl = require('../models/apps_chatrooms');
    const storageHlp = require('../helpers/storage');
    const wechatSvc = require('./wechat');

    // app type defined
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const WECHAT = 'WECHAT';
    const VENDOR = 'VENDOR';

    const LINE_WEBHOOK_VERIFY_UID = 'Udeadbeefdeadbeefdeadbeefdeadbeef';
    const WECHAT_WEBHOOK_VERIFY_TOKEN = 'verify_token';

    const FACEBOOK_OAUTH_EXCEPTION = 190;

    const LINE_EVENT_TYPES = Object.freeze({
        MESSAGE: 'message',
        FOLLOW: 'follow',
        UNFOLLOW: 'unfollow',
        JOIN: 'join',
        LEAVE: 'leave',
        POSTBACK: 'postback',
        BEACON: 'beacon'
    });

    /** @type {Map<string, boolean>} */
    let messageCacheMap = new Map();

    class BotService {
        constructor() {
            this.LINE_EVENT_TYPES = LINE_EVENT_TYPES;
            this.bots = {};
        }

        /**
         * @param {any} req
         * @param {any} res
         * @param {string} appId
         * @param {any} app
         */
        parser(req, res, appId, app) {
            switch (app.type) {
                case LINE:
                    let lineConfig = {
                        channelSecret: app.secret,
                        channelAccessToken: app.token1
                    };

                    return new Promise((resolve, reject) => {
                        line.middleware(lineConfig)(req, res, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve();
                        });
                    });
                case FACEBOOK:
                    return new Promise((resolve) => {
                        bodyParser.json()(req, res, () => resolve());
                    });
                case WECHAT:
                    return new Promise((resolve) => {
                        Wechat(WECHAT_WEBHOOK_VERIFY_TOKEN, () => resolve())(req, res);
                    });
                default:
                    return Promise.resolve();
            }
        }

        /**
         * @param {string} appId
         * @param {any} app
         */
        create(appId, app) {
            return Promise.resolve().then(() => {
                switch (app.type) {
                    case LINE:
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        let lineBot = new line.Client(lineConfig);
                        this.bots[appId] = lineBot;
                        return lineBot;
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
                        return facebookBot;
                    case WECHAT:
                        let getToken = (callback) => {
                            // 此 callback 在 instance 被建立會要發 API 時會執行
                            // 從資料庫抓取出目前 app 的 accessToken 回傳給 instance
                            if (app.token1) {
                                let token = {
                                    accessToken: app.token1,
                                    expireTime: app.token1ExpireTime
                                };
                                callback(null, token);
                                return;
                            }
                            callback(null, {});
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
                            return appsMdl.update(appId, _app).then((apps) => {
                                if (!apps) {
                                    callback(API_ERROR.APP_FAILED_TO_UPDATE);
                                    return;
                                }
                                callback();
                            });
                        };
                        let wechatBot = new WechatAPI(app.id1, app.secret, getToken, setToken);
                        this.bots[appId] = wechatBot;
                        return wechatBot;
                    default:
                        break;
                }
            });
        }

        /**
         * @param {any} req
         * @param {any} app
         * @returns {Webhook.Chatshier.Information}
         */
        retrieveWebhookInfo(req, app) {
            let body = req.body || {};

            /** @type {Webhook.Chatshier.Information} */
            let webhookInfo = {
                platformUid: ''
            };

            switch (app.type) {
                case LINE:
                    /** @type {Webhook.Line.Event[]} */
                    let lineEvents = body.events || [];
                    lineEvents.forEach((ev) => {
                        // LINE 系統 webhook 測試不理會
                        if (LINE_WEBHOOK_VERIFY_UID === ev.source.userId) {
                            return;
                        }
                        webhookInfo.eventType = webhookInfo.eventType || ev.type;
                        webhookInfo.platformGroupId = webhookInfo.platformGroupId || ev.source.roomId || ev.source.groupId;
                        webhookInfo.platformGroupType = webhookInfo.platformGroupType || ev.source.type;
                        webhookInfo.platformUid = webhookInfo.platformUid || ev.source.userId;
                        webhookInfo.replyToken = webhookInfo.replyToken || ev.replyToken;
                    });
                    break;
                case FACEBOOK:
                    /** @type {Webhook.Facebook.Entry[]} */
                    let fbEntries = body.entry || [];
                    for (let i in fbEntries) {
                        let messagings = fbEntries[i].messaging || [];
                        for (let j in messagings) {
                            let messaging = messagings[j];
                            webhookInfo.isEcho = !!messaging.message.is_echo;
                            webhookInfo.platfromAppId = webhookInfo.platfromAppId || messaging.message.app_id;

                            // 正常時，發送者是顧客，接收者是粉絲專頁
                            // echo 時，發送者是粉絲專頁，接收者是顧客
                            webhookInfo.platformUid = webhookInfo.platformUid || (messaging.message.is_echo ? messaging.recipient.id : messaging.sender.id);
                        }
                    }
                    break;
                case WECHAT:
                    let weixin = req.weixin;
                    webhookInfo.platformUid = weixin.FromUserName;
                    break;
                default:
                    break;
            }
            return webhookInfo;
        }

        /**
         * 根據不同 BOT 把 webhook 打進來的 HTTP BODY 轉換成 message 格式
         *
         * @param {string} messagerId - 這裡是代表 Chatshier chatroom 裡的 messager_id
         * @return {Promise<any>}
         */
        getReceivedMessages(req, res, messagerId, appId, app) {
            let body = req.body;
            let media = {
                image: 'png',
                audio: 'mp3',
                video: 'mp4'
            };

            return Promise.resolve().then(() => {
                let bot = this.bots[appId];
                if (!bot) {
                    return this.create(appId, app);
                }
                return bot;
            }).then((bot) => {
                let messages = [];

                switch (app.type) {
                    case LINE:
                        /** @type {Webhook.Line.Event[]} */
                        let events = body.events;
                        return Promise.all(events.map((event) => {
                            // LINE 系統 webhook 測試不理會
                            if (LINE_WEBHOOK_VERIFY_UID === event.source.userId) {
                                return;
                            }

                            // 非 message 的 webhook event 不抓取訊息資料
                            if (!('message' === event.type && event.message)) {
                                return;
                            }

                            let _message = {
                                messager_id: messagerId,
                                from: LINE,
                                type: event.message ? event.message.type : '', // LINE POST 訊息型別
                                time: Date.now(), // 將要回覆的訊息加上時戳
                                message_id: event.message ? event.message.id : '', // LINE 平台的 訊息 id
                                fromPath: event.message ? ('file' === event.message.type ? '/' + event.message.fileName : `/${Date.now()}.${media[event.message.type]}`) : ''
                            };

                            if ('template' === event.message.type) {
                                _message.template = event.message.template;
                                messages.push(_message);
                                return Promise.resolve();
                            }

                            if ('text' === event.message.type) {
                                _message.text = event.message.text;
                                messages.push(_message);
                                return;
                            }

                            if ('sticker' === event.message.type) {
                                let stickerId = event.message.stickerId;
                                _message.src = 'https://sdl-stickershop.line.naver.jp/stickershop/v1/sticker/' + stickerId + '/android/sticker.png';
                                messages.push(_message);
                                return;
                            }

                            if ('location' === event.message.type) {
                                let latitude = event.message.latitude;
                                let longitude = event.message.longitude;
                                _message.src = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                                messages.push(_message);
                                return;
                            }

                            if (['image', 'audio', 'video', 'file'].includes(event.message.type)) {
                                return bot.getMessageContent(event.message.id).then((contentStream) => {
                                    return new Promise((resolve, reject) => {
                                        let bufferArray = [];
                                        contentStream.on('error', reject);
                                        contentStream.on('data', (chunk) => bufferArray.push(chunk));
                                        contentStream.on('end', () => resolve(Buffer.concat(bufferArray)));
                                    });
                                }).then((contentBuffer) => {
                                    _message.text = '';
                                    return storageHlp.filesUpload(_message.fromPath, contentBuffer);
                                }).then(() => {
                                    return storageHlp.sharingCreateSharedLink(_message.fromPath);
                                }).then((response) => {
                                    let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                                    let src = wwwurl.replace('?dl=0', '');
                                    _message.src = src;
                                    messages.push(_message);
                                });
                            }
                            messages.push(_message);
                        })).then(() => {
                            return messages;
                        });
                    case FACEBOOK:
                        /** @type {Webhook.Facebook.Entry[]} */
                        let entries = body.entry;
                        for (let i in entries) {
                            let messaging = entries[i].messaging || [];
                            for (let j in messaging) {
                                // 如果有 is_echo 的 flag 並且有 fb 的 app_id
                                // 代表是從 Chatshier 透過 API 發送，此訊息不用再進行處理
                                if (messaging[j].message.is_echo && messaging[j].message.app_id) {
                                    continue;
                                }

                                let attachments = messaging[j].message.attachments;
                                let text = messaging[j].message.text || '';

                                // !attachments 沒有夾帶檔案
                                if (!attachments && text) {
                                    let _message = {
                                        messager_id: messagerId,
                                        // 有 is_echo 的 flag 代表從粉絲專頁透過 Messenger 來回覆用戶的
                                        from: messaging[j].message.is_echo ? VENDOR : FACEBOOK,
                                        text: text,
                                        type: 'text',
                                        time: Date.now(), // 將要回覆的訊息加上時戳
                                        src: '',
                                        message_id: messaging[j].message.mid // FACEBOOK 平台的 訊息 id
                                    };
                                    messages.push(_message);
                                    continue;
                                }

                                if (attachments) {
                                    messages.concat(attachments.map((attachment) => {
                                        let src = '';
                                        if ('location' === attachment.type) {
                                            let coordinates = attachment.payload.coordinates;
                                            let latitude = coordinates.lat;
                                            let longitude = coordinates.long;
                                            src = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                                        }

                                        if ('fallback' === attachment.type) {
                                            text = attachment.fallback.title;
                                            src = attachment.fallback.url;
                                        }

                                        if ('image' === attachment.type) {
                                            src = attachment.payload.url;
                                        }

                                        if ('video' === attachment.type) {
                                            src = attachment.payload.url;
                                        }

                                        if ('audio' === attachment.type) {
                                            src = attachment.payload.url;
                                        }

                                        if ('file' === attachment.type) {
                                            src = attachment.payload.url;
                                        }

                                        let _message = {
                                            messager_id: messagerId, // FACEBOOK 平台的 sender id
                                            from: FACEBOOK,
                                            text: text,
                                            type: attachment.type || 'text',
                                            time: Date.now(), // 將要回覆的訊息加上時戳
                                            src: src,
                                            message_id: messaging[j].message.mid // FACEBOOK 平台的 訊息 id
                                        };
                                        return _message;
                                    }));
                                }
                            }
                        }
                        return messages;
                    case WECHAT:
                        let weixin = req.weixin;
                        let message = {
                            messager_id: messagerId, // WECHAT 平台的 sender id
                            type: weixin.MsgType,
                            time: parseInt(weixin.CreateTime) * 1000,
                            from: WECHAT,
                            text: '',
                            src: '',
                            message_id: weixin.MsgId || '' // WECHAT 平台的 訊息 id
                        };

                        return Promise.resolve().then(() => {
                            // 目前暫不處理 wechat 的事件訊息
                            if ('event' === weixin.MsgType) {
                                if ('subscribe' === weixin.Event) {
                                    // 當關注公眾號時，將此訊息標註為關注
                                    // 改為使用 "follow" 與 LINE 的事件統一
                                    message.eventType = 'follow';
                                }
                                return message;
                            }

                            // 由於 wechat 在 5s 內沒有收到 http response 時會在打 webhook 過來
                            // 有可能因網路傳輸或資料庫處理等原因，造成處理時間超過 5s
                            // 標註 MsgId 來防止相同訊息被處理 2 次以上
                            if (weixin.MsgId) {
                                if (messageCacheMap.get(weixin.MsgId)) {
                                    return Promise.reject(new Error('MESSAGE_HAS_BEEN_PROCESSED'));
                                }
                                messageCacheMap.set(weixin.MsgId, true);
                            }

                            // 將 wechat 的 type 格式統一處理
                            // 音檔型別就是 audio, 影音檔就是 video
                            if ('voice' === message.type) {
                                message.type = 'audio';
                            } else if ('shortvideo' === message.type) {
                                message.type = 'video';
                            }

                            if ('text' === message.type) {
                                message.text = weixin.Content;
                            } else if (weixin.MediaId) {
                                let ext = media[message.type];
                                message.fromPath = `/${message.time}.${ext}`;

                                // 抓取 wechat 資料 -> 轉檔(amr) -> 儲存至 storage (整個流程可能超過 5s)
                                // https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140453
                                // 由於 wechat 的 webhook 在 5s 內沒有進行 http response 的話
                                // 會再打一次 webhook 過來持續三次
                                // 而接收到多媒體訊息的話不需要回覆訊息
                                // 因此在此階段即可回應 wechat 200 狀態
                                !res.headersSent && res.reply('');

                                return new Promise((resolve, reject) => {
                                    bot.getMedia(weixin.MediaId, (err, rawBuffer) => {
                                        if (err) {
                                            reject(new Error(err));
                                            return;
                                        }
                                        resolve(rawBuffer);
                                    });
                                }).then((rawBuffer) => {
                                    if ('amr' === weixin.Format) {
                                        // 由於 wechat 的錄音檔的格式為 amr, HTML5 的 audio 不支援
                                        // 因此必須將 amr 檔轉換為 mp3 檔案
                                        return wechatSvc.amrToMp3(rawBuffer);
                                    }
                                    return rawBuffer;
                                }).then((outputBuffer) => {
                                    return storageHlp.filesUpload(message.fromPath, outputBuffer);
                                }).then(() => {
                                    return storageHlp.sharingCreateSharedLink(message.fromPath);
                                }).then((response) => {
                                    let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                                    let src = wwwurl.replace('?dl=0', '');
                                    message.src = src;
                                    return message;
                                });
                            } else if ('location' === message.type) {
                                let latitude = weixin.Location_X;
                                let longitude = weixin.Location_Y;
                                message.src = 'https://www.google.com.tw/maps?q=' + latitude + ',' + longitude;
                            } else if ('file' === message.type) {
                                // TODO:
                                // 目前無法得知如何從後台下載 wechat 的檔案
                                // 期望結果應是從 wechat 下載到該檔案後上傳至 dropbox
                                // 將 message.src 指向 dropbox 連結
                                message.text = weixin.Title + ' - ' + weixin.Description;
                            }
                            return message;
                        }).then((message) => {
                            message && messages.push(message);
                            return messages;
                        });
                    default:
                        return messages;
                }
            });
        }

        /**
         * 多型處理， 取得 LINE 或 FACEBOOK 來的 customer 用戶端資料
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @param {string} appId
         * @param {any} app
         * @returns {Promise<Webhook.Chatshier.Profile>}
         */
        getProfile(webhookInfo, appId, app) {
            return Promise.resolve().then(() => {
                let bot = this.bots[appId];
                if (!bot) {
                    return this.create(appId, app);
                }
                return bot;
            }).then((bot) => {
                /** @type {Webhook.Chatshier.Profile} */
                let senderProfile = {
                    type: app.type,
                    name: '',
                    photo: ''
                };
                let platformGroupId = webhookInfo.platformGroupId;
                let platformGroupType = webhookInfo.platformGroupType;
                let platformUid = webhookInfo.platformUid;

                if (!platformGroupId && !platformGroupType && !platformUid) {
                    return senderProfile;
                }

                switch (app.type) {
                    case LINE:
                        return Promise.resolve().then(() => {
                            if (platformGroupId && platformUid) {
                                if ('group' === platformGroupType) {
                                    return bot.getGroupMemberProfile(platformGroupId, platformUid);
                                } else {
                                    return bot.getRoomMemberProfile(platformGroupId, platformUid);
                                }
                            }
                            return bot.getProfile(platformUid);
                        }).then((lineUserProfile) => {
                            lineUserProfile = lineUserProfile || {};
                            senderProfile.name = lineUserProfile.displayName;
                            senderProfile.photo = lineUserProfile.pictureUrl;
                            return senderProfile;
                        }).catch((err) => {
                            // 無法抓到使用者 profile 時，回傳 undefined
                            // 其餘狀況擲出錯誤
                            if (403 === err.statusCode ||
                                404 === err.statusCode) {
                                return Promise.resolve();
                            }
                            return Promise.reject(err);
                        });
                    case FACEBOOK:
                        return bot.getProfile(platformUid).then((fbUserProfile) => {
                            fbUserProfile = fbUserProfile || {};
                            senderProfile.name = fbUserProfile.first_name + ' ' + fbUserProfile.last_name;
                            senderProfile.photo = fbUserProfile.profile_pic;
                            return senderProfile;
                        }).catch((ex) => {
                            // 如果此 app 的 page access token 已經無法使用
                            // 則自動將此 app 刪除
                            if (FACEBOOK_OAUTH_EXCEPTION === ex.error.code) {
                                return appsMdl.remove(appId).then((apps) => {
                                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                                        return Promise.reject(API_ERROR.APP_FAILED_TO_REMOVE);
                                    }
                                    return Promise.resolve();
                                });
                            }
                            return Promise.reject(ex.error);
                        });
                    case WECHAT:
                        return new Promise((resolve, reject) => {
                            // http://doxmate.cool/node-webot/wechat-api/api.html#api_api_user
                            bot.getUser({ openid: platformUid, lang: 'zh_TW' }, (err, wxUser) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                resolve(wxUser);
                            });
                        }).then((wxUser) => {
                            wxUser = wxUser || {};
                            senderProfile.name = wxUser.nickname;
                            senderProfile.photo = wxUser.headimgurl;
                            return senderProfile;
                        });
                    default:
                        return senderProfile;
                }
            });
        }

        /**
         * @param {string} platformGroupId
         * @param {string} appId
         * @param {any} app
         * @returns {Promise<string[]>}
         */
        getGroupMemberIds(platformGroupId, appId, app) {
            if (!platformGroupId) {
                return Promise.resolve([]);
            }

            return Promise.resolve().then(() => {
                let bot = this.bots[appId];
                if (!bot) {
                    return this.create(appId, app);
                }
                return bot;
            }).then((bot) => {
                switch (app.type) {
                    case LINE:
                        // 只有 LINE@ Approved accounts 或者 official accounts 才有權限直接抓取群組內所有成員的 LINE ID
                        // 否則都會得到 403 權限不足的錯誤
                        return bot.getGroupMemberIds(platformGroupId).catch((err) => {
                            // 無法抓到使用者 profile 時，回傳空陣列
                            // 其餘狀況擲出錯誤
                            if (403 === err.statusCode ||
                                404 === err.statusCode) {
                                return Promise.resolve([]);
                            }
                            return Promise.reject(err);
                        });
                    case FACEBOOK:
                    case WECHAT:
                    default:
                        return [];
                }
            });
        }

        /**
         * @param {string} platformUid
         * @param {string} replyToken
         * @param {any[]|any} messages
         * @param {string} appId
         * @param {any} app
         */
        replyMessage(res, platformUid, replyToken, messages, appId, app) {
            if (!(messages instanceof Array)) {
                messages = [messages];
            }

            return Promise.resolve().then(() => {
                let bot = this.bots[appId];
                if (!bot) {
                    return this.create(appId, app);
                }
                return bot;
            }).then((bot) => {
                switch (app.type) {
                    case LINE:
                        return bot.replyMessage(replyToken, messages).then(() => {
                            // 一同將 webhook 打過來的 http request 回覆 200 狀態
                            return !res.headersSent && res.status(200).send('');
                        });
                    case FACEBOOK:
                        return Promise.all(messages.map((message) => {
                            if ('text' === message.type) {
                                return bot.sendTextMessage(platformUid, message.text);
                            }
                            if ('image' === message.type) {
                                return bot.sendImageMessage(platformUid, message.src, true);
                            }
                            if ('audio' === message.type) {
                                return bot.sendAudioMessage(platformUid, message.src, true);
                            }
                            if ('video' === message.type) {
                                return bot.sendVideoMessage(platformUid, message.src, true);
                            }
                            return bot.sendTextMessage(platformUid, message.text);
                        })).then(() => {
                            // 一同將 webhook 打過來的 http request 回覆 200 狀態
                            return !res.headersSent && res.status(200).send('');
                        });
                    case WECHAT:
                        // wechat bot sdk 的 middleware 會將 reply 方法包裝在 res 內
                        // 因此直接呼叫 res.reply 回應訊息
                        let message = messages[0] || {};
                        return !res.headersSent && res.reply(message.text || '');
                    default:
                        break;
                }
            });
        }

        pushMessage(recipientUid, message, srcBuffer, appId, app) {
            let bot = this.bots[appId];
            switch (app.type) {
                case LINE:
                    let _message = {};
                    if ('text' === message.type) {
                        _message.type = message.type;
                        _message.text = message.text;
                    }
                    if ('image' === message.type) {
                        _message.type = message.type;
                        _message.previewImageUrl = message.src;
                        _message.originalContentUrl = message.src;
                    }
                    if ('audio' === message.type) {
                        _message.type = message.type;
                        _message.duration = 240000;
                        _message.originalContentUrl = message.src;
                    }
                    if ('video' === message.type) {
                        _message.type = message.type;
                        _message.previewImageUrl = chatshierCfg.LINE.PREVIEW_IMAGE_URL;
                        _message.originalContentUrl = message.src;
                    }
                    if ('sticker' === message.type) {
                        _message.type = message.type;
                        _message.stickerId = message.text.substr(message.text.lastIndexOf(' '));
                        _message.packageId = message.text.substr(message.text.indexOf(' '));
                    }
                    if ('file' === message.type) {
                        _message.type = 'text';
                        _message.text = message.text + message.src;
                    }
                    if ('imagemap' === message.type) {
                        _message.type = message.type;
                        _message.baseUrl = message.baseUri;
                        _message.altText = message.altText;
                        _message.baseSize = message.baseSize;
                        _message.actions = message.actions;
                    }

                    return bot.pushMessage(recipientUid, _message);
                case FACEBOOK:
                    if ('text' === message.type) {
                        return bot.sendTextMessage(recipientUid, message.text);
                    }
                    if ('image' === message.type) {
                        return bot.sendImageMessage(recipientUid, message.src, true);
                    }
                    if ('audio' === message.type) {
                        return bot.sendAudioMessage(recipientUid, message.src, true);
                    }
                    if ('video' === message.type) {
                        return bot.sendVideoMessage(recipientUid, message.src, true);
                    }
                    if ('file' === message.type) {
                        return bot.sendFileMessage(recipientUid, message.src, true);
                    }
                    return bot.sendTextMessage(recipientUid, message.text);
                case WECHAT:
                    return Promise.resolve().then(() => {
                        if (message.src && srcBuffer) {
                            // wechat 在傳送多媒體資源時，必須先將資源上傳至 wechat 伺服器
                            // 成功上傳後會取得 media_id, 使用此 ID 來發送多媒體訊息
                            // 暫時性的多媒體檔案只會在 wechat 伺服器裡存在 3 天後就會被 wechat 刪除
                            return new Promise((resolve, reject) => {
                                bot.getToken((err, token) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    resolve(token);
                                });
                            }).then((token) => {
                                let filename = message.src.split('/').pop();
                                let mediaType = message.type;
                                if ('audio' === mediaType) {
                                    mediaType = 'voice';
                                }
                                return wechatSvc.uploadMedia(mediaType, srcBuffer, filename, token.accessToken);
                            });
                        }
                    }).then((mediaResult) => {
                        return new Promise((resolve, reject) => {
                            if (!mediaResult) {
                                bot.sendText(recipientUid, message.text, (err, result) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    resolve(result);
                                });
                                return;
                            }

                            if ('image' === message.type) {
                                bot.sendImage(recipientUid, mediaResult.media_id, (err, result) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    resolve();
                                });
                                return;
                            } else if ('audio' === message.type) {
                                bot.sendVoice(recipientUid, mediaResult.media_id, (err, result) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    resolve();
                                });
                                return;
                            } else if ('video' === message.type) {
                                bot.sendVideo(recipientUid, mediaResult.media_id, mediaResult.thumb_media_id, (err, result) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    resolve();
                                });
                                return;
                            };
                        });
                    });
                default:
                    return Promise.resolve();
            }
        };

        /**
         * @param {string[]} recipientUids
         * @param {any[]} messages
         * @param {string} appId
         * @param {any} app
         */
        multicast(recipientUids, messages, appId, app) {
            let bot = this.bots[appId];
            let _multicast;

            return Promise.resolve().then(() => {
                if (!bot) {
                    return this.create(appId, app).then((_bot) => {
                        this.bots[appId] = bot = _bot;
                    });
                };
            }).then(() => {
                switch (app.type) {
                    case LINE:
                        _multicast = (_recipientUids, messages) => {
                            let multicasts = [];
                            // 把 messages 分批，每五個一包，因為 line.multicast 方法 一次只能寄出五次
                            while (messages.length > 5) {
                                multicasts.push(messages.splice(0, 5));
                            }
                            multicasts.push(messages);

                            let nextPromise = (i) => {
                                if (i >= multicasts.length) {
                                    return Promise.resolve();
                                };
                                let messages = multicasts[i];
                                return bot.multicast(_recipientUids, messages).then(() => {
                                    return nextPromise(i + 1);
                                });
                            };
                            return nextPromise(0);
                        };
                        return _multicast(recipientUids, messages);
                    case FACEBOOK:
                        _multicast = (messagerIds, messages) => {
                            return Promise.all(messagerIds.map((messagerId) => {
                                let nextPromise = (i) => {
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
                        return _multicast(recipientUids, messages);
                    case WECHAT:
                        _multicast = (messagerIds, messages) => {
                            let nextPromise = (i) => {
                                if (i >= messages.length) {
                                    return Promise.resolve();
                                };

                                let message = messages[i];
                                return new Promise((resolve, reject) => {
                                    // 使用 wechat 群發功能時，發送的對象必須要 2 個以上，否則會報錯
                                    // 因此如果對象只有 1 人時，直接使用單一對象發送
                                    if (1 === messagerIds.length) {
                                        bot.sendText(messagerIds[0], message.text, (err, result) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }
                                            resolve(result);
                                        });
                                        return;
                                    }

                                    bot.massSendText(message.text, messagerIds, (err, result) => {
                                        if (err) {
                                            // wechat 的群發功能如果在 15s 內發送太多相同訊息時
                                            // 會被 block 住，會一直收到錯誤訊息 "clientmsgid exist"
                                            // 此時必須等候 15s 後才能再正常發送
                                            reject(err);
                                            return;
                                        }
                                        resolve(result);
                                    });
                                }).then(() => {
                                    return nextPromise(i + 1);
                                });
                            };
                            return nextPromise(0);
                        };
                        return _multicast(recipientUids, messages);
                    default:
                        return Promise.resolve([]);
                }
            });
        };

        /**
         * @param {any} postMenu
         * @param {string} appId
         * @param {any} app
         */
        createMenu(postMenu, appId, app) {
            let bot = this.bots[appId];
            switch (app.type) {
                case LINE:
                    return bot.createRichMenu(postMenu);
                case WECHAT:
                default:
                    return Promise.resolve([]);
            }
        };

        /**
         * @param {string} platformMenuId
         * @param {string} appId
         * @param {any} app
         */
        deleteMenu(platformMenuId, appId, app) {
            let bot = this.bots[appId];
            switch (app.type) {
                case LINE:
                    return bot.deleteRichMenu(platformMenuId);
                case WECHAT:
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
         * @param {string} platformMenuId
         * @param {string} appId
         */
        getRichMenu(platformMenuId, appId) {
            let bot = this.bots[appId];
            return bot.getRichMenu(platformMenuId);
        };

        /**
         * @param {string} platformMenuId
         * @param {string} appId
         */
        getRichMenuImage(platformMenuId, appId) {
            let bot = this.bots[appId];
            return bot.getRichMenuImage(platformMenuId);
        };

        /**
         * @param {string} platformMenuId
         * @param {any} richmenuImg
         * @param {string} appId
         */
        setRichMenuImage(platformMenuId, richmenuImg, appId) {
            let bot = this.bots[appId];
            let imageBuffer = richmenuImg.fileBinary;
            return bot.setRichMenuImage(platformMenuId, imageBuffer, null);
        };

        /**
         * @param {string} userId
         * @param {string} platformMenuId
         * @param {string} appId
         */
        linkRichMenuToUser(userId, platformMenuId, appId) {
            let bot = this.bots[appId];
            return bot.linkRichMenuToUser(userId, platformMenuId);
        }

        /**
         * @param {string} userId
         * @param {string} platformMenuId
         * @param {string} appId
         */
        unlinkRichMenuFromUser(userId, platformMenuId, appId) {
            let bot = this.bots[appId];
            return bot.unlinkRichMenuFromUser(userId, platformMenuId);
        }

        leaveGroupRoom(appId, chatroomId) {
            return appsMdl.find(appId).then((apps) => {
                apps = apps || {};
                let app = apps[appId];
                if (!app) {
                    return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                }

                if (LINE === app.type) {
                    let lineBot;
                    return this.create(appId, app).then((_lineBot) => {
                        lineBot = _lineBot;
                        return appsChatroomsMdl.find(appId, chatroomId);
                    }).then((appsChatrooms) => {
                        if (!appsChatrooms && (appsChatrooms && 1 !== Object.keys(appsChatrooms).length)) {
                            return Promise.reject(API_ERROR.APP_CHATROOMS_FAILED_TO_FIND);
                        }

                        let chatroom = appsChatrooms[appId].chatrooms[chatroomId];
                        let platformGroupId = chatroom.platformGroupId;
                        let platformGroupType = chatroom.platformGroupType;
                        if (platformGroupId && platformGroupType) {
                            if ('room' === platformGroupType) {
                                return lineBot.leaveRoom(platformGroupId);
                            }
                            return lineBot.leaveGroup(platformGroupId);
                        }
                    });
                } else if (FACEBOOK === app.type) {
                    // Facebook 無支援群組聊天
                }
            });
        }
    }

    return new BotService();
})();
