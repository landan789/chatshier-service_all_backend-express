var cipher = require('../helpers/cipher');
var app = require('../app');
var socketio = require('socket.io');
var linebot = require('linebot'); // line串接
var facebook = require('facebook-bot-messenger'); // facebook串接
var line = require('@line/bot-sdk');
var admin = require('firebase-admin'); // firebase admin SDK
var serviceAccount = require('../config/firebase-adminsdk.json'); // firebase admin requires .json auth
var databaseURL = require('../config/firebase_admin_database_url.js');
var bodyParser = require('body-parser');

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

const SOCKET_MESSAGE = require('../config/socket_message');
var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');

const WAIT_TIME = 10000;
const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';
const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';
const FOLLOW = 'FOLLOW';
const MESSAGE = 'MESSAGE';
const REPLY_TOKEN_0 = '00000000000000000000000000000000';
const REPLY_TOKEN_F = 'ffffffffffffffffffffffffffffffff';
const LINE_WEBHOOK_VERIFY_UID = 'Udeadbeefdeadbeefdeadbeefdeadbeef';

var linebotParser;
var globalLineMessageArray = [];
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

function init(server) {
    var io = socketio(server);
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
        var webhookId = req.params.webhookId;
        var proceed = Promise.resolve();
        req.nowTime = new Date().getTime();

        proceed.then(() => {
            return new Promise((resolve, reject) => {
                appsMdl.findAppsByWebhookId(webhookId, (apps) => {
                    if (null === apps || undefined === apps || '' === apps) {
                        reject(API_ERROR.APP_DID_NOT_EXIST);
                        return;
                    }
                    resolve(apps);
                });
            });
        }).then((apps) => {
            var appId = Object.keys(apps)[0];
            req.appId = Object.keys(apps)[0];
            req.app = apps[appId];

            switch (req.app.type) {
                case LINE:
                    var lineConfig = {
                        channelSecret: req.app.secret,
                        channelAccessToken: req.app.token1
                    };
                    req.lineBot = new line.Client(lineConfig); // 重要!!!!!!!!!!!!!!!!!!，利用 req 傳給下一個 中介軟體
                    line.middleware(lineConfig)(req, res, next); // 中介軟體執行中介軟體的方法
                    break;
                case FACEBOOK:
                    // FACEBOOK 不需要middleware
                    var facebookConfig = {
                        pageID: req.app.id1,
                        appID: req.app.id2 === undefined ? '' : req.app.id2,
                        appSecret: req.app.secret,
                        validationToken: req.app.token1,
                        pageToken: req.app.token2 === undefined ? '' : req.app.token2
                    };
                    req.facebookConfig = facebookConfig;
                    bodyParser.json()(req, res, () => {
                        req.fbBot = facebook.create(req.facebookConfig, server); // fbBot因為無法取得bofy無法在上一層處理所以拉到這層

                        next();
                    });
                    break;
            }
        }).catch(() => {
            res.sendStatus(404);
        });
    }, (req, res, next) => {
        var appId = req.appId;
        var message;
        var event = undefined === req.body.events ? '' : req.body.events[0]; // LINE的event
        switch (req.app.type) {
            case LINE:
                if (FOLLOW === event.type.toUpperCase()) {
                    next();
                    return;
                }
                if (2 === req.body.events.length) {
                    let userId0 = req.body.events[0].source.userId;
                    let token0 = req.body.events[0].replyToken;
                    let userId1 = req.body.events[1].source.userId;
                    let token1 = req.body.events[1].replyToken;
                    if (LINE_WEBHOOK_VERIFY_UID === userId0 && REPLY_TOKEN_0 === token0 && LINE_WEBHOOK_VERIFY_UID === userId1 && REPLY_TOKEN_F === token1) {
                        res.sendStatus(200);
                        next('route');
                        return;
                    }
                }
                message = req.body.events[0].message.text;
                break;
            case FACEBOOK:
                message = req.body.entry[0].messaging[0].message.text;
                break;
        }
        var proceed = Promise.resolve();
        proceed.then(() => {
            req.messageId = cipher.createHashKey(message);
            var messageId = req.messageId;
            return new Promise((resolve, reject) => {
                // 2. 到 models/apps_messages.js，找到 keywordreply_ids
                appsMessagesMdl.findMessage(appId, messageId, (message) => {
                    if (null === message || undefined === message || '' === message) {
                        resolve(null);
                        return;
                    }
                    resolve(message);
                });
            });
        }).then((message) => {
            req.keywordreplyIds = null === message || undefined === message.keywordreply_ids ? [] : message.keywordreply_ids;
            req.templateIds = null === message || undefined === message.template_ids ? [] : message.keywordreply_ids;
            // 1. 取得 訊息 ID，利用 vat massageId = cryptr.encrypt('你好，傳入的訊息'),
            next();
        }).catch(() => {
            res.sendStatus(404);
        });
    }, (req, res, next) => {
        var lineBot = req.lineBot;
        var fbBot = req.fbBot;
        var app = req.app;
        var keywordreplyIds = req.keywordreplyIds;
        var templateIds = req.templateIds;
        var event = undefined === req.body.events ? '' : req.body.events[0]; // LINE的event

        var appId = req.appId;

        switch (req.app.type) {
            case LINE:
                req.messagerId = req.body.events[0].source.userId;
                break;
            case FACEBOOK:
                req.messagerId = req.body.entry[0].messaging[0].sender.id;
                break;
        }
        // 3. 到 models/apps_keywordreplies.js 找到要回應的關鍵字串
        var p1 = new Promise((resolve, reject) => {
            if (LINE === req.app.type && FOLLOW === event.type.toUpperCase()) {
                resolve({});
                return;
            }
            appsKeywordrepliesMdl.findMessages(appId, keywordreplyIds, (keywordreplies) => {
                if (null === keywordreplies || undefined === keywordreplies || '' === keywordreplies || (keywordreplies instanceof Array && 0 === keywordreplies.length)) {
                    resolve({});
                    return;
                }

                resolve(keywordreplies);
            });
        });

        var p2 = new Promise((resolve, reject) => {
            if (LINE === req.app.type && FOLLOW === event.type.toUpperCase()) {
                resolve({});
                return;
            }
            appsTemplatesMdl.findTemplatesByAppIdByTemplateIds(appId, templateIds, (templates) => {
                if (null === templates || undefined === templates || '' === templates || (templates instanceof Array && 0 === templates.length)) {
                    resolve({});
                    return;
                }
                resolve(templates);
            });
        });

        var p3 = new Promise((resolve, reject) => {
            if (LINE === req.app.type && FOLLOW === event.type.toUpperCase()) {
                resolve({});
                return;
            }
            appsAutorepliesMdl.findAutorepliesByAppId(appId, (autoreplies) => {
                if (null === autoreplies || undefined === autoreplies || '' === autoreplies) {
                    resolve({});
                    return;
                }
                for (let key in autoreplies) {
                    let endedTime = autoreplies[key].endedTime;
                    let startedTime = autoreplies[key].startedTime;
                    if (startedTime <= req.nowTime && req.nowTime < endedTime) {
                        continue;
                    }
                    delete autoreplies[key];
                }
                resolve(autoreplies);
            });
        });

        var p4 = new Promise((resolve, reject) => {
            if (LINE === req.app.type && MESSAGE === event.type.toUpperCase()) {
                resolve({});
                return;
            }
            appsGreetingsMdl.findGreetings(appId, (greetings) => {
                if (null === greetings || undefined === greetings || '' === greetings || (greetings instanceof Array && 0 === greetings.length)) {
                    resolve({});
                    return;
                }
                resolve(greetings);
            });
        });

        Promise.all([p1, p2, p3, p4]).then((result) => {
            var keywordMessages = Object.values(result[0]);
            var templateMessages = Object.values(result[1]);
            var autoMessages = Object.values(result[2]);
            var greetingMessages = Object.values(result[3]);
            var messages = [];

            if (null !== keywordMessages) {
                messages = messages.concat(keywordMessages);
            };
            if (null !== templateMessages) {
                messages = messages.concat(templateMessages);
            };
            if (null !== autoMessages) {
                messages = messages.concat(autoMessages);
            };

            if (null !== greetingMessages) {
                messages = messages.concat(greetingMessages);
            };
            var textOnlyMessages = [].concat(keywordMessages, autoMessages, greetingMessages);

            req.messages = messages;
            // 沒有訊息資料就不對發送 LINE SDK 發送訊息
            if (req.messages instanceof Array && 0 === req.messages.length) {
                return Promise.resolve();
            };
            switch (req.app.type) {
                case LINE:
                    return lineBot.replyMessage(event.replyToken, messages);
                case FACEBOOK:
                    return Promise.all(messages.map((message) => {
                        return fbBot.sendTextMessage(req.messagerId, message);
                    }));
            }
        }).then(() => {
            var Uid = req.messagerId;
            switch (req.app.type) {
                case LINE:
                    return lineBot.getProfile(Uid);
                case FACEBOOK:
                    return fbBot.getProfile(Uid);
            }
        }).then((profile) => {
            var msgerId = req.messagerId;
            var messager = {
                name: '',
                photo: '',
                unRead: 1
            };

            switch (req.app.type) {
                case LINE:
                    messager.name = profile.displayName;
                    messager.photo = profile.pictureUrl;
                    break;
                case FACEBOOK:
                    messager.name = profile.first_name + ' ' + profile.last_name;
                    messager.photo = profile.profile_pic;
                    break;
            };

            return new Promise((resolve, reject) => {
                appsMessagersMdl.updateMessager(appId, msgerId, messager, (messager) => {
                    if (!messager) {
                        reject(new Error());
                        return;
                    }
                    resolve(messager);
                });
            });
        }).then((messager) => {
            var text, type;
            return new Promise((resolve, reject) => {
                switch (req.app.type) {
                    case LINE:
                        var event = undefined === req.body.events ? '' : req.body.events[0]; // LINE的event
                        text = FOLLOW === event.type.toUpperCase() ? '' : req.body.events[0].message.text;
                        type = FOLLOW === event.type.toUpperCase() ? '' : req.body.events[0].message.type;
                        break;
                    case FACEBOOK:
                        text = req.body.entry[0].messaging[0].message.text;
                        type = 'text';
                        break;
                };
                var inMessage = {
                    text: text,
                    type: type,
                    from: (req.app.type).toUpperCase(),
                    messager_id: req.messagerId
                };
                resolve({messager, inMessage});
            });
        }).then((data) => {
            let messager = data.messager;
            let inMessage = data.inMessage;
            return new Promise((resolve, reject) => {
                switch (req.app.type) {
                    case LINE:
                        let messageEvent = req.body.events[0];
                        if (FOLLOW === messageEvent.type.toUpperCase()) {
                            resolve({messager: messager, inMessage: ''});
                            break;
                        }
                        helpersBot.lineMessageType(req.lineBot, messageEvent, inMessage, (newMessage) => {
                            resolve({messager: messager, inMessage: newMessage});
                        });
                        break;
                    case FACEBOOK:
                        let message = req.body.entry[0].messaging[0].message;
                        helpersBot.facebookMessageType(message, inMessage, (newMessage) => {
                            resolve({messager: messager, inMessage: newMessage});
                        });
                        break;
                }
            });
        }).then((data) => {
            let messager = data.messager;
            let inMessage = data.inMessage;
            var chatroomId = messager.chatroom_id;
            var eventType = undefined === req.body.events ? '' : req.body.events[0].type; // LINE的event
            if (MESSAGE === eventType.toUpperCase() || FACEBOOK === req.app.type) {
                req.messages.unshift(inMessage);
            }
            // 回復訊息與傳入訊息都整合，再寫入 DB
            return Promise.all(req.messages.map((message) => {
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
                    appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, message, (message) => {
                        if (null === message || undefined === message || '' === message) {
                            resolve(null);
                            return;
                        }
                        resolve();
                    });
                });
            })).then(() => {
                // 回復訊息與傳入訊息都整合，再寫入 DB。2.Promise.all 批次寫入 DB 後 把 messager 傳給下個 block
                return Promise.resolve(messager);
            });
        }).then((messager) => {
            let appId = req.appId;
            let chatroomId = messager.chatroom_id;
            return new Promise((resolve, reject) => {
                appsChatroomsMessagesMdl.findAppsChatroomsMessages(appId, chatroomId, (AppsChatroomsMessages) => {
                    if (null === AppsChatroomsMessages || undefined === AppsChatroomsMessages || '' === AppsChatroomsMessages) {
                        reject(API_ERROR.APP_MESSAGER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(AppsChatroomsMessages);
                });
            });
        }).then((AppsChatroomsMessages) => {
            let appName = req.app.name;
            // 6. 用 socket.emit 回傳訊息給 clinet
            io.sockets.emit(SOCKET_MESSAGE.SEND_MESSAGE_SERVER_EMIT_CLIENT_ON, {AppsChatroomsMessages, appName});
            res.sendStatus(200);
        }).catch((ERR) => {
            res.status(403);
        });
    });

    io.on('connection', function(socket) {
        socket.on('request chat init data', (frontData, callback) => {
            nickname = socket.nickname;
            userId = frontData.id;

            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                let waitTimer = setTimeout(reject, WAIT_TIME, 'internal network too slow');
                requestInternalChatData(userId, (internalChatData) => {
                    clearTimeout(waitTimer);
                    resolve(internalChatData);
                });
            }).then((promiseResult) => {
                let socketRespData = {
                    internalChatData: promiseResult
                };
                callback(socketRespData);
            }).catch((reason) => {
                callback(reason);
            });
        });

        function requestInternalChatData(userId, callback) {
            let thisAgentData = [];
            agents.get(function(agentChatData) {
                for (let i in agentChatData) {
                    if (agentChatData[i].Profile.agent.indexOf(userId) != -1) {
                        thisAgentData.push(agentChatData[i]);
                    }
                }
                users.get(agentData => {
                    let agentIdToName = { "0": "System" };
                    for (let prop in agentData) {
                        agentIdToName[prop] = agentData[prop].name;
                    }
                    let internalTagsData = [
                        { "name": "roomName", "type": "text", "set": "single", "modify": true },
                        { "name": "description", "type": "text", "set": "multi", "modify": true },
                        { "name": "owner", "type": "single-select", "set": [], "modify": true },
                        { "name": "agent", "type": "multi-select", "set": [], "modify": true },
                        { "name": "recentChat", "type": "time", "set": "", "modify": false },
                        { "name": "firstChat", "type": "time", "set": "", "modify": false }
                    ]
                    callback({
                        data: thisAgentData,
                        agentIdToName: agentIdToName,
                        internalTagsData: internalTagsData
                    });
                });
            });
        } // end of requestInternalChatData

        function requestChannels(userId, callback) {
            let appsArr = [];
            chatapps.getApps(chatInfo => {
                for (let i in chatInfo) {
                    if (chatInfo[i].user_id === userId) {
                        appsArr.push(chatInfo);
                        callback(appsArr);
                    }
                }
            });
        }

        // 從SHIELD chat傳送訊息
        socket.on(SOCKET_MESSAGE.SEND_MESSAGE_CLIENT_EMIT_SERVER_ON, data => {
            let vendor = data.data;
            let msg = vendor.msg;
            let src = vendor.src;
            let textType = vendor.textType;
            let receiverId = data.userId; // 客戶或是專員的ID
            let agentName = socket.nickname ? socket.nickname : 'agent';
            let msgTime = vendor.msgTime;
            let appId = data.appId;
            let token = vendor.token1;
            let facebookConfig = {
                pageID: vendor.id1,
                appID: vendor.id2,
                appSecret: vendor.secret,
                validationToken: vendor.token1,
                pageToken: vendor.token2
            }
            var bot = LINE === vendor.type ? new line.Client({ channelAccessToken: token }) : facebook.create(facebookConfig);
            // 1. Server 接收到 client 來的聊天訊息
            var proceed = Promise.resolve();
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    // 2. 利用 line SDK 傳給 line service
                    if (FACEBOOK === vendor.type) {
                        resolve();
                        return;
                    }
                    utility.LINEMessageTypeForPushMessage(vendor, (message) => {
                        bot.pushMessage(receiverId, message);
                        resolve();
                    });
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    // FACEBOOK SDK
                    if (LINE === vendor.type) {
                        resolve();
                        return;
                    }
                    helpersFacebook.sendMessage(bot, receiverId, vendor, () => {
                        resolve();
                    });
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMessagersMdl.findChatroomIdByAppIdByMessagerId(appId, receiverId, (chatroomId) => {
                        if (null === chatroomId || undefined === chatroomId || '' === chatroomId) {
                            resolve(null);
                            return;
                        }
                        resolve(chatroomId);
                    });
                });
            }).then((chatroomId) => {
                return new Promise((resolve, reject) => {
                    appsChatroomsMdl.insert(appId, chatroomId, (newChatroomId) => {
                        if (null === newChatroomId || undefined === newChatroomId || '' === newChatroomId) {
                            resolve(null);
                            return;
                        }
                        resolve(newChatroomId);
                    });
                });
            }).then((chatroomId) => {
                return new Promise((resolve, reject) => {
                    let message = {
                        owner: 'agent',
                        type: textType,
                        time: undefined === msgTime ? msgTime : Date.now(),
                        text: msg,
                        from: CHATSHIER,
                        messager_id: receiverId,
                        src: '' === msg ? src : ''
                    };
                    appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, message, (newChatroomId) => {
                        if (null === newChatroomId || undefined === newChatroomId || '' === newChatroomId) {
                            resolve(null);
                            return;
                        }
                        resolve(newChatroomId);
                    });
                });
            }).catch(() => {});
        }); // sent message

        //insert compose
        socket.on('find apps', (userId) => {
            var proceed = new Promise((resolve, reject) => {
                resolve();
            })
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (!userId) {
                        reject();
                        return;
                    }

                    users.findAppIdsByUserId(userId, (appids) => {
                        socket.emit('apps APPID', appids);
                        resolve();
                    });
                });
            });
        });
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
        socket.on('insert Reservation', (data) => {
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
        socket.on('find all info', (userId) => {
            var proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (!userId) {
                        reject();
                        return;
                    }

                    users.findAppIdsByUserId(userId, (appids) => {
                        resolve(appids);
                    });
                });
            }).then((appId) => {
                return new Promise((resolve, reject) => {
                    for (let i in appId) {
                        appsComposes.findComposes(appId[i], (info) => {
                            socket.emit('composes info', info);
                        });
                    }
                });
                resolve();
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
        socket.on('read message', data => {
            let appId = data.appId;
            let userId = data.msgId;
            appsChatroomsMessagesMdl.updateUnreadStatus(appId, userId);
        });
        /*===聊天室end===*/

        /*===內部聊天室start===*/
        // 傳遞對照表，轉換agent的Id及Name
        socket.on('get agentIdToName list', function() {
            users.get(agentData => {
                let agentIdToName = { "0": "System" };
                for (let prop in agentData) {
                    agentIdToName[prop] = agentData[prop].name;
                }
                socket.emit('send agentIdToName list', agentIdToName);
            });
        });
        // 新增內部聊天室
        socket.on('create internal room', (Profile) => {
            let time = Date.now();
            Profile.firstChat = time;
            Profile.recentChat = time;
        });

        // 內部聊天室傳訊息
        socket.on('send internal message', (data) => {
            let roomId = data.roomId;
            emitIO_and_pushDB_internal(data.sendObj, roomId, socket.nickname);
        });
        // 更新內部聊天室右邊的資料
        socket.on('update internal profile', data => {
            agents.get(function(agentChatData) {
                for (let i in agentChatData) {
                    if (agentChatData[i].Profile.roomId == data.roomId) {
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
        /*===內部聊天室end===*/

        /*===訊息start===*/
        socket.on('post userId', (data) => {
            let userId = data;
            let proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    users.findAppIdsByUserId(userId, (appId) => {
                        resolve(appId);
                    });
                });
            }).then((appId) => {
                return new Promise((resolve, reject) => {
                    appsMdl.findAppsByAppIds(appId, (appInfos) => {
                        resolve(appInfos);
                    });
                });
            }).then((appInfos) => {
                socket.emit('get appInfos', (appInfos));
            }).catch((error) => {
                console.log(error);
            });
        });
        socket.on('load add friend', (data) => {
            let appId = data;
            let proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.findAll(appId, (data) => {
                        resolve(data);
                    });
                });
            }).then((data) => {
                socket.emit('get greetings', (data));
            }).catch((error) => {
                console.log(error);
            });
        });
        socket.on('post greeting', (data) => {
            let userId = data.userId;
            let appId = data.appId;
            let greetingObj = data.greetingObj;
            let proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.insert(appId, greetingObj, (result) => {
                        if (false === result) {
                            reject();
                            return;
                        }
                        resolve(result);
                    });
                });
            }).then((result) => {
                let greetingId = result;
                socket.emit('callback greetingId', greetingId);
            }).catch((error) => {
                console.log(error);
            });
        });
        socket.on('delete greeting', (data) => {
            let appId = data.appId;
            let greetingId = data.greetingId;
            let proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.remove(appId, greetingId, (result) => {
                        if (false === result) {
                            reject();
                            return;
                        }
                        resolve();
                    });
                });
            }).then(() => {
                socket.emit('delete result', (true));
            }).catch((error) => {
                socket.emit('delete result', (false));
                console.log(error);
            });
        });

        socket.on('update tags', tagsData => {
            let customData = {};
            let order = [];
            for (let i = 0; i < tagsData.length; i++) {
                let ele = tagsData[i];
                order.push(ele.id);
                if (ele.source == "custom") {
                    customData[ele.id] = ele.data;
                }
            }
            tags.updateCustom(customData);
            tags.updateOrder(order);
        });
        /*===設定end===*/

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
        /*===ticket start===*/
        socket.on('get agents profile', (callback) => {
            users.get(data => {
                callback(data);
            });
        });
        /*===ticket end===*/
        /*===template start===*/
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
        /*===template end===*/
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

    function emitIO_and_pushDB_internal(obj, roomId, agentNick) {
        send_to_firebase_internal(obj, roomId);
        send_to_frontSocket_internal(obj, roomId, agentNick);
    }

    function send_to_firebase_internal(obj, roomId) {
        agents.get(function(agentChatData) {
            for (let prop in agentChatData) {
                let data = agentChatData[prop];
                if (data.Profile.roomId == roomId) {
                    let length = data.Messages.length; //訊息總長度
                    let updateObj = {}; //建立update物件
                    updateObj['/' + prop + '/Messages/' + length] = obj; //將最新一則的訊息放至訊息陣列的最後
                    agents.update(updateObj);
                    let updateProfObj = {
                        "recentChat": obj.time
                    };
                    agents.updateProf(prop, updateProfObj);
                    break;
                }
            }
        });
    }

    function send_to_frontSocket_internal(obj, roomId, agentNick) {
        let data = JSON.parse(JSON.stringify(obj));
        data.roomId = roomId;
        data.agentNick = agentNick;
        io.sockets.emit('new internal message', {
            sendObj: data,
            roomId: roomId
        });
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