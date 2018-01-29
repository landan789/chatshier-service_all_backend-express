var SECRET = require('../config/secret');
var Cryptr = require('cryptr');
var cryptr = new Cryptr(SECRET.MESSENGE_KEY, 'des');
var app = require('../app');
var socketio = require('socket.io');
var linebot = require('linebot'); // line串接
var MessengerPlatform = require('facebook-bot-messenger'); // facebook串接
var line = require('@line/bot-sdk');
var admin = require('firebase-admin'); // firebase admin SDK
var serviceAccount = require('../config/firebase-adminsdk.json'); // firebase admin requires .json auth
var databaseURL = require('../config/firebase_admin_database_url.js');

var agents = require('../models/agents');
var appsComposes = require('../models/apps_composes');
var appsAutorepliesMdl = require('../models/apps_autoreplies');
var linetemplate = require('../models/linetemplate');
var chats = require('../models/chats');
var appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
var tags = require('../models/tags');
var users = require('../models/users');
var utility = require('../helpers/utility');
var webhookMdl = require('../models/webhooks');
var appsMdl = require('../models/apps');
var appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
var appsChatroomsMdl = require('../models/apps_chatrooms');
var appsMessagersMdl = require('../models/apps_messagers');
var appsMessagesMdl = require('../models/apps_messages');
var appsTemplatesMdl = require('../models/apps_templates');

const SOCKET_MESSAGE = require('../config/socket_message');
var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');

const WAIT_TIME = 10000;
const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';
const SYSTEM = 'SYSTEM';
const REPLY_TOKEN_0 = '00000000000000000000000000000000';
const REPLY_TOKEN_F = 'ffffffffffffffffffffffffffffffff';

var linebotParser;
var globalLineMessageArray = [];
var composebot = {};
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

function init(server) {
    var io = socketio(server);
    var addFriendBroadcastMsg; // 加好友參數
    let bot = []; // LINE bot設定
    var userId;
    let appData = [];
    var nickname;
    var channelIds = [-1, -1, -1];
    var overview = {};

    app.get('/loading', (req, res) => {
        res.send(303);
    });

    app.post('/webhook/:webhookId', (req, res, next) => {
        var webhookId = req.params.webhookId;
        var proceed = Promise.resolve();

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
                    var psid = undefined === req.body.entry ? '' : req.body.entry[0].messaging[0].sender.id;
                    var facebookConfig = {
                        pageID: req.app.id1,
                        appID: req.app.id2 === undefined ? '' : req.app.id2,
                        appSecret: req.app.secret,
                        validationToken: req.app.token1,
                        pageToken: req.app.token2 === undefined ? '' : req.app.token2
                    };
                    req.fbBot = undefined === req.body.entry ? {} : MessengerPlatform.create(facebookConfig, server);
                    next();
                    break;
            }
        }).catch(() => {

        });
    }, (req, res, next) => {
        var appId = req.appId;
        var message = req.body.events[0].message.text;
        var proceed = Promise.resolve();
        proceed.then(() => {
            req.messageId = cryptr.encrypt(message);
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
        var event = req.body.events[0];

        var appId = req.appId;
        var messagerId = req.body.events[0].source.userId;

        // 3. 到 models/apps_keywordreplies.js 找到要回應的關鍵字串
        var p1 = new Promise((resolve, reject) => {
            appsKeywordrepliesMdl.findKeywordrepliesByAppIdByKeywordIds(appId, keywordreplyIds, (keywordreplies) => {
                if (null === keywordreplies || undefined === keywordreplies || '' === keywordreplies || (keywordreplies instanceof Array && 0 === keywordreplies.length)) {
                    resolve({});
                    return;
                }

                resolve(keywordreplies);
            });
        });

        var p2 = new Promise((resolve, reject) => {
            appsTemplatesMdl.findTemplatesByAppIdByTemplateIds(appId, templateIds, (templates) => {
                if (null === templates || undefined === templates || '' === templates || (templates instanceof Array && 0 === templates.length)) {
                    resolve({});
                    return;
                }
                resolve(templates);
            });
        });

        var p3 = new Promise((resolve, reject) => {
            appsAutorepliesMdl.findAutorepliesByAppId(appId, (autoreplies) => {
                if (null === autoreplies || undefined === autoreplies || '' === autoreplies) {
                    resolve({});
                    return;
                }
                resolve(autoreplies);
            });
        });

        Promise.all([p1, p2, p3]).then((result) => {
            var keywordMessages = Object.values(result[0]);
            var templateMessages = Object.values(result[1]);
            var autoMessages = Object.values(result[2]);
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

            var textOnlyMessages = [].concat(keywordMessages, autoMessages);

            req.messages = messages;
            switch (app.type) {
                case LINE:
                    return lineBot.replyMessage(event.replyToken, messages);
                    break;
                case FACEBOOK:
                    utility.sendFacebookMessage(fbBot, psid, textOnlyMessages, () => {
                        return Promise.resolve();
                    });
                    break;
            }
        }).then(() => {
            var Uid = req.body.events[0].source.userId;
            return lineBot.getProfile(Uid);
        }).then((profile) => {
            var Uid = req.body.events[0].source.userId;

            var messager = {
                name: profile.displayName,
                photo: profile.pictureUrl
            };
            return new Promise((resolve, reject) => {
                appsMessagersMdl.replaceMessager(appId, Uid, messager, (messager) => {
                    var a = 0;
                    if (undefined === messager || '' === messager || null === messager) {
                        reject();
                        return;
                    }
                    resolve(messager);
                });
            });
        }).then((messager) => {
            var chatroomId = messager.chatroom_id;
            var inMessage = {
                text: req.body.events[0].message.text,
                type: req.body.events[0].message.type,
                from: (req.app.type).toUpperCase(),
                messager_id: req.body.events[0].source.userId
            };

            // 回復訊息與傳入訊息都整合，再寫入 DB
            req.messages.push(inMessage);
            return Promise.all(req.messages.map((message) => {
                return new Promise((resolve, reject) => {
                    // 回復訊息與傳入訊息都整合，再寫入 DB。1.Promise.all 批次寫入 DB
                    appsChatroomsMessagesMdl.insertMessage(appId, chatroomId, message, (message) => {
                        if (null === message || undefined === message || '' === message) {
                            resolve(null);
                            return;
                        }
                        resolve(message);
                    });
                });
            })).then(() => {
                // 回復訊息與傳入訊息都整合，再寫入 DB。2.Promise.all 批次寫入 DB 後 把 messager 傳給下個 block
                return Promise.resolve(messager);
            });
        }).then((messager) => {
            let appId = req.appId;
            let messagerId = req.body.events[0].source.userId;
            let channelId = req.app.channelId;
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
            // 6. 用 socket.emit 回傳訊息給 clinet

            io.sockets.emit(SOCKET_MESSAGE.SEND_MESSAGE_SERVER_EMIT_CLIENT_ON, AppsChatroomsMessages);
            res.sendStatus(200);
        }).catch((ERR) => {
            res.status(403);
        });
    });

    io.on('connection', function(socket) {
        socket.on('request chat init data', (frontData, callback) => {
            nickname = socket.nickname;
            userId = frontData.id;
            var proceed = new Promise((resolve, reject) => {
                resolve();
            });

            proceed
                .then(() => {
                    return new Promise((resolve, reject) => {
                        if ('' === userId || null === userId) {
                            reject(API_ERROR.USERID_WAS_EMPTY);
                            return;
                        }
                        users.findAppIdsByUserId(userId, (appIds) => {
                            if (null === appIds || undefined === appIds) {
                                reject(API_ERROR.APPID_WAS_EMPTY);
                            } else {
                                resolve(appIds);
                            }
                        })
                    });
                })
                .then((appIds) => {
                    return new Promise((resolve, reject) => {
                        appsMdl.findAppsByAppIds(appIds, (data) => {
                            if (null === data || undefined === data || '' === data) {
                                reject();
                                return;
                            }
                            resolve(data);
                            appData = [];
                            for (let i in appIds) {
                                appData[i] = {
                                    id: data[appIds[i]].id1,
                                    token: data[appIds[i]].token1,
                                    secret: data[appIds[i]].secret,
                                    type: data[appIds[i]].type
                                };
                            }

                        })
                    })
                })
            let allObj = {};
            let loadTags = new Promise((resolve, reject) => {
                requestTags((data) => {
                    allObj.tagsData = data;
                    resolve();
                });
                setTimeout(reject, WAIT_TIME, "tag network too slow");
            });

            loadTags
                .then(() => {
                    return new Promise((resolve, reject) => {
                        requestInternalChatData(userId, (data) => {
                            allObj.internalChatData = data;
                            resolve();
                        });
                        setTimeout(reject, WAIT_TIME, "internal network too slow");
                    });
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        users.findUserByUserId(userId, data => {
                            resolve(data);
                        });
                        setTimeout(reject, WAIT_TIME, "get user network too slow");
                    });
                })
                .then((data) => {
                    var appIds = data.app_ids;
                    return new Promise((resolve, reject) => {
                        appsMdl.findAppsByAppIds(appIds, (data) => {
                            var apps = data;
                            if (null === apps || '' === apps || undefined === apps) {
                                reject(API_ERROR.APPID_WAS_EMPTY);
                            }
                            resolve(apps);
                        });
                        setTimeout(reject, WAIT_TIME, "find app network too slow");
                    });
                })
                .then(data => {
                    return new Promise((resolve, reject) => {
                        allObj.appsData = data;
                        resolve();
                    });
                })
                .then(() => {
                    callback(allObj);
                })
                .catch(reason => {
                    callback(reason);
                });
        });

        socket.on('request tags', (callback) => {
            tags.get(function(tagsData) {
                callback(tagsData);
            });
        });

        function requestTags(callback) {
            tags.get(function(tagsData) {
                callback(tagsData);
            });
        } // end of requestTags

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
        // 4.撈出歷史訊息
        socket.on('find_apps_messengers_chats', (userId, callback) => {
            var proceed = new Promise((resolve, reject) => {
                resolve();
            });

            proceed.then(data => {
                return new Promise((resolve, reject) => {
                    appsChatroomsMessagesMdl.findByUserId(userId, (result) => {
                        if (false === result || null === result || '' === result || undefined === result) {
                            reject();
                            return;
                        }
                        resolve(result);
                    });
                });
            }).then((data) => {
                let appsMessengers = data;
                callback(appsMessengers);
            }).catch(() => {
                callback(null);
            });
        });
        // 從SHIELD chat傳送訊息
        socket.on(SOCKET_MESSAGE.SEND_MESSAGE_CLIENT_EMIT_SERVER_ON, data => {
            let vendor = data.data;
            let msg = vendor.msg;
            let receiverId = data.userId; // 客戶或是專員的ID
            let agentName = socket.nickname ? socket.nickname : 'agent';
            let msgTime = vendor.msgTime;
            let appId = data.appId;
            // let channel = vendor.id2 === '' ? vendor.id1 : vendor.id2;
            let token = vendor.token1;
            var lineBot = LINE === vendor.type ? new line.Client({ channelAccessToken: token }) : {};

            // 1. Server 接收到 client 來的聊天訊息
            var proceed = Promise.resolve();
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    // 2. 利用 line SDK 傳給 line service
                    if (FACEBOOK === vendor.type) {
                        resolve();
                    }
                    utility.LINEMessageTypeForPushMessage(vendor, (message) => {
                        lineBot.pushMessage(receiverId, message);
                        resolve();
                    });
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    // FACEBOOK SDK
                    resolve();
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
                        name: agentName,
                        time: msgTime,
                        text: msg,
                        from: vendor.type
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

            // let proceed = new Promise((resolve, reject) => {
            //     resolve();
            // });

            // proceed.then(() => {
            //     return new Promise((resolve, reject) => {
            //         let msgObj = {
            //             owner: "agent",
            //             name: agentName,
            //             time: nowTime,
            //             message: "undefined_message",
            //             from: 'chatshier'
            //         };
            //         resolve(msgObj);
            //     })
            // }).then((data) => {
            //     let msgObj = data;
            //     return new Promise((resolve, reject) => {
            //         if (msg.includes('/image')) {
            //             var src = msg.split(' ')[1];
            //             msgObj.message = `<img src="${src}" />`;
            //             resolve({ msgObj, vendor });
            //         } else if (msg.includes('/audio')) {
            //             var src = msg.split(' ')[1];
            //             msgObj.message = `<audio controls="controls">
            //                                     <source src="${src}" type="audio/ogg">
            //                                   </audio>`;
            //             resolve({ msgObj, vendor });
            //         } else if (msg.includes('/video')) {
            //             var src = msg.split(' ')[1];
            //             msgObj.message = `<video controls="controls">
            //                                     <source src="${src}" type="video/mp4">
            //                                   </video> `;
            //             resolve({ msgObj, vendor });
            //         } else if (utility.isUrl(msg)) {
            //             let urlStr = '<a href=';
            //             if (msg.indexOf('https') !== -1 || msg.indexOf('http') !== -1) {
            //                 urlStr += '"http://';
            //             }
            //             msgObj.message = urlStr + msg + '/" target="_blank">' + msg + '</a>';
            //             resolve({ msgObj, vendor });
            //         } else if (msg.includes('/sticker')) {
            //             msgObj.message = 'Send sticker to user';
            //             resolve({ msgObj, vendor });
            //         } else {
            //             msgObj.message = msg;
            //             resolve({ msgObj, vendor });
            //         }
            //     });
            // }).then((data) => {
            //     let msgObj = data.msgObj;
            //     let vendorObj = data.vendor;
            //     return new Promise((resolve, reject) => {
            //         if (vendorObj.id2 === '') {
            //             let lineObj = {
            //                 channelId: vendorObj.id1,
            //                 channelSecret: vendorObj.secret,
            //                 channelAccessToken: vendorObj.token1
            //             }
            //             let bot = linebot(lineObj);
            //             linebotParser = bot.parser();
            //             determineLineType(msg, data => {
            //                 bot.push(receiver, data);
            //                 resolve(msgObj);
            //             });
            //         } else {
            //             let fbObj = {
            //                 pageID: vendorObj.id1,
            //                 appID: vendorObj.id2,
            //                 appSecret: vendorObj.secret,
            //                 validationToken: vendorObj.token1,
            //                 pageToken: vendorObj.token2
            //             }
            //             let bot = MessengerPlatform.create(fbObj);
            //             if (Object.keys(bot).length > 0) {
            //                 determineFacebookType(msg, bot, receiver, () => {
            //                     resolve(msgObj);
            //                 });
            //             }
            //         }
            //     });
            // }).then((data) => {
            //     let msgObj = data;
            //     return new Promise((resolve, reject) => {
            //         appsChatroomsMessagesMdl.insertMessage(appId, receiver, msgObj, () => {
            //         });
            //     });
            // }).catch((ERR) => { });
        }); //sent message
        // 更新客戶資料
        socket.on('update profile', (data) => {
            let appId = data.appId;
            let userId = data.userId;
            let profObj = data.data
            chats.updateProfileByMessengerIdAndAppId(appId, userId, profObj);
        });
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
                })
            })
        })
        socket.on('insert composes', (data) => {
            let userId = data.userId;
            let composesObj = data.composesObj;
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
                    appsComposes.insertByAppId(appId, composesObj, (result) => {
                        resolve();
                    });
                })
            }).catch((ERR) => {
                var json = {
                    "status": 0,
                    "msg": ERR.MSG,
                    "code": ERR.CODE
                };
            });
        });
        socket.on('insert composesDraft', (data) => {
            let userId = data.userId;
            let appId = data.appId;
            let composesObj = data.composesObj;
            var proceed = new Promise((resolve, reject) => {
                resolve();
            });
            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (!appId) {
                        reject();
                        return;
                    }
                    appsComposes.insertByAppId(appId, composesObj, (result) => {
                        resolve();
                    });
                })
            }).catch((ERR) => {
                var json = {
                    "status": 0,
                    "msg": ERR.MSG,
                    "code": ERR.CODE
                };
            });
        });
        socket.on('find all info', (userId) => {
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
                        resolve(appids);
                    });
                })
            }).then((appId) => {
                return new Promise((resolve, reject) => {
                    for (let i in appId) {
                        appsComposes.findAllByAppId(appId[i], (info) => {
                            socket.emit('composes info', info);
                        });
                    }
                })
                resolve();
            })
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
        // 5.撈出內部聊天室紀錄
        socket.on('request internal chat data', (data, callback) => {
            requestInternalChatData(data, callback);
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
        socket.on('load add friend', () => {});
        //更新關鍵字回覆
        socket.on('update add friend message', (data, callback) => {
            // addFriendBroadcastMsg = data;
            let id = data.userId;
            let messageArray = data.textArray;
            if (messageArray.length === 0) {
                globalLineMessageArray.map(item => {
                    if (item.userId === id) {
                        globalLineMessageArray.splice(globalLineMessageArray.indexOf(item), 1);
                    }
                });
            } else {
                users.findUserByUserId(id, dbData => {
                    if (dbData.ids.chanId_1 === '' && dbData.ids.chanId_2 === '') {
                        callback('帳號未設定');
                    } else {
                        if (globalLineMessageArray.length === 0) {
                            globalLineMessageArray.push({ userId: id, chanId: channelIds[0], msg: messageArray });
                        } else {
                            globalLineMessageArray.map(item => {
                                if (item.userId === id) {
                                    globalLineMessageArray[item].msg.push(messageArray);
                                }
                            });
                        }
                        callback();
                    }
                });
            }
        });
        socket.on('update overview', data => {
            overview[data.message] = data.time;
        });
        /*===訊息end===*/
        /*===設定start===*/
        // 更改channel設定
        socket.on('update bot', data => {
            update_line_bot(data);
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
        socket.on('push composes to all', (composes) => {
            var userId = composes.userId;
            var receivers = [];
            let appId = composes.appId;
            var proceed = new Promise((resolve, reject) => {
                resolve();
            })
            proceed.then(() => {
                if (!appId) {
                    return Promise.reject();
                }
                let asyncTasks = [];
                asyncTasks.push(new Promise((resolve) => {
                    admin.database().ref('apps/' + appId + '/chatrooms/').once('value', snap => {
                        let chatrooms = snap.val();
                        if (chatrooms === undefined || chatrooms === null) {
                            chatrooms = '';
                        }
                        for (let i in chatrooms) {
                            receivers.push(i);
                            resolve(receivers);
                        }
                    })
                }))
                return Promise.all(asyncTasks);
            }).then((receiver) => {
                let asyncTasks = [];
                return new Promise((resolve, reject) => {
                    asyncTasks.push(new Promise((resolve) => {
                        composebot[appId].multicast(receiver[0], composes.message);
                    }))
                    resolve();
                    return Promise.all(asyncTasks);
                })
            }).catch((ERR) => {
                var json = {
                    "msg": ERR.MSG,
                    "code": ERR.CODE
                };
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
                        owner: "agent",
                        name: agentName,
                        time: nowTime,
                        message: "undefined_message",
                        from: 'chatshier'
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
                        let bot = MessengerPlatform.create(fbObj);
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
            let bot = MessengerPlatform.create(fbObj);
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
module.exports = init;