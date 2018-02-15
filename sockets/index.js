var cipher = require('../helpers/cipher');
var app = require('../app');
var socketio = require('socket.io');
var linebot = require('linebot'); // line串接
var facebook = require('facebook-bot-messenger'); // facebook串接
var line = require('@line/bot-sdk');
var admin = require('firebase-admin'); // firebase admin SDK
var bodyParser = require('body-parser');

const appsMessagersCtl = require('../controllers/apps_messagers');
const appsSocketCtl = require('./controllers/apps');

var agents = require('../models/agents');
var appsComposes = require('../models/apps_composes');
var appsAutorepliesMdl = require('../models/apps_autoreplies');
var linetemplate = require('../models/linetemplate');
var chats = require('../models/chats');
var appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
var users = require('../models/users');
var utility = require('../helpers/utility');
var helpersFacebook = require('../helpers/facebook');
var helpersBot = require('../helpers/bot');
var webhookMdl = require('../models/webhooks');
var appsMdl = require('../models/apps');
var appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
var appsChatroomsMdl = require('../models/apps_chatrooms');
var appsMessagersMdl = require('../models/apps_messagers');
var appsMessagesMdl = require('../models/apps_messages');
var appsTemplatesMdl = require('../models/apps_templates');
var appsGreetingsMdl = require('../models/apps_greetings');

const SOCKET_EVENTS = require('../config/socket-events');
var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');

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

    var addFriendBroadcastMsg; // 加好友參數
    let bot = []; // LINE bot設定
    var userId;
    var nickname;
    var channelIds = [-1, -1, -1];
    var overview = {};

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
         * @param {LineWebhookEventObject} messageEvent
         */
        function messageProcess(messageText, messagerId, messageEvent) {
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
                // 此 Promise 區塊準備關鍵字回覆、樣板、自動回覆及打招呼資料的區塊
                // =========

                // 找到要回應的關鍵字串
                let keywordrepliesPromise = new Promise((resolve) => {
                    appsKeywordrepliesMdl.findMessages(appId, replyIds.keywordreplyIds, (keywordreplies) => {
                        resolve(keywordreplies || {});
                    });
                });

                let templatesPromise = new Promise((resolve) => {
                    appsTemplatesMdl.findTemplatesByAppIdByTemplateIds(appId, replyIds.templateIds, (templates) => {
                        resolve(templates || {});
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

                let greetingsPromise = new Promise((resolve, reject) => {
                    if (messageEvent && (LINE_WEBHOOK_EVENTS.FOLLOW === messageEvent.type)) {
                        return resolve({});
                    }

                    appsGreetingsMdl.findGreetings(appId, (greetings) => {
                        resolve(greetings || {});
                    });
                });

                return Promise.all([
                    keywordrepliesPromise,
                    templatesPromise,
                    autorepliesPromise,
                    greetingsPromise
                ]);
            }).then((promiseResults) => {
                // =========
                // 此 Promise 區塊處理訊息發送
                // =========

                let keywordreplies = promiseResults[0];
                let keywordMessages = Object.values(keywordreplies);
                let templateMessages = Object.values(promiseResults[1]);
                let autoMessages = Object.values(promiseResults[2]);
                let greetingMessages = Object.values(promiseResults[3]);

                let replyMessages = [];
                replyMessages = keywordMessages ? replyMessages.concat(keywordMessages) : replyMessages;
                replyMessages = autoMessages ? replyMessages.concat(autoMessages) : replyMessages;
                replyMessages = greetingMessages ? replyMessages.concat(greetingMessages) : replyMessages;

                let textOnlyMessages = replyMessages.slice();
                replyMessages = templateMessages ? replyMessages.concat(templateMessages) : replyMessages;
                totalMessages = replyMessages;

                return Promise.resolve().then(() => {
                    // 沒有訊息資料就不對 SDK 發送訊息
                    if (!replyMessages.length) {
                        return;
                    };

                    switch (app.type) {
                        case LINE:
                            return botManager.lineBot.replyMessage(messageEvent.replyToken, replyMessages);
                        case FACEBOOK:
                            return Promise.all(replyMessages.map((message) => {
                                return botManager.fbBot.sendTextMessage(messagerId, message);
                            }));
                    }
                }).then(() => {
                    return {
                        keywordreplies: keywordreplies,
                        keywordreplyIds: Object.keys(keywordreplies)
                    };
                });
            }).then((promiseData) => {
                // =========
                // 此 Promise 區塊處理與訊息匹配的關鍵字回覆的次數更新
                // =========

                let keywordreplies = promiseData.keywordreplies;
                let keywordreplyIds = promiseData.keywordreplyIds;
                if (!keywordreplyIds.length) {
                    return;
                }

                return Promise.all(keywordreplyIds.map((keywordreplyId) => {
                    return new Promise((resolve) => {
                        let putKeywordreply = {
                            replyCount: keywordreplies[keywordreplyId].replyCount++
                        };
                        appsKeywordrepliesMdl.update(appId, keywordreplyId, putKeywordreply, resolve);
                    });
                }));
            }).then(() => {
                // =========
                // 此 Promise 區塊為取得各平台的 messager 資料
                // =========

                switch (app.type) {
                    case LINE:
                        return botManager.lineBot.getProfile(messagerId);
                    case FACEBOOK:
                        return botManager.fbBot.getProfile(messagerId);
                }
            }).then((profile) => {
                // =========
                // 此 Promise 區塊為將各平台的 messager 資料更新至資料庫中
                // =========

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
                    appsMessagersMdl.replaceMessager(appId, messagerId, messager, resolve);
                });
            }).then((messager) => {
                let text = '';
                let type = '';

                switch (app.type) {
                    case LINE:
                        if (LINE_WEBHOOK_EVENTS.FOLLOW !== messageEvent.type.toUpperCase()) {
                            text = messageEvent.message.text;
                            type = messageEvent.message.type;
                        }
                        break;
                    case FACEBOOK:
                        text = req.body.entry[0].messaging[0].message.text;
                        type = 'text';
                        break;
                };

                let receivedMessage = {
                    text: text,
                    type: type,
                    from: app.type,
                    messager_id: messagerId
                };

                return new Promise((resolve) => {
                    switch (app.type) {
                        case LINE:
                            if (LINE_WEBHOOK_EVENTS.FOLLOW === messageEvent.type.toUpperCase()) {
                                resolve({ messager: messager, receivedMessage: '' });
                                break;
                            }
                            helpersBot.lineMessageType(req.lineBot, messageEvent, receivedMessage, (newMessage) => {
                                resolve({ messager: messager, receivedMessage: newMessage });
                            });
                            break;
                        case FACEBOOK:
                            let message = req.body.entry[0].messaging[0].message;
                            helpersBot.facebookMessageType(message, receivedMessage, (newMessage) => {
                                resolve({ messager: messager, receivedMessage: newMessage });
                            });
                            break;
                    }
                    resolve({ messager: messager, receivedMessage: receivedMessage });
                });
            }).then((promiseResult) => {
                let messager = promiseResult.messager;
                let receivedMessage = promiseResult.receivedMessage;
                let chatroomId = messager.chatroom_id;

                let eventType = messageEvent ? messageEvent.type : '';
                if (LINE_WEBHOOK_EVENTS.MESSAGE === eventType.toUpperCase() || FACEBOOK === app.type) {
                    totalMessages.unshift(receivedMessage);
                }

                // 回復訊息與傳入訊息都整合，再寫入 DB
                return Promise.all(totalMessages.map((message) => {
                    // 不是從 LINE FACEBOOK 客戶端傳來的訊息就帶上 SYSTEM
                    if (LINE !== message.from && FACEBOOK !== message.from) {
                        message.from = SYSTEM; // FACEBOOK 客戶來的訊息； SYSTEM 系統發的訊息； LINE 客戶來的訊息
                        delete message.createdTime;
                        delete message.endedTime;
                        delete message.isDeleted;
                        delete message.startedTime;
                        delete message.updatedTime;
                        delete message.title;
                    }

                    return new Promise((resolve, reject) => {
                        // 回復訊息與傳入訊息都整合，再寫入 DB。1.Promise.all 批次寫入 DB
                        appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, message, resolve);
                    }).then((messageInDB) => {
                        /** @type {ChatshierChatSocketInterface} */
                        let messageToSocket = {
                            appId: appId,
                            chatroomId: messager.chatroom_id,
                            messagerId: messagerId,
                            message: messageInDB
                        };

                        // 用 socket.emit 回傳訊息給 client
                        // 指定 appId 為限制只有擁有此 app 的 user 才會收到此 socket 資料
                        appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messageToSocket);
                    });
                }));
            });
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
                        // 非 message 類的事件不處理，直接忽略，回應 200
                        if (LINE_WEBHOOK_EVENTS.MESSAGE !== lineEvent.type.toUpperCase()) {
                            return Promise.resolve();
                        }
                        // 處理 LINE webhook 的檢證
                        let srcUserId = lineEvent.source.userId;
                        let replyToken = lineEvent.replyToken;
                        if ((LINE_WEBHOOK_VERIFY_UID === srcUserId && REPLY_TOKEN_0 === replyToken) ||
                            (LINE_WEBHOOK_VERIFY_UID === srcUserId && REPLY_TOKEN_F === replyToken)) {
                            return Promise.resolve();
                        }

                        let messageText = lineEvent.message.text;
                        return messageProcess(messageText, srcUserId, lineEvent);
                    }));
                case FACEBOOK:
                    let webhookEntries = req.body.entry || [];
                    return Promise.all(webhookEntries.map((webhookEntry) => {
                        let fbMessages = webhookEntry.messaging || [];
                        return Promise.all(fbMessages.map((fbMessage) => {
                            let senderId = fbMessage.sender.id;
                            let messageText = fbMessage.message.text;
                            return messageProcess(messageText, senderId);
                        }));
                    }));
            }
        }).then(() => {
            res.sendStatus(200);
        }).catch(() => {
            res.sendStatus(500);
        });
    });

    chatshierNsp.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        socket.on(SOCKET_EVENTS.APP_REGISTRATION, (appId) => {
            appsSocketCtl.addSocket(appId, socket);
        });

        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            appsSocketCtl.removeSocket(socket);
        });

        socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, (data) => {
            /** @type {ChatshierChatSocketInterface} */
            let socketBody = data;

            // 1. Server 接收到 client 來的聊天訊息
            let appId = socketBody.appId;
            let appType = socketBody.appType;
            let messagerId = socketBody.messagerId;
            let chatroomId = socketBody.chatroomId;
            let message = socketBody.message;

            return Promise.resolve().then(() => {
                // 2. 將資料寫入至資料庫
                let messageToDB = {
                    type: message.type.toLowerCase(),
                    time: message.time || Date.now(),
                    text: message.text,
                    from: CHATSHIER,
                    messager_id: messagerId,
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
                            helpersFacebook.sendMessage(fbBot, messagerId, message, resolve);
                        });
                    }).then(() => {
                        // FACEBOOK server 收到訊息後，不會打 webhook 回來
                        // 因此將 socket 資料原封不動的廣播到 chatshier chatroom
                        if (!appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody)) {
                            return Promise.reject(new Error());
                        }
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
                            // LINE 的 server 在收到 client 的訊息後會打 webhook 回來
                            // 因此不需要使用 socket 把訊息 emit 回去 chatshier chatroom
                            return lineBot.pushMessage(messagerId, lineMessage);
                        });
                    });
                } else if (CHATSHIER === appType) {
                    // 內部聊天室使用 socket 直接發送訊息
                    // 將 socket 資料原封不動的廣播到 chatshier chatroom
                    if (!appsSocketCtl.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody)) {
                        return Promise.reject(new Error());
                    }
                }
            }).catch((err) => {
                console.trace(err);
            });
        });

        socket.on(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, (req) => {
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

                if (!(req.body.custom_tags instanceof Array)) {
                    return messagerData;
                }

                // 將舊的 custom_tags 陣列資料取出合併
                return new Promise((resolve) => {
                    appsMessagersMdl.findMessager(appId, msgerId, (messager) => {
                        if (!messager) {
                            messagerData.custom_tags = req.body.custom_tags;
                            resolve(messagerData);
                            return;
                        }

                        // 預處理 custom_tags 陣列資料，使陣列當中的 tagId 不重複
                        messagerData.custom_tags = messagerData.custom_tags || [];
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
                        })(messagerData.custom_tags.concat(req.body.custom_tags));
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
            });
        });

        // insert compose
        socket.on('insert compose', (data) => {
            let userId = data.userId;
            let composes = data.composes;
            let appId = data.appId;
            var proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (!appId) {
                        reject();
                        return;
                    }
                    appsComposes.insert(appId, composes, (result) => {
                        resolve();
                    });
                });
            });
        });

        // 推播全部人
        socket.on('push composes to all', (data) => {
            let userId = data.userId;
            let appId = data.appId;
            let messages = data.messages;
            if (!appId) {
                return Promise.reject();
            }
            return admin.database().ref('apps/' + appId).once('value').then((snap) => {
                let app = snap.val();
                var lineConfig = {
                    channelSecret: app.secret,
                    channelAccessToken: app.token1
                };
                var lineBot = new line.Client(lineConfig);
                return lineBot.multicast(Object.keys(app.messagers), messages).then(() => {
                    let asyncTasks = [];
                    for (let messagerId in app.messagers) {
                        asyncTasks.push(admin.database().ref('apps/' + appId + '/messagers/' + messagerId).once('value').then((snap) => {
                            let messagersInfo = snap.val();
                            let chatroomId = messagersInfo.chatroom_id;
                            return chatroomId;
                        }).then((chatroomId) => {
                            let updateMessage = [];
                            let messageInfo = {};
                            for (let j in messages) {
                                messageInfo = {
                                    from: SYSTEM,
                                    messager_id: '',
                                    name: 'agent',
                                    text: messages[j].text,
                                    time: Date.now()
                                };
                                updateMessage.push(messageInfo);
                                admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push().then((ref) => {
                                    var messageId = ref.key;
                                    return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages/' + messageId).update(updateMessage[j]);
                                });
                            };
                        }));
                    }
                });
            });
        });

        // 當使用者要看客戶之前的聊天記錄時要向上滾動
        socket.on('upload history msg from front', (data, callback) => {
            let userId = data.userId;
            let channelId = data.channelId;
            let head = data.head;
            let tail = data.tail;
            let sendData = [];
            chats.findChatData(function(chatData) {
                for (let i in chatData) {
                    if (utility.isSameUser(chatData[i].Profile, userId, channelId)) {
                        for (let j = head; j < tail + 1; j++) {
                            sendData.push(chatData[i].Messages[j]);
                        }
                        break;
                    }
                }
                let obj = {
                    userId: userId,
                    channelId: channelId,
                    messages: sendData
                };
                callback(obj);
            });
        });

        // 訊息已讀
        socket.on(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, (data) => {
            let appId = data.appId;
            let appType = data.appType;
            let chatroomId = data.chatroomId;
            let userId = data.userId;

            if (CHATSHIER === appType) {
                return appsChatroomsMessagesMdl.updateUnreadStatus(appId, userId);
            }

            return new Promise((resolve) => {
                appsMessagersMdl.findAppMessagers([appId], resolve);
            }).then((appMessagers) => {
                let messagers = appMessagers[appId].messagers;
                for (let messagerId in messagers) {
                    let messager = messagers[messagerId];
                    if (messager.chatroom_id === chatroomId) {
                        return appsChatroomsMessagesMdl.updateUnreadStatus(appId, messagerId);
                    }
                }
            });
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

    function bot_on_send_message(data) {
        let vendor = data.sendObj;
        let msg = vendor.msgText;
        let receiver = data.appId;
        let agentName = nickname ? nickname : 'agent';
        let nowTime = vendor.msgTime;
        let appId = data.userId;
        // let channel = vendor.id2 === '' ? vendor.id1 : vendor.id2;
        let channel = vendor.id1;

        let proceed = new Promise((resolve, reject) => {
            resolve();
        });

        proceed
            .then(() => {
                return new Promise((resolve, reject) => {
                    let msgObj = {
                        owner: 'agent',
                        name: agentName,
                        time: nowTime,
                        message: 'undefined_message',
                        from: CHATSHIER
                    };
                    resolve(msgObj);
                })
            })
            .then((data) => {
                let msgObj = data;
                return new Promise((resolve, reject) => {
                    if (msg.includes('/image')) {
                        var src = msg.split(' ')[1];
                        msgObj.message = `<img src="${src}" />`;
                        resolve({ msgObj, vendor });
                    } else if (msg.includes('/audio')) {
                        var src = msg.split(' ')[1];
                        msgObj.message = `<audio controls="controls">
                                            <source src="${src}" type="audio/ogg">
                                          </audio>`;
                        resolve({ msgObj, vendor });
                    } else if (msg.includes('/video')) {
                        var src = msg.split(' ')[1];
                        msgObj.message = `<video controls="controls">
                                            <source src="${src}" type="video/mp4">
                                          </video> `;
                        resolve({ msgObj, vendor });
                    } else if (utility.isUrl(msg)) {
                        let urlStr = '<a href=';
                        if (msg.indexOf('https') !== -1 || msg.indexOf('http') !== -1) {
                            urlStr += '"http://';
                        }
                        msgObj.message = urlStr + msg + '/" target="_blank">' + msg + '</a>';
                        resolve({ msgObj, vendor });
                    } else if (msg.includes('/sticker')) {
                        msgObj.message = 'Send sticker to user';
                        resolve({ msgObj, vendor });
                    } else {
                        msgObj.message = msg;
                        resolve({ msgObj, vendor });
                    }
                });
            })
            .then((data) => {
                let msgObj = data.msgObj;
                let vendorObj = data.vendor;
                return new Promise((resolve, reject) => {
                    if (vendorObj.id2 === '') {
                        let lineObj = {
                            channelId: vendorObj.id1,
                            channelSecret: vendorObj.secret,
                            channelAccessToken: vendorObj.token1
                        }
                        let bot = linebot(lineObj);
                        linebotParser = bot.parser();
                        determineLineType(msg, data => {
                            bot.push(receiver, data);
                            resolve(msgObj);
                        });
                    } else {
                        let fbObj = {
                            pageID: vendorObj.id1,
                            appID: vendorObj.id2,
                            appSecret: vendorObj.secret,
                            validationToken: vendorObj.token1,
                            pageToken: vendorObj.token2
                        };
                        let bot = facebook.create(fbObj);
                        if (Object.keys(bot).length > 0) {
                            determineFacebookType(msg, bot, receiver, () => {
                                resolve(msgObj);
                            });
                        }
                    }
                });
            })
            .then((data) => {
                let msgObj = data;
                return new Promise((resolve, reject) => {
                    appsChatroomsMessagesMdl.insertMessage(appId, receiver, msgObj, () => {});
                });
            })
            .catch((ERR) => {});
    } // sent message

    function pushMessage(data, msg, receiver, callback) {
        if (data[1].id2 === '') {
            let lineObj = {
                channelId: data[1].id1,
                channelSecret: data[1].secret,
                channelAccessToken: data[1].token1
            }
            let bot = linebot(lineObj);
            linebotParser = bot.parser();
            determineLineType(msg, data => {
                bot.push(receiver, data);
            });
            callback(data[0]);
        } else {
            let fbObj = {
                pageID: data[1].id1,
                appID: data[1].id2,
                appSecret: data[1].secret,
                validationToken: data[1].token1,
                pageToken: data[1].token2
            }
            let bot = facebook.create(fbObj);
            if (Object.keys(bot).length > 0) {
                determineFacebookType(msg, bot, receiver, () => {
                    callback(data[0]);
                });
            }
        }
    }

    function determineFacebookType(msg, bot, receiver, callback) {
        if (msg.startsWith('/image')) {
            let link = msg.substr(7);
            bot.sendImageMessage(receiver, link, true);
            callback();
        } else if (msg.startsWith('/video')) {
            let link = msg.substr(7);
            bot.sendVideoMessage(receiver, link, true);
            callback();
        } else if (msg.startsWith('/audio')) {
            let link = msg.substr(7);
            bot.sendAudioMessage(receiver, link, true);
            callback();
        } else {
            bot.sendTextMessage(receiver, msg);
            callback();
        }
    }

    function determineLineType(msg, callback) {
        let message = {};
        if (msg.startsWith('/image')) {
            let link = msg.substr(7);
            message = {
                type: "image",
                originalContentUrl: link,
                previewImageUrl: link
            };
        } else if (msg.startsWith('/audio')) {
            let link = msg.substr(7);
            message = {
                type: "audio",
                originalContentUrl: link,
                duration: 240000
            };
        } else if (msg.startsWith('/video')) {
            let link = msg.substr(7);
            message = {
                type: "video",
                originalContentUrl: link,
                previewImageUrl: "https://tinichats.com/assets/images/tab.png"
            };
        } else if (msg.startsWith('/sticker')) {
            message = {
                type: "sticker",
                packageId: parseInt(msg.substr(msg.indexOf(' '))),
                stickerId: parseInt(msg.substr(msg.lastIndexOf(' ')))
            };
        } else if (msg.startsWith('/template')) {
            let obj = msg.substr(msg.indexOf(' ') + 1);
            message = JSON.parse(obj);
        } else {
            message = {
                type: "text",
                text: msg
            };
        }
        callback(message);
    }

    function loadFbProfile(obj, psid) {
        // fb_bot.webhook('/webhook');
        fb_bot.getProfile(psid).then(function(data) {
            utility.fbMsgType(obj.message, (fbMsg) => {
                var fb_user_name = data.first_name + ' ' + data.last_name;
                var fb_user_profilePic = data.profile_pic;
                let msgObj = {
                    message: fbMsg,
                    name: fb_user_name,
                    owner: "user",
                    time: Date.now()
                };
                let prof = {
                    "locale": data.locale,
                    "gender": data.gender
                };
                pushAndEmit(msgObj, fb_user_profilePic, channelIds[2], obj.sender.id, 1);
            });
        }).catch(function(error) {}); //fb_bot
    } //loadFbProfile
    return io;
}

function ISODateTimeString(d) {
    d = new Date(d);

    function pad(n) { return n < 10 ? '0' + n : n }
    return d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes());
}
module.exports = init;