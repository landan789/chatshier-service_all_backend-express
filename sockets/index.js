let cipher = require('../helpers/cipher');
let app = require('../app');
let socketio = require('socket.io');
let facebook = require('facebook-bot-messenger'); // facebook串接
let line = require('@line/bot-sdk');
let admin = require('firebase-admin'); // firebase admin SDK
let bodyParser = require('body-parser');

const appsMessagersCtl = require('../controllers/apps_messagers');
const appsSocketCtl = require('./controllers/apps');

let agents = require('../models/agents');
let appsComposes = require('../models/apps_composes');
let appsAutorepliesMdl = require('../models/apps_autoreplies');
let linetemplate = require('../models/linetemplate');
let appsKeywordrepliesMdl = require('../models/apps_keywordreplies');

let utility = require('../helpers/utility');
let helpersFacebook = require('../helpers/facebook');
let helpersBot = require('../helpers/bot');

let webhookMdl = require('../models/webhooks');
let appsMdl = require('../models/apps');
let appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
let appsChatroomsMdl = require('../models/apps_chatrooms');
let appsMessagersMdl = require('../models/apps_messagers');
let appsMessagesMdl = require('../models/apps_messages');
let appsTemplatesMdl = require('../models/apps_templates');
let appsGreetingsMdl = require('../models/apps_greetings');

const SOCKET_EVENTS = require('../config/socket-events');
const API_ERROR = require('../config/api_error');
const API_SUCCESS = require('../config/api_success');

const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';
const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';

const LINE_WEBHOOK_EVENTS = {
    FOLLOW: 'FOLLOW',
    MESSAGE: 'MESSAGE'
};
const REPLY_TOKEN_0 = '00000000000000000000000000000000';
const REPLY_TOKEN_F = 'ffffffffffffffffffffffffffffffff';
const LINE_WEBHOOK_VERIFY_UID = 'Udeadbeefdeadbeefdeadbeefdeadbeef';

function init(server) {
    let io = socketio(server);
    let chatshierNsp = io.of('/chatshier');

    app.get('/loading', (req, res) => {
        res.send(303);
    });

    app.post('/webhook/:webhookId', (req, res, next) => {
        let webhookId = req.params.webhookId;
        let nowTime = new Date().getTime();
        let botManager = {};
        let appId = '';
        let app = null;
        let totalMessages = [];

        /**
         * @param {string} messageText
         * @param {string} senderId
         * @param {any} [options]
         */
        function messageProcess(messageText, senderId, options) {
            let messageId = cipher.createHashKey(messageText);

            return new Promise((resolve, reject) => {
                // 到 models/apps_messages.js，找到 keywordreply_ids
                appsMessagesMdl.findMessage(appId, messageId, (messageInDB) => {
                    messageInDB = messageInDB || {};

                    let replyIds = {
                        keywordreplyIds: messageInDB.keywordreply_ids || [],
                        templateIds: messageInDB.template_ids || []
                    };

                    resolve(replyIds);
                });
            }).then((replyIds) => {
                // =========
                // 此 Promise 區塊準備關鍵字回覆、樣板、自動回覆資料的區塊
                // =========

                // 找到要回應的關鍵字串
                let keywordrepliesPromise = new Promise((resolve) => {
                    appsKeywordrepliesMdl.findReplyMessages(appId, replyIds.keywordreplyIds, resolve);
                });

                let templatesPromise = new Promise((resolve) => {
                    appsTemplatesMdl.findTemplateMessages(appId, replyIds.templateIds, resolve);
                });

                let autorepliesPromise = new Promise((resolve) => {
                    appsAutorepliesMdl.findAutorepliesByAppId(appId, (autoreplies) => {
                        autoreplies = autoreplies || {};
                        for (let key in autoreplies) {
                            let endedTime = autoreplies[key].endedTime;
                            let startedTime = autoreplies[key].startedTime;
                            if (startedTime <= nowTime && nowTime < endedTime) {
                                continue;
                            }
                            delete autoreplies[key];
                        }
                        resolve(autoreplies);
                    });
                });

                return Promise.all([
                    keywordrepliesPromise,
                    templatesPromise,
                    autorepliesPromise
                ]);
            }).then((promiseResults) => {
                // =========
                // 此 Promise 區塊處理訊息發送
                // =========

                let keywordreplies = promiseResults[0];
                let keywordMessages = Object.keys(keywordreplies).map((keywordreplyId) => keywordreplies[keywordreplyId]);

                let templates = promiseResults[1];
                let templateMessages = Object.keys(templates).map((templateId) => templates[templateId]);

                let autoreplies = promiseResults[2];
                let autoMessages = Object.keys(autoreplies).map((autoreplyId) => autoreplies[autoreplyId]);

                let replyMessages = [];
                replyMessages = keywordMessages ? replyMessages.concat(keywordMessages) : replyMessages;
                replyMessages = autoMessages ? replyMessages.concat(autoMessages) : replyMessages;

                let textOnlyMessages = replyMessages.slice();
                replyMessages = templateMessages ? replyMessages.concat(templateMessages) : replyMessages;

                return Promise.resolve().then(() => {
                    // 沒有訊息資料就不對 SDK 發送訊息
                    if (!replyMessages.length) {
                        return;
                    };

                    replyMessages = replyMessages.map((message) => {
                        /** @type {ChatshierMessageInterface} */
                        let _message = {
                            messager_id: '',
                            from: SYSTEM,
                            text: message.text || '',
                            type: message.type || 'text',
                            time: Date.now(), // 將要回覆的訊息加上時戳
                            src: ''
                        };
                        return _message;
                    });

                    switch (app.type) {
                        case LINE:
                            let replyToken = options.lineEvent.replyToken;
                            return botManager.lineBot.replyMessage(replyToken, replyMessages);
                        case FACEBOOK:
                            return Promise.all(replyMessages.map((message) => {
                                return botManager.fbBot.sendTextMessage(senderId, message);
                            }));
                    }
                }).then(() => {
                    totalMessages = replyMessages;
                    // 處理與訊息匹配的關鍵字回覆的次數更新
                    return appsKeywordrepliesMdl.increaseReplyCount(appId, Object.keys(keywordreplies));
                });
            }).then(() => {
                return updateSenderProfile(senderId);
            }).then((messager) => {
                let type = 'text';

                switch (app.type) {
                    case LINE:
                        let messageType = options.lineEvent.message.type;
                        type = messageType;
                        break;
                    case FACEBOOK:
                    default:
                        type = 'text';
                        break;
                };

                /** @type {ChatshierMessageInterface} */
                let receivedMessage = {
                    text: messageText,
                    time: Date.now(),
                    type: type,
                    from: app.type,
                    messager_id: senderId
                };

                return new Promise((resolve) => {
                    switch (app.type) {
                        case LINE:
                            helpersBot.lineMessageType(botManager.lineBot, options.lineEvent, receivedMessage, resolve);
                            break;
                        case FACEBOOK:
                            helpersBot.facebookMessageType(options.fbMessage, receivedMessage, resolve);
                            break;
                        default:
                            resolve([receivedMessage]);
                            break;
                    }
                }).then((receivedMessages) => {
                    return { messager, receivedMessages };
                });
            }).then((promiseResult) => {
                let sender = promiseResult.messager;
                let receivedMessages = promiseResult.receivedMessages;
                totalMessages = receivedMessages.concat(totalMessages);

                // 回復訊息與傳入訊息都整合，再寫入 DB
                return sendMessagesToSockets(sender, senderId, totalMessages);
            });
        }

        /**
         * @param {string} senderId
         * @param {any} [options]
         */
        function followProcess(senderId, options) {
            return new Promise((resolve) => {
                appsGreetingsMdl.findGreetings(appId, resolve);
            }).then((greetings) => {
                let greetingMessages = Object.keys(greetings).map((greetingId) => greetings[greetingId]);

                // 沒有訊息資料就不對 SDK 發送訊息
                if (!greetingMessages.length) {
                    return Promise.resolve(null);
                };

                return Promise.resolve().then(() => {
                    switch (app.type) {
                        case LINE:
                            let replyToken = options.lineEvent.replyToken;
                            return botManager.lineBot.replyMessage(replyToken, greetingMessages);
                        case FACEBOOK:
                            return Promise.all(greetingMessages.map((message) => {
                                return botManager.fbBot.sendTextMessage(senderId, message);
                            }));
                    }
                }).then(() => {
                    return updateSenderProfile(senderId);
                }).then((sender) => {
                    return sendMessagesToSockets(sender, senderId, greetingMessages);
                });
            });
        }

        /**
         * @param {string} senderId
         * @returns {Promise<any>}
         */
        function updateSenderProfile(senderId) {
            return Promise.resolve().then(() => {
                // =========
                // 此 Promise 區塊為取得各平台的 messager 資料
                // =========

                switch (app.type) {
                    case LINE:
                        return botManager.lineBot.getProfile(senderId);
                    case FACEBOOK:
                        return botManager.fbBot.getProfile(senderId);
                }
            }).then((profile) => {
                // =========
                // 此 Promise 區塊為將各平台的 messager 資料更新至資料庫中
                // =========

                if (!profile) {
                    return;
                }

                let messager = {
                    unRead: 1
                };

                switch (app.type) {
                    case LINE:
                        messager.name = profile ? profile.displayName : '';
                        messager.photo = profile ? profile.pictureUrl : '';
                        break;
                    case FACEBOOK:
                        messager.name = profile ? profile.first_name + ' ' + profile.last_name : '';
                        messager.photo = profile ? profile.profile_pic : '';
                        break;
                };

                return new Promise((resolve) => {
                    appsMessagersMdl.replaceMessager(appId, senderId, messager, resolve);
                });
            });
        }

        /**
         * @param {any} sender
         * @param {string} senderId
         * @param {any} messages
         * @returns {Promise<any>}
         */
        function sendMessagesToSockets(sender, senderId, messages) {
            let chatroomId = sender.chatroom_id;

            return Promise.all(messages.map((message) => {
                let _message = {
                    from: message.from,
                    messager_id: message.messager_id || '',
                    src: message.src || '',
                    text: message.text || '',
                    time: message.time || Date.now(),
                    type: message.type || ''
                };

                return new Promise((resolve, reject) => {
                    // 寫入 DB Promise.all 批次寫入 DB
                    appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, _message, resolve);
                }).then((messageInDB) => {
                    /** @type {ChatshierChatSocketInterface} */
                    let messageToSocket = {
                        appId: appId,
                        appType: app.type,
                        chatroomId: chatroomId,
                        messagerId: senderId,
                        message: messageInDB
                    };

                    // 用 socket.emit 回傳訊息給 client
                    // 指定 appId 為限制只有擁有此 app 的 user 才會收到此 socket 資料
                    appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageToSocket);
                });
            }));
        }

        return new Promise((resolve, reject) => {
            appsMdl.findAppsByWebhookId(webhookId, (apps) => {
                if (!apps) {
                    return reject(API_ERROR.APP_DID_NOT_EXIST);
                }
                resolve(apps);
            });
        }).then((apps) => {
            appId = Object.keys(apps).shift();
            app = apps[appId];

            // 根據目前支援的 app webhook 類型，產生 SDK 的類別物件
            switch (app.type) {
                case LINE:
                    return new Promise((resolve) => {
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };

                        // 中介軟體執行中介軟體的方法
                        // 當前的 request 資料是屬於 http 的最原始資料
                        // LINE 的 middleware 會自行進行 bodyParser 後做相關的驗證動作
                        line.middleware(lineConfig)(req, res, () => {
                            botManager.lineBot = new line.Client(lineConfig);
                            resolve();
                        });
                    });
                case FACEBOOK:
                    return new Promise((resolve) => {
                        // 由於目前 request 資料屬於 http 的原始資料
                        // FACEBOOK 沒有 middleware
                        // 沒有經過 bodyParser 的話沒有辦法解析出 json 格式資料
                        bodyParser.json()(req, res, () => {
                            let facebookConfig = {
                                pageID: app.id1,
                                appID: app.id2 || '',
                                appSecret: app.secret,
                                validationToken: app.token1,
                                pageToken: app.token2 || ''
                            };
                            // fbBot 因為無法取得 json 因此需要在 bodyParser 才能解析，所以拉到這層
                            botManager.fbBot = facebook.create(facebookConfig, server);
                            resolve();
                        });
                    });
            }
        }).then(() => {
            switch (app.type) {
                case LINE:
                    /** @type {LineWebhookEventObject[]} */
                    let lineEvents = req.body.events || [];

                    return Promise.all(lineEvents.map((lineEvent) => {
                        // 處理 LINE webhook 的檢證
                        let senderId = lineEvent.source.userId;
                        let replyToken = lineEvent.replyToken;
                        if ((LINE_WEBHOOK_VERIFY_UID === senderId && REPLY_TOKEN_0 === replyToken) ||
                            (LINE_WEBHOOK_VERIFY_UID === senderId && REPLY_TOKEN_F === replyToken)) {
                            return Promise.resolve(null);
                        }

                        // 非 message 和 follow 類的事件不處理，直接忽略，回應 200
                        let lineEventType = lineEvent.type.toUpperCase();
                        let messageOpts = {
                            lineEvent: lineEvent
                        };

                        if (LINE_WEBHOOK_EVENTS.MESSAGE === lineEventType) {
                            let messageText = lineEvent.message ? (lineEvent.message.text || '') : '';
                            return messageProcess(messageText, senderId, messageOpts);
                        } else if (LINE_WEBHOOK_EVENTS.FOLLOW === lineEventType) {
                            return followProcess(senderId, messageOpts);
                        }
                        return Promise.resolve(null);
                    }));
                case FACEBOOK:
                    let webhookEntries = req.body.entry || [];
                    return Promise.all(webhookEntries.map((webhookEntry) => {
                        let fbMessagesPack = webhookEntry.messaging || [];
                        return Promise.all(fbMessagesPack.map((messagePack) => {
                            let senderId = messagePack.sender.id;
                            let messageText = messagePack.message.text;

                            let messageOpts = {
                                fbMessage: messagePack.message
                            };
                            return messageProcess(messageText, senderId, messageOpts);
                        }));
                    }));
            }
            return Promise.resolve([]);
        }).then(() => {
            res.sendStatus(200);
        }).catch(() => {
            res.sendStatus(500);
        });
    });

    chatshierNsp.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        socket.on(SOCKET_EVENTS.APP_REGISTRATION, (appId, callback) => {
            appsSocketCtl.addSocket(appId, socket);
            ('function' === typeof callback) && callback();
        });

        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            appsSocketCtl.removeSocket(socket);
        });

        socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, (data, callback) => {
            /** @type {ChatshierChatSocketInterface} */
            let socketBody = data;

            // 1. Server 接收到 client 來的聊天訊息
            let appId = socketBody.appId;
            let appType = socketBody.appType;
            let chatroomId = socketBody.chatroomId;
            let message = socketBody.message;
            let receiverId = socketBody.messagerId;
            let senderId = message.messager_id;

            return Promise.resolve().then(() => {
                // 2. 將資料寫入至資料庫
                let messageToDB = {
                    type: message.type.toLowerCase(),
                    time: message.time || Date.now(),
                    text: message.text,
                    from: CHATSHIER,
                    messager_id: senderId,
                    src: !message.text ? (message.src || '') : ''
                };

                return new Promise((resolve, reject) => {
                    appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, messageToDB, (newChatroomId) => {
                        if (!newChatroomId) {
                            reject(new Error(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT));
                            return;
                        }
                        resolve(newChatroomId);
                    });
                });
            }).then(() => {
                // 3. 利用 SDK 傳給各平台的 server
                if (FACEBOOK === appType) {
                    return new Promise((resolve) => {
                        appsMdl.findByAppId(appId, resolve);
                    }).then((apps) => {
                        return new Promise((resolve) => {
                            let facebookConfig = {
                                pageID: apps[appId].id1,
                                appID: apps[appId].id2,
                                appSecret: apps[appId].secret,
                                validationToken: apps[appId].token1,
                                pageToken: apps[appId].token2
                            };
                            let fbBot = facebook.create(facebookConfig);
                            helpersFacebook.sendMessage(fbBot, receiverId, message, resolve);
                        });
                    });
                } else if (LINE === appType) {
                    return new Promise((resolve) => {
                        appsMdl.findByAppId(appId, resolve);
                    }).then((apps) => {
                        let lineClientConfig = {
                            channelAccessToken: apps[appId].token1
                        };
                        let lineBot = new line.Client(lineClientConfig);

                        return new Promise((resolve, reject) => {
                            utility.LINEMessageTypeForPushMessage(message, resolve);
                        }).then((lineMessage) => {
                            return lineBot.pushMessage(receiverId, lineMessage);
                        });
                    });
                } else if (CHATSHIER === appType) {
                    // 若是屬於內部聊天室，則需要將聊天室內所有的 messager 的未讀數 +1
                    return appsChatroomsMdl.findMessagerIdsInChatroom(appId, chatroomId).then((appMessagers) => {
                        // 不需更新發送者的未讀數
                        delete appMessagers[appId].messagers[senderId];

                        let messagerIds = Object.keys(appMessagers[appId].messagers);
                        return Promise.all(messagerIds.map((_messagerId) => {
                            return appsMessagersMdl.replaceMessager(appId, _messagerId, { unRead: 1 });
                        }));
                    });
                }
            }).then(() => {
                // 將 socket 資料原封不動的廣播到 chatshier chatroom
                if (!appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody)) {
                    return Promise.reject(new Error());
                }
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.trace(err);
            });
        });

        socket.on(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, (req, callback) => {
            let msgerId = req.messagerid;
            let appId = '';

            return appsMessagersCtl.paramsChecking(req).then((checkedAppId) => {
                appId = checkedAppId;
                if (!msgerId) {
                    return Promise.reject(API_ERROR.MESSAGERID_WAS_EMPTY);
                }

                // 只允許更新 API 可編輯的屬性
                let messagerData = {};
                ('string' === typeof req.body.photo) && (messagerData.photo = req.body.photo);
                ('number' === typeof req.body.age) && (messagerData.age = req.body.age);
                ('string' === typeof req.body.email) && (messagerData.email = req.body.email);
                ('string' === typeof req.body.phone) && (messagerData.phone = req.body.phone);
                ('string' === typeof req.body.gender) && (messagerData.gender = req.body.gender);
                ('string' === typeof req.body.remark) && (messagerData.remark = req.body.remark);
                req.body.assigned && (messagerData.assigned = req.body.assigned);

                if (!(req.body.custom_tags instanceof Array)) {
                    return messagerData;
                }

                // 將舊的 custom_tags 陣列資料取出合併
                return new Promise((resolve) => {
                    appsMessagersMdl.findMessager(appId, msgerId, (appMessager) => {
                        if (!appMessager) {
                            messagerData.custom_tags = req.body.custom_tags;
                            resolve(messagerData);
                            return;
                        }

                        // 預處理 custom_tags 陣列資料，使陣列當中的 tagId 不重複
                        let messager = appMessager[appId].messagers[msgerId];
                        messager.custom_tags = messager.custom_tags || [];
                        messagerData.custom_tags = (function tagArrayUnique(mergedArray) {
                            let arr = mergedArray.slice();
                            for (let i = 0; i < arr.length; ++i) {
                                for (let j = i + 1; j < arr.length; ++j) {
                                    if (arr[i].tag_id === arr[j].tag_id) {
                                        arr[i].value = arr[j].value;
                                        arr.splice(j--, 1);
                                    }
                                }
                            }
                            return arr;
                        })(messager.custom_tags.concat(req.body.custom_tags));
                        resolve(messagerData);
                    });
                });
            }).then((messagerData) => {
                return new Promise((resolve, reject) => {
                    appsMessagersMdl.replaceMessager(appId, msgerId, messagerData, (messager) => {
                        if (!messager) {
                            reject(API_ERROR.APP_MESSAGER_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve(messager);
                    });
                });
            }).then((messager) => {
                let socketResponse = {
                    appId: appId,
                    messageId: msgerId,
                    messager: messager
                };
                appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.UPDATE_MESSAGER_TO_CLIENT, socketResponse);
                ('function' === typeof callback) && callback();
            });
        });

        // 推播全部人
        socket.on('push composes to all', (data) => {
            let userId = data.userId;
            let appId = data.appId;
            let composes = data.composes;
            var messages = composes;

            if (!appId) {
                return Promise.reject(new Error());
            }

            /** @type {ChatshierChatSocketInterface} */
            let messageToSocket = {
                appId: appId,
                appType: '',
                chatroomId: '',
                messagerId: '',
                message: null
            };

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.findByAppId(appId, (apps) => {
                        let app = apps[appId];
                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        messageToSocket.appType = app.type;
                        let lineBot = new line.Client(lineConfig);
                        resolve(lineBot);
                    });
                });
            }).then((lineBot) => {
                return new Promise((resolve, reject) => {
                    appsMessagersMdl.findAppMessagers(appId, resolve);
                }).then((messagers) => {
                    return lineBot.multicast(Object.keys(messagers[appId].messagers), messages).then(() => {
                        return messagers[appId].messagers;
                    });
                });
            }).then((messagers) => {
                return Promise.all(messages.map((message) => {
                    return new Promise((resolve) => {
                        appsComposes.insert(appId, message, (result) => {
                            resolve(messagers);
                        });
                    });
                }));
            }).then((messagers) => {
                let messagerIds = Object.keys(messagers);

                return Promise.all(messagerIds.map((messagerId) => {
                    return new Promise((resolve) => {
                        appsMessagersMdl.findMessager(appId, messagerId, (messagersInfo) => {
                            let chatroomId = messagersInfo[appId].messagers[messagerId].chatroom_id;
                            resolve(chatroomId);
                        });
                    }).then((chatroomId) => {
                        return Promise.all(messages.map((message) => {
                            /** @type {ChatshierMessageInterface} */
                            let messageInfo = {
                                from: SYSTEM,
                                messager_id: '',
                                text: message.text,
                                time: Date.now(),
                                type: 'text'
                            };

                            return new Promise((resolve) => {
                                appsChatroomsMessagesMdl.insertMessageByAppIdByMessagerId(appId, messagerId, messageInfo, resolve);
                            }).then(() => {
                                messageToSocket.chatroomId = chatroomId;
                                messageToSocket.message = messageInfo;
                                appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageInfo);
                            });
                        }));
                    });
                }));
            });
        });

        // 訊息已讀
        socket.on(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, (data) => {
            let appId = data.appId;
            let messagerId = data.messagerId;
            return appsChatroomsMessagesMdl.updateUnreadStatus(appId, messagerId);
        });
        /* ===聊天室end=== */

        /* ===內部群組start=== */

        // 更新內部群組右邊的資料
        socket.on('update internal profile', data => {
            agents.get(function(agentChatData) {
                for (let i in agentChatData) {
                    if (agentChatData[i].Profile.roomId === data.roomId) {
                        let updateObj = {};
                        for (let prop in data) {
                            updateObj[prop] = data[prop];
                        }
                        agents.updateProf(i, updateObj);
                        break;
                    }
                }
            });
        });
        /* ===內部群組end=== */

        /* ===template start=== */
        socket.on('create template', (userId, data, callback) => {
            linetemplate.create(userId, data);
            callback();
        });

        socket.on('request template', (userId, callback) => {
            linetemplate.get(userId, callback);
        });

        socket.on('get template', (userId, channelId, keyword, callback) => {
            linetemplate.getTemplate(channelId, keyword, callback);
        });

        socket.on('change template', (userId, id, updateObj, callback) => {
            linetemplate.set(userId, id, updateObj);
            callback();
        });
        /* ===template end=== */
    });
    // FUNCTIONS

    return io;
}

module.exports = init;