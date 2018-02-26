let cipher = require('../helpers/cipher');
let app = require('../app');
let socketio = require('socket.io');
let line = require('@line/bot-sdk');
let facebook = require('facebook-bot-messenger'); // facebook串接

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
let botSvc = require('../services/bot');

let appsMdl = require('../models/apps');
let appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
let appsMessagersMdl = require('../models/apps_messagers');
let appsMessagesMdl = require('../models/apps_messages');
let appsTemplatesMdl = require('../models/apps_templates');
let appsGreetingsMdl = require('../models/apps_greetings');
let groupsMdl = require('../models/groups');

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

    /** @type {Map<string, boolean>} */
    let messageCacheMap = new Map();
    let webhookProcQueue = [];

    app.post('/webhook/:webhookid', (req, res, next) => {
        let webhookid = req.params.webhookid;
        let nowTime = new Date().getTime();
        let bot = {};
        let appId = '';
        let app = {};

        /**
         * @param {string} messageText
         * @param {string} senderId
         * @param {any} [options]
         * @returns {Promise<any>}
         */
        function messageProcess(messageText, senderId, options) {
            let messageId = cipher.createHashKey(messageText);
            let totalMessages = [];

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
                let keywordMessages = Object.values(keywordreplies);

                let templates = promiseResults[1];
                let templateMessages = Object.values(templates);

                let autoreplies = promiseResults[2];
                let autoMessages = Object.values(autoreplies);

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
                            return bot.replyMessage(replyToken, replyMessages);
                        case FACEBOOK:
                            return Promise.all(replyMessages.map((message) => {
                                return bot.sendTextMessage(senderId, message);
                            }));
                    }
                }).then(() => {
                    totalMessages = replyMessages;

                    // 處理與訊息匹配的關鍵字回覆的次數更新
                    return appsKeywordrepliesMdl.increaseReplyCount(appId, Object.keys(keywordreplies));
                });
            }).then(() => {
                return updateSenderProfile(appId, senderId);
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
                let prototypeMessage = {
                    text: messageText,
                    time: Date.now(),
                    type: type,
                    from: app.type,
                    messager_id: senderId
                };

                return new Promise((resolve) => {
                    switch (app.type) {
                        case LINE:
                            helpersBot.convertMsgByLineMsgType(bot, options.lineEvent, prototypeMessage, (receivedMessages) => {
                                resolve(receivedMessages);
                            });
                            break;
                        case FACEBOOK:
                            helpersBot.convertMsgByFbAttachType(options.fbMessage, prototypeMessage, (receivedMessages) => {
                                resolve(receivedMessages);
                            });
                            break;
                        default:
                            resolve([prototypeMessage]);
                            break;
                    }
                }).then((receivedMessages) => {
                    return { messager, receivedMessages };
                });
            }).then((promiseResult) => {
                let sender = promiseResult.messager;
                let receivedMessages = promiseResult.receivedMessages;

                // 回復訊息與傳入訊息都整合，再寫入 DB
                totalMessages = receivedMessages.concat(totalMessages);

                return increaseMembersUnRead(appId, senderId, sender, totalMessages.length).then(() => {
                    return sendMessagesToSockets(sender, senderId, totalMessages);
                });
            });
        }

        /**
         * @param {string} senderId
         * @param {any} [options]
         * @returns {Promise<any>}
         */
        function followProcess(senderId, options) {
            let totalMessages = [];

            return new Promise((resolve) => {
                appsGreetingsMdl.findGreetings(appId, (greetings) => {
                    resolve(greetings);
                });
            }).then((greetings) => {
                let greetingMessages = Object.values(greetings);
                totalMessages = greetingMessages;

                // 沒有訊息資料就不對 SDK 發送訊息
                if (0 === totalMessages.length) {
                    return;
                };

                return Promise.resolve().then(() => {
                    switch (app.type) {
                        case LINE:
                            let replyToken = options.lineEvent.replyToken;
                            return bot.replyMessage(replyToken, greetingMessages);
                        case FACEBOOK:
                            return Promise.all(greetingMessages.map((message) => {
                                return bot.sendTextMessage(senderId, message);
                            }));
                    }
                });
            }).then(() => {
                return updateSenderProfile(appId, senderId);
            }).then((sender) => {
                if (0 === totalMessages.length) {
                    return;
                };

                return increaseMembersUnRead(appId, senderId, sender, totalMessages.length).then(() => {
                    return sendMessagesToSockets(sender, senderId, totalMessages);
                });
            });
        }

        /**
         * @param {string} appId
         * @param {string} senderId
         * @returns {Promise<any>}
         */
        function updateSenderProfile(appId, senderId) {
            return Promise.resolve().then(() => {
                // =========
                // 此 Promise 區塊為取得各平台的 messager 資料
                // =========

                switch (app.type) {
                    case LINE:
                        return bot.getProfile(senderId);
                    case FACEBOOK:
                        return bot.getProfile(senderId);
                }
            }).then((profile) => {
                // =========
                // 此 Promise 區塊為將各平台的 messager 資料更新至資料庫中
                // =========

                if (!profile) {
                    return;
                }

                let messager = {};
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
                    appsMessagersMdl.replaceMessager(appId, senderId, messager, (messagerInDB) => {
                        resolve(messagerInDB);
                    });
                });
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
                return Promise.all(memberUserIds.map((memberUserId) => {
                    // 不需更新發送者的未讀數
                    if (senderId === memberUserId) {
                        return Promise.resolve();
                    }

                    return appsChatroomsMessagersMdl.increaseMessagerUnRead(appId, chatroomId, memberUserId, unReadCount);
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
                    appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageToSocket);
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
                        let messageOpts = {
                            lineEvent: lineEvent
                        };

                        return Promise.resolve().then(() => {
                            if (LINE_WEBHOOK_EVENTS.MESSAGE === lineEventType &&
                                !messageCacheMap.get(lineEvent.message.id) && lineEvent.message) {
                                messageCacheMap.set(lineEvent.message.id, true);
                                let messageText = lineEvent.message.text || '';
                                return messageProcess(messageText, senderId, messageOpts);
                            } else if (LINE_WEBHOOK_EVENTS.FOLLOW === lineEventType) {
                                return followProcess(senderId, messageOpts);
                            }
                            // 非 message 和 follow 類的事件不處理，直接忽略
                        }).then(() => {
                            return nextMessage(i + 1);
                        });
                    })(0);
                case FACEBOOK:
                    let facebookEntries = req.body.entry || [];
                    return Promise.all(facebookEntries.map((facehookEntry) => {
                        let fbMessagesPack = facehookEntry.messaging || [];

                        return (function nextMessage(i) {
                            if (i >= fbMessagesPack.length) {
                                return Promise.resolve();
                            }

                            let messagePack = fbMessagesPack[i];
                            let senderId = messagePack.sender.id;
                            let messageText = messagePack.message.text;
                            let messageOpts = {
                                fbMessage: messagePack.message
                            };

                            return messageProcess(messageText, senderId, messageOpts);
                        })(0);
                    }));
            }
            return Promise.resolve([]);
        }).then(() => {
            let idx = webhookProcQueue.indexOf(webhookPromise);
            idx >= 0 && webhookProcQueue.splice(idx, 1);
            res.sendStatus(200);
        }).catch(() => {
            res.sendStatus(500);
        });

        webhookProcQueue.push(webhookPromise);
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
                return new Promise((resolve) => {
                    appsMdl.findByAppId(appId, (apps) => {
                        let app = apps[appId];
                        resolve(app);
                    });
                });
            }).then((app) => {
                // 3. 利用 SDK 傳給各平台的 server
                return Promise.resolve().then(() => {
                    if (FACEBOOK === appType) {
                        return new Promise((resolve) => {
                            let facebookConfig = {
                                pageID: app.id1,
                                appID: app.id2,
                                appSecret: app.secret,
                                validationToken: app.token1,
                                pageToken: app.token2
                            };
                            let fbBot = facebook.create(facebookConfig);
                            helpersFacebook.sendMessage(fbBot, receiverId, message, () => {
                                resolve();
                            });
                        });
                    } else if (LINE === appType) {
                        let lineClientConfig = {
                            channelAccessToken: app.token1
                        };
                        let lineBot = new line.Client(lineClientConfig);

                        return new Promise((resolve, reject) => {
                            utility.LINEMessageTypeForPushMessage(message, (lineMessage) => {
                                resolve(lineMessage);
                            });
                        }).then((lineMessage) => {
                            return lineBot.pushMessage(receiverId, lineMessage);
                        });
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
                appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
                ('function' === typeof callback) && callback();
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
            let messages = composes;
            let messagers;
            // reject 後 沒有 catch
            if (!appId) {
                return Promise.reject(new Error());
            }

            let appType = '';

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.findByAppId(appId, (apps) => {
                        let app = apps[appId];
                        appType = app.type;

                        let lineConfig = {
                            channelSecret: app.secret,
                            channelAccessToken: app.token1
                        };
                        let lineBot = new line.Client(lineConfig);
                        resolve(lineBot);
                    });
                });
            }).then((lineBot) => {
                return new Promise((resolve, reject) => {
                    // 使用 callback 再 resolve
                    appsMessagersMdl.findAppMessagers(appId, resolve);
                }).then((_messagers) => {
                    messagers = _messagers;
                    // 減少使用 巢狀 promise 結構
                    return lineBot.multicast(Object.keys(messagers[appId].messagers), messages).then(() => {
                        return messagers[appId].messagers;
                    });
                });
            }).then((messagers) => {
                return Promise.all(messages.map((message) => {
                    return new Promise((resolve) => {
                        appsComposes.insert(appId, message, (result) => {
                            // 失敗需要 reject, catch
                            resolve(messagers);
                        });
                    });
                }));
            }).then((messagers) => {
                let messagerIds = Object.keys(messagers);

                // 直接使用 580 與613行的 messagers 變數 做 foreach 或 promise all ，不需要再個別查找，每一次對DB查詢就會多一次網路傳輸
                return Promise.all(messagerIds.map((messagerId) => {
                    return new Promise((resolve) => {
                        appsMessagersMdl.findMessager(appId, messagerId, (messagersInfo) => {
                            let chatroomId = messagersInfo[appId].messagers[messagerId].chatroom_id;
                            resolve(chatroomId);
                        });
                    }).then((chatroomId) => {
                        return Promise.all(messages.map((message) => {
                            /** @type {ChatshierMessageInterface} */
                            // 不需使用 info 命名

                            let messageInfo = {
                                from: SYSTEM,
                                messager_id: '',
                                text: message.text,
                                time: Date.now(),
                                type: 'text'
                            };

                            return new Promise((resolve) => {
                                // () => { resolve() } 的寫法較好
                                appsChatroomsMessagesMdl.insertMessageByAppIdByMessagerId(appId, messagerId, messageInfo, resolve);
                            }).then(() => {
                                /** @type {ChatshierChatSocketInterface} */
                                let messageToSocket = {
                                    appId: appId,
                                    appType: appType,
                                    chatroomId: chatroomId,
                                    messagerId: '',
                                    message: messageInfo
                                };
                                appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageToSocket);
                            });
                        }));
                    });
                }));
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

    return io;
}

module.exports = init;
