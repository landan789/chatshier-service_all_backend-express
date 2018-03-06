let cipher = require('../helpers/cipher');
let app = require('../app');
let socketIO = require('socket.io');
let line = require('@line/bot-sdk');
let facebook = require('facebook-bot-messenger'); // facebook串接

let agents = require('../models/agents');
let appsComposes = require('../models/apps_composes');
let appsAutorepliesMdl = require('../models/apps_autoreplies');
let linetemplate = require('../models/linetemplate');
let appsKeywordrepliesMdl = require('../models/apps_keywordreplies');

let socketHlp = require('../helpers/socket');
let utility = require('../helpers/utility');
let helpersFacebook = require('../helpers/facebook');
let helpersBot = require('../helpers/bot');
let botSvc = require('../services/bot');

let appsMdl = require('../models/apps');
let appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
let appsMessagersMdl = require('../models/apps_messagers');
let appsMessagesMdl = require('../models/apps_messages');
let appsTemplatesMdl = require('../models/apps_templates');
let appsGreetingsMdl = require('../models/apps_greetings');
let groupsMdl = require('../models/groups');

let controllerCre = require('../cores/controller');

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
    let socketIOServer = socketIO(server);
    let chatshierNsp = socketIOServer.of('/chatshier');

    /** @type {Map<string, boolean>} */
    let messageCacheMap = new Map();
    let webhookProcQueue = [];

    app.post('/webhook/:webhookid', (req, res, next) => {
        let webhookid = req.params.webhookid;
        let bot = {};
        let appId = '';
        let app = {};

        /**
         * @param {string} messageText
         * @param {string} senderId
         * @param {any} [option]
         * @returns {Promise<any>}
         */
        function messageProcess(messageText, senderId, option) {
            let messageId = cipher.createHashKey(messageText);
            let totalMessages = [];
            let messager;
            let sender;
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
                    appsKeywordrepliesMdl.findReplyMessages(appId, replyIds.keywordreplyIds, (replyMessages) => {
                        resolve(replyMessages);
                    });
                });

                let templatesPromise = new Promise((resolve) => {
                    appsTemplatesMdl.findTemplateMessages(appId, replyIds.templateIds, (templateMessages) => {
                        resolve(templateMessages);
                    });
                });

                let autorepliesPromise = new Promise((resolve) => {
                    appsAutorepliesMdl.findAutorepliesByAppId(appId, (autoreplies) => {
                        autoreplies = autoreplies || {};
                        let timeNow = Date.now();

                        for (let key in autoreplies) {
                            let endedTime = autoreplies[key].endedTime;
                            let startedTime = autoreplies[key].startedTime;
                            if (startedTime <= timeNow && timeNow < endedTime) {
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
                let keywordMessages = Object.values(keywordreplies);

                let templates = promiseResults[1];
                let templateMessages = Object.values(templates);

                let autoreplies = promiseResults[2];
                let autoMessages = Object.values(autoreplies);

                let replyMessages = [];
                replyMessages = keywordMessages ? replyMessages.concat(keywordMessages) : replyMessages;
                replyMessages = autoMessages ? replyMessages.concat(autoMessages) : replyMessages;
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
                    let replyToken = option.event ? option.event.replyToken : '';

                    return botSvc.replyMessage(senderId, replyToken, replyMessages, app);
                }).then(() => {
                    totalMessages = replyMessages;

                    // 處理與訊息匹配的關鍵字回覆的次數更新
                    return appsKeywordrepliesMdl.increaseReplyCount(appId, Object.keys(keywordreplies));
                });
            }).then(() => {
                return botSvc.getProfile(senderId, app);
            }).then((profile) => {
                return new Promise((resolve) => {
                    appsMessagersMdl.replaceMessager(appId, senderId, profile, (_messager) => {
                        messager = _messager;
                        resolve();
                    });
                });
            }).then(() => {

                /** @type {ChatshierMessageInterface} */
                let message = {
                    text: messageText,
                    time: Date.now(),
                    type: '',
                    from: app.type,
                    messager_id: senderId
                };
                return helpersBot.convertMessage(bot, message, option, app);
            }).then((receivedMessages) => {
                return Promise.resolve(receivedMessages);
            }).then((receivedMessages) => {
                sender = messager;

                // 回復訊息與傳入訊息都整合，再寫入 DB
                totalMessages = receivedMessages.concat(totalMessages);

                return increaseMembersUnRead(appId, senderId, sender, totalMessages.length);
            }).then(() => {
                return sendMessagesToSockets(sender, senderId, totalMessages);
            });
        }

        /**
         * @param {string} senderId
         * @param {any} [option]
         * @returns {Promise<any>}
         */
        function followProcess(senderId, option) {
            return new Promise((resolve) => {
                appsGreetingsMdl.findGreetings(appId, (greetings) => {
                    resolve(greetings);
                });
            }).then((greetings) => {
                let messages = Object.values(greetings);

                // 沒有訊息資料就不對 SDK 發送訊息
                if (0 === messages.length) {
                    return Promise.resolve([]);
                };
                return Promise.resolve(messages);
            });
        }

        /**
         * @param {string} appId
         * @param {string} senderId
         * @param {any} messager
         * @returns {Promise<any>}
         */
        function increaseMembersUnRead(appId, senderId, messager, unReadCount) {
            let chatroomId = messager.chatroom_id;

            return new Promise((resolve) => {
                // 根據 app 內的 group_id 找到群組內所有成員
                let groupId = app.group_id;
                groupsMdl.findUserIds(groupId, (memberUserIds) => {
                    resolve(memberUserIds);
                });
            }).then((memberUserIds) => {
                // 將聊天室內所有的群組成員的未讀數 +1
                let messagerIds = memberUserIds;
                return Promise.all(messagerIds.map((messagerId) => {
                    // 不需更新發送者的未讀數
                    if (senderId === messagerId) {
                        return Promise.resolve();
                    }

                    return appsChatroomsMessagersMdl.increaseMessagerUnRead(appId, chatroomId, messagerId, unReadCount);
                }));
            }).then(() => {
                return messager;
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
                    appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, _message, (messageInDB) => {
                        resolve(messageInDB);
                    });
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
                    return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageToSocket);
                });
            }));
        }

        let webhookPromise = Promise.all(webhookProcQueue).then(() => {
            return new Promise((resolve, reject) => {
                appsMdl.findAppsByWebhookId(webhookid, (apps) => {
                    if (!apps) {
                        return reject(API_ERROR.APP_DID_NOT_EXIST);
                    }
                    appId = Object.keys(apps).shift() || '';
                    app = apps[appId];
                    resolve(app);
                });
            });
        }).then((app) => {
            return botSvc.parser(req, res, server, app);
        }).then((_bot) => {
            bot = _bot;
            switch (app.type) {
                case LINE:
                    /** @type {LineWebhookEventObject[]} */
                    let lineEvents = req.body.events || [];

                    return (function nextMessage(i) {
                        if (i >= lineEvents.length) {
                            return Promise.resolve();
                        }

                        let lineEvent = lineEvents[i];
                        let senderId = lineEvent.source.userId;
                        let replyToken = lineEvent.replyToken;

                        // 處理 LINE webhook 的檢證
                        if ((LINE_WEBHOOK_VERIFY_UID === senderId && REPLY_TOKEN_0 === replyToken) ||
                            (LINE_WEBHOOK_VERIFY_UID === senderId && REPLY_TOKEN_F === replyToken)) {
                            return nextMessage(i + 1);
                        }

                        let lineEventType = lineEvent.type.toUpperCase();
                        let option = {
                            event: lineEvent
                        };
                        let sender;
                        let messages = [];
                        return Promise.resolve().then(() => {
                            if (LINE_WEBHOOK_EVENTS.MESSAGE === lineEventType &&
                                !messageCacheMap.get(lineEvent.message.id) && lineEvent.message) {
                                messageCacheMap.set(lineEvent.message.id, true);
                                let messageText = lineEvent.message.text || '';
                                return messageProcess(messageText, senderId, option);
                            } else if (LINE_WEBHOOK_EVENTS.FOLLOW === lineEventType) {
                                return followProcess(senderId, option).then((_messages) => {
                                    messages = _messages;
                                    return botSvc.replyMessage(senderId, option.event.replyToken, messages, app);
                                }).then(() => {
                                    return botSvc.getProfile(senderId, app);
                                    // TODO 需要把訊息寫入 DB
                                }).then((profile) => {
                                    return new Promise((resolve) => {
                                        appsMessagersMdl.replaceMessager(appId, senderId, profile, (messager) => {
                                            resolve(messager);
                                        });
                                    });
                                }).then((_sender) => {
                                    sender = _sender;
                                    return increaseMembersUnRead(appId, senderId, sender, messages.length);
                                }).then(() => {
                                    return sendMessagesToSockets(sender, senderId, messages);
                                });;
                            }
                            // 非 message 和 follow 類的事件不處理，直接忽略
                        }).then(() => {
                            return nextMessage(i + 1);
                        });
                    })(0);
                case FACEBOOK:
                    let facebookEntries = req.body.entry || [];
                    return Promise.all(facebookEntries.map((facehookEntry) => {
                        let messaging = facehookEntry.messaging || [];

                        return (function nextMessage(i) {
                            if (i >= messaging.length) {
                                return Promise.resolve();
                            }

                            let senderId = messaging[i].sender.id;
                            let messageText = messaging[i].message.text;
                            let option = {
                                message: messaging[i].message
                            };

                            return messageProcess(messageText, senderId, option);
                        })(0);
                    }));
            }
            return Promise.resolve([]);
        }).then(() => {
            res.sendStatus(200);
        }).catch((error) => {
            console.trace(error);
            res.sendStatus(500);
        }).then(() => {
            let idx = webhookProcQueue.indexOf(webhookPromise);
            idx >= 0 && webhookProcQueue.splice(idx, 1);
        });

        webhookProcQueue.push(webhookPromise);
    });

    chatshierNsp.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        socket.on(SOCKET_EVENTS.APP_REGISTRATION, (appId, callback) => {
            socketHlp.addSocket(appId, socket);
            ('function' === typeof callback) && callback();
        });

        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            socketHlp.removeSocket(socket);
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
                return new Promise((resolve) => {
                    appsMdl.findByAppId(appId, (apps) => {
                        let app = apps[appId];
                        resolve(app);
                    });
                });
            }).then((app) => {
                // 3. 利用 SDK 傳給各平台的 server
                return Promise.resolve().then(() => {
                    switch (appType) {
                        case FACEBOOK:
                            let facebookConfig = {
                                pageID: app.id1,
                                appID: app.id2,
                                appSecret: app.secret,
                                validationToken: app.token1,
                                pageToken: app.token2
                            };

                            let fbBot = facebook.create(facebookConfig);
                            return helpersFacebook.sendMessage(fbBot, receiverId, message);
                        case LINE:
                            let lineClientConfig = {
                                channelAccessToken: app.token1
                            };

                            let lineBot = new line.Client(lineClientConfig);
                            let lineMessage = utility.lineMessageTypeForPushMessage(message);
                            return lineBot.pushMessage(receiverId, lineMessage);
                        default:
                            break;
                    }
                }).then(() => {
                    return app;
                });
            }).then((app) => {
                return new Promise((resolve) => {
                    // 根據 app 內的 group_id 找到群組內所有成員
                    let groupId = app.group_id;
                    groupsMdl.findUserIds(groupId, (memberUserIds) => {
                        resolve(memberUserIds);
                    });
                });
            }).then((memberUserIds) => {
                // 將聊天室內所有的群組成員的未讀數 +1
                return Promise.all(memberUserIds.map((memberUserId) => {
                    // 不需更新發送者的未讀數
                    if (senderId === memberUserId) {
                        return Promise.resolve();
                    }

                    return appsChatroomsMessagersMdl.increaseMessagerUnRead(appId, chatroomId, memberUserId);
                }));
            }).then(() => {
                // 將 socket 資料原封不動的廣播到 chatshier chatroom
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
            }).then(() => {
                ('function' === typeof callback) && callback();
            });
        });

        socket.on(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, (req, callback) => {
            let msgerId = req.params.messagerid;
            let appId = '';

            return controllerCre.AppsRequestVerify(req).then((checkedAppId) => {
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
                req.body.custom_tags && (messagerData.custom_tags = req.body.custom_tags);

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
                let messagerToSocket = {
                    appId: appId,
                    messageId: msgerId,
                    messager: messager
                };
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.UPDATE_MESSAGER_TO_CLIENT, messagerToSocket);
            }).then(() => {
                ('function' === typeof callback) && callback();
            });
        });

        // 推播全部人
        socket.on('push composes to all', (data) => {
            let userId = data.userId;
            let appId = data.appId;
            let composes = data.composes;
            let messages = composes;
            let messagers;
            let bot = {};
            let appType = '';
            let req = {
                method: 'POST',
                params: {
                    appid: appId,
                    userid: userId
                }
            };

            return controllerCre.AppsRequestVerify(req).then(() => {
                if (!appId) {
                    return Promise.reject(new Error(API_ERROR.APPID_FAILED_TO_FIND));
                };
                return new Promise((resolve, reject) => {
                    appsMdl.findByAppId(appId, (apps) => {
                        if (!apps) {
                            reject(API_ERROR.APPID_WAS_EMPTY);
                        }
                        let app = apps[appId];
                        resolve(app);
                    });
                });
            }).then((app) => {
                appType = app.type;
                return new Promise((resolve, reject) => {
                    switch (app.type) {
                        case LINE:
                            let lineConfig = {
                                channelSecret: app.secret,
                                channelAccessToken: app.token1
                            };
                            bot = new line.Client(lineConfig);
                            resolve();
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
                            bot = facebook.create(facebookConfig, server);
                            resolve();
                            break;
                    }
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMessagersMdl.findAppMessagers(appId, (result) => {
                        if (!result) {
                            reject(API_ERROR.APP_MESSAGER_FAILED_TO_FIND);
                        }
                        resolve(result);
                    });
                });
            }).then((_messagers) => {
                messagers = _messagers;
                switch (appType) {
                    case LINE:
                        return bot.multicast(Object.keys(messagers[appId].messagers), messages);
                    case FACEBOOK:
                        return Promise.all(Object.keys(messagers[appId].messagers).map((messager) => {
                            return Promise.all(messages.map((message) => {
                                return bot.sendTextMessage(messager, message.text);
                            }));
                        }));
                }
            }).then(() => {
                return Promise.all(messages.map((message) => {
                    return new Promise((resolve, reject) => {
                        appsComposes.insert(appId, message, (result) => {
                            // 失敗需要 reject, catch
                            if (!result) {
                                reject(API_ERROR.APP_COMPOSE_FAILED_TO_INSERT);
                            }
                            resolve(messagers);
                        });
                    });
                }));
            }).then(() => {
                return Promise.all(Object.keys(messagers[appId].messagers).map((messagerIds) => {
                    let messager = messagers[appId];
                    let chatroomId = messager.messagers[messagerIds].chatroom_id;

                    return Promise.all(messages.map((message) => {
                        /** @type {ChatshierMessageInterface} */
                        let _message = {
                            from: SYSTEM,
                            messager_id: '',
                            text: message.text,
                            time: Date.now(),
                            type: 'text'
                        };

                        return new Promise((resolve, reject) => {
                            appsChatroomsMessagesMdl.insertMessageByAppIdByMessagerId(appId, messagerIds, _message, (message) => {
                                if (!message) {
                                    reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                                };
                                resolve(message);
                            });
                        }).then(() => {
                            /** @type {ChatshierChatSocketInterface} */
                            let messageToSocket = {
                                appId: appId,
                                appType: appType,
                                chatroomId: chatroomId,
                                messagerId: '',
                                message: _message
                            };
                            return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageToSocket);
                        });
                    }));
                }));
            }).catch((err) => {
                console.log(err);
                let json = {
                    status: 0,
                    msg: err.MSG,
                    code: err.CODE
                };
                socket.emit('verify', json);
            });
        });

        // 訊息已讀
        socket.on(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, (data) => {
            let appId = data.appId;
            let chatroomId = data.chatroomId;
            let messagerId = data.messagerId;
            return appsChatroomsMessagersMdl.resetMessagerUnRead(appId, chatroomId, messagerId);
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

    return socketIOServer;
}

module.exports = init;
