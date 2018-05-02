const socketIO = require('socket.io');

const wechat = require('wechat');
const storageHlp = require('../helpers/storage');

const app = require('../app');

const chatshierHlp = require('../helpers/chatshier');
const socketHlp = require('../helpers/socket');
const botSvc = require('../services/bot');

const appsMdl = require('../models/apps');
const appsTemplatesMdl = require('../models/apps_templates');
const appsGreetingsMdl = require('../models/apps_greetings');
const appsComposes = require('../models/apps_composes');
const appsAutorepliesMdl = require('../models/apps_autoreplies');
const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
const appsChatroomsMdl = require('../models/apps_chatrooms');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const consumersMdl = require('../models/consumers');
const groupsMdl = require('../models/groups');
const groupsMembersMdl = require('../models/groups_members');

const ControllerCore = require('../cores/controller');

const SOCKET_EVENTS = require('../config/socket-events');
/** @type {any} */
const API_ERROR = require('../config/api_error.json');
/** @type {any} */
const API_SUCCESS = require('../config/api_success.json');

const FACEBOOK_WEBHOOK_VERIFY_TOKEN = 'verify_token';
const WECHAT_WEBHOOK_VERIFY_TOKEN = 'verify_token';

const CHAT_COUNT_INTERVAL_TIME = 900000;

const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';
const media = {
    image: 'png',
    audio: 'mp3',
    video: 'mp4'
};

function init(server) {
    let socketIOServer = socketIO(server);
    let chatshierNsp = socketIOServer.of('/chatshier');
    let webhookProcQueue = [];

    app.get('/webhook/:webhookid', function(req, res) {
        // Facebook
        if (req.query['hub.verify_token']) {
            if (FACEBOOK_WEBHOOK_VERIFY_TOKEN === req.query['hub.verify_token']) {
                console.log('Facebook validating webhook');
                res.status(200).send(req.query['hub.challenge']);
            } else {
                console.error('Facebook failed validation. Make sure the validation tokens match.');
                res.sendStatus(500);
            }
        }

        // Wechat 驗證簽名
        if (req.query.signature && req.query.timestamp && req.query.nonce) {
            if (wechat.checkSignature(req.query, WECHAT_WEBHOOK_VERIFY_TOKEN)) {
                console.log('Wechat validating webhook');
                res.status(200).send(req.query.echostr);
            } else {
                console.error('Wechat failed validation.');
                res.sendStatus(500);
            }
        }
    });

    app.post('/webhook/:webhookid', (req, res, next) => {
        let webhookid = req.params.webhookid;

        let webhookPromise = Promise.all(webhookProcQueue).then(() => {
            let appId = '';
            let app = {};

            let receivedMessages = [];
            let repliedMessages = [];
            let totalMessages = [];

            /** @type {{ platformGroupId?: string, platformGroupType?: string, platformUid: string }} */
            let platformInfo = { platformUid: '' };
            let chatroomId = '';
            let platformMessager;
            let consumers = {};

            let fromPath;
            let toPath;
            let _messages;

            return appsMdl.find(null, webhookid).then((apps) => {
                if (!apps || (apps && 0 === Object.keys(apps).length)) {
                    return Promise.reject(API_ERROR.APP_DID_NOT_EXIST);
                }
                appId = Object.keys(apps).shift() || '';
                app = apps[appId];
                return botSvc.parser(req, res, server, appId, app);
            }).then(() => {
                return botSvc.create(appId, app);
            }).then(() => {
                return botSvc.retrievePlatformInfo(req, app);
            }).then((_platformInfo) => {
                platformInfo = _platformInfo;
                return platformInfo && botSvc.getProfile(platformInfo, appId, app);
            }).then((profile) => {
                // 找出此 webhook 傳過來的發送者隸屬於哪一個 chatroom 中
                // 取出此發送者的 chatroomId 與隸屬 chatroom 裡的 messagerId
                let platformUid = platformInfo.platformUid;
                return platformUid && profile && consumersMdl.replace(platformUid, profile);
            }).then((_consumers) => {
                if (!_consumers) {
                    return;
                }
                consumers = _consumers;

                let platformGroupId = platformInfo.platformGroupId;
                let platformGroupType = platformInfo.platformGroupType;
                let platformUid = platformInfo.platformUid;

                return Promise.resolve().then(() => {
                    if (!platformGroupId) {
                        return;
                    }

                    // 如果 webhook 打過來的訊息是屬於平台的群組聊天，而非單一使用者
                    // 則根據平台的群組 ID 查找聊天室
                    // 若未找到記有群組 ID 的聊天室則自動建立一個聊天室
                    return appsChatroomsMdl.findByPlatformGroupId(appId, platformGroupId).then((appsChatrooms) => {
                        if (!appsChatrooms || (appsChatrooms && 0 === Object.keys(appsChatrooms).length)) {
                            let chatroom = {
                                platformGroupId: platformGroupId,
                                platformGroupType: platformGroupType
                            };
                            return appsChatroomsMdl.insert(appId, chatroom);
                        }
                        return appsChatrooms;
                    }).then((appsChatrooms) => {
                        let chatrooms = appsChatrooms[appId].chatrooms;
                        chatroomId = Object.keys(chatrooms).shift() || '';
                        return chatrooms[chatroomId];
                    });
                }).then((groupChatroom) => {
                    return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, platformUid).then((appsChatroomsMessagers) => {
                        // 如果平台用戶已屬於某個聊天室中並已存在，則直接與用其 messager 資訊
                        if (appsChatroomsMessagers && Object.keys(appsChatroomsMessagers).length > 0) {
                            let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                            chatroomId = Object.keys(chatrooms).shift() || '';
                            let messagers = chatrooms[chatroomId].messagers;
                            platformMessager = messagers[platformUid];
                            return;
                        }

                        return Promise.resolve().then(() => {
                            if (!groupChatroom) {
                                // 如果是非平台群組聊天室(單一 consumer)的話
                                // 首次聊天室自動為其建立聊天室
                                return appsChatroomsMdl.insert(appId).then((appsChatrooms) => {
                                    let chatrooms = appsChatrooms[appId].chatrooms;
                                    chatroomId = Object.keys(chatrooms).shift() || '';
                                });
                            }
                        }).then(() => {
                            // 自動建立聊天室後，將此訊息發送者加入
                            let messager = {
                                type: app.type,
                                platformUid: platformUid,
                                lastTime: Date.now()
                            };

                            return appsChatroomsMessagersMdl.insertByPlatformUid(appId, chatroomId, messager).then((appsChatroomsMessagers) => {
                                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                let messagers = chatrooms[chatroomId].messagers;
                                platformMessager = messagers[platformUid];
                            });
                        });
                    });
                });
            }).then(() => {
                if (!platformMessager) {
                    return [];
                }
                return botSvc.getReceivedMessages(req, res, platformMessager._id, appId, app);
            }).then((messages) => {
                receivedMessages = messages;
                if (0 < receivedMessages.length) {
                    fromPath = receivedMessages[0].fromPath;
                }
                return chatshierHlp.getRepliedMessages(receivedMessages, appId, app);
            }).then((messages) => {
                repliedMessages = messages;
                if (0 === repliedMessages.length) {
                    // 沒有回覆訊息的話代表此 webhook 沒有需要等待的非同步處理
                    // 因此在此直接將 webhook 的 http request 做 response
                    !res.headersSent && res.status(200).send('');
                    return;
                };

                // 因各平台處理方式不同
                // 所以將 http request 做 response 傳入
                // 待訊息回覆後直接做 http response
                let replyToken = receivedMessages[0].replyToken || '';
                let platformUid = platformInfo.platformUid;
                return botSvc.replyMessage(res, platformUid, replyToken, repliedMessages, appId, app);
            }).then(() => {
                return chatshierHlp.getKeywordreplies(receivedMessages, appId, app);
            }).then((keywordreplies) => {
                return Promise.all(keywordreplies.map((keywordreply) => {
                    return appsKeywordrepliesMdl.increaseReplyCount(appId, keywordreply._id);
                }));
            }).then(() => {
                return new Promise((resolve, reject) => {
                    groupsMembersMdl.findMembers(app.group_id, null, false, true, (members) => {
                        resolve(members);
                    });
                });
            }).then((members) => {
                if (!members) {
                    return [];
                }

                let recipientUids = Object.keys(members).map((memberId) => {
                    let userId = members[memberId].user_id;
                    return userId;
                });
                return recipientUids;
            }).then((recipientUids) => {
                if (!(recipientUids && platformInfo.platformUid)) {
                    return recipientUids;
                }

                let eventType = '';
                if (receivedMessages.length > 0) {
                    eventType = receivedMessages[0].eventType || null;
                }

                // 接收到的事件為 follow 或 unfollow 時
                // 只處理 repliedMessages
                if (eventType && ('follow' === eventType || 'unfollow' === eventType)) {
                    totalMessages = repliedMessages;
                } else {
                    totalMessages = receivedMessages.concat(repliedMessages);
                }

                // 將整個聊天室群組成員的聊天狀態更新
                return Promise.all(recipientUids.map((recipientUid) => {
                    return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, recipientUid).then((appsChatroomsMessagers) => {
                        let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                        let messagers = chatrooms[chatroomId].messagers;
                        let recipientMsger = messagers[recipientUid];

                        // 更新最後聊天時間及計算聊天次數
                        let currentTime = Date.now();
                        let _messager = {
                            platformUid: recipientUid,
                            chatCount: recipientMsger.chatCount ? recipientMsger.chatCount : 0,
                            lastTime: currentTime,
                            unRead: recipientMsger.unRead + totalMessages.length
                        };
                        if (recipientMsger.lastTime) {
                            let lastChatedTimeGap = currentTime - new Date(recipientMsger.lastTime).getTime();
                            if (CHAT_COUNT_INTERVAL_TIME <= lastChatedTimeGap) {
                                _messager.chatCount++;
                            }
                        }
                        return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, recipientUid, _messager);
                    });
                }));
            }).then(() => {
                return totalMessages.length > 0 && chatroomId && new Promise((resolve, reject) => {
                    appsChatroomsMessagesMdl.insert(appId, chatroomId, totalMessages, (appsChatroomsMessages) => {
                        if (!appsChatroomsMessages) {
                            reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                            return;
                        };
                        resolve(appsChatroomsMessages[appId].chatrooms[chatroomId].messages);
                    });
                });
            }).then((messages) => {
                _messages = messages;
                let messageId = Object.keys(messages).shift() || '';
                if (chatroomId && messageId && messages[messageId] && messages[messageId].src.includes('dl.dropboxusercontent')) {
                    toPath = `/apps/${appId}/chatrooms/${chatroomId}/messages/${messageId}/src${fromPath}`;
                    return storageHlp.filesMoveV2(fromPath, toPath);
                }
                return messages;
            }).then(() => {
                if (!(chatroomId && _messages && Object.keys(_messages).length > 0)) {
                    return;
                }

                // 抓出聊天室 messagers 最新的狀態傳給 socket
                // 讓前端能夠更新目前 messager 的聊天狀態
                return appsChatroomsMessagersMdl.find(appId, chatroomId).then((appsChatroomsMessagers) => {
                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    let messagers = chatrooms[chatroomId].messagers;

                    /** @type {ChatshierChatSocketBody} */
                    let messagesToSend = {
                        app_id: appId,
                        type: app.type,
                        chatroom_id: chatroomId,
                        senderUid: platformInfo.platformUid,
                        // 從 webhook 打過來的訊息，不能確定接收人是誰(因為是群組接收)
                        // 因此傳到 chatshier 聊天室裡不需要聲明接收人是誰
                        recipientUid: '',
                        messagers: messagers,
                        consumers: consumers,
                        messages: Object.values(_messages)
                    };
                    return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messagesToSend);
                });
            });
        }).then(() => {
            let idx = webhookProcQueue.indexOf(webhookPromise);
            idx >= 0 && webhookProcQueue.splice(idx, 1);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            console.log(JSON.stringify(json, null, 4));
            console.trace(json);
            !res.headersSent && res.sendStatus(500);
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
            /** @type {ChatshierChatSocketBody} */
            let socketBody = data;

            let appId = socketBody.app_id;
            let chatroomId = socketBody.chatroom_id;
            let messages = socketBody.messages;
            let senderUid = socketBody.senderUid;
            let senderMsgId;
            let app;

            return new Promise((resolve, reject) => {
                appsMdl.find(appId, null, (apps) => {
                    if (!apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(apps);
                });
            }).then((apps) => {
                app = apps[appId];
                return botSvc.create(appId, app);
            }).then(() => {
                /**
                 * @returns {Promise<any>}
                 */
                let nextMessage = (i) => {
                    if (i >= messages.length) {
                        return Promise.resolve();
                    }

                    // 2. 將資料寫入至資料庫
                    let message = messages[i];
                    senderMsgId = message.messager_id;

                    // messagerId 訊息寄送者，這裡為 vendor 的 userid
                    let originalFilePath = `/${message.time}.${media[message.type]}`;
                    let srcBuffer = message.src;

                    return Promise.resolve().then(() => {
                        if ('text' === message.type) {
                            return;
                        }
                        return storageHlp.filesUpload(originalFilePath, srcBuffer).then((response) => {
                            return storageHlp.sharingCreateSharedLink(originalFilePath);
                        }).then((response) => {
                            let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                            let url = wwwurl.replace('?dl=0', '');
                            message.src = url;
                        });
                    }).then(() => {
                        return appsChatroomsMdl.find(appId, chatroomId).then((appsChatrooms) => {
                            let chatroom = appsChatrooms[appId].chatrooms[chatroomId];
                            if (chatroom.platformGroupId) {
                                return chatroom.platformGroupId;
                            }
                            return socketBody.recipientUid;
                        });
                    }).then((recipientUid) => {
                        return botSvc.pushMessage(recipientUid, message, srcBuffer, appId, app);
                    }).then(() => {
                        return new Promise((resolve, reject) => {
                            appsChatroomsMessagesMdl.insert(appId, chatroomId, message, (appsChatroomsMessages) => {
                                if (!appsChatroomsMessages) {
                                    reject(new Error(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT));
                                    return;
                                }
                                resolve(appsChatroomsMessages[appId].chatrooms[chatroomId].messages);
                            });
                        });
                    }).then((messagesInDB) => {
                        let messageId = Object.keys(messagesInDB).shift() || '';
                        let _message = messagesInDB[messageId];
                        socketBody.messages[i] = _message;
                        if (!_message.src) {
                            return;
                        }
                        let newFilePath = `/apps/${appId}/chatrooms/${chatroomId}/messages/${messageId}/src/${_message.time}.${media[_message.type]}`;
                        return storageHlp.filesMoveV2(originalFilePath, newFilePath);
                    }).then(() => {
                        return nextMessage(i + 1);
                    });
                };
                return nextMessage(0);
            }).then(() => {
                // 根據 app 內的 group_id 找到群組內所有成員
                let groupId = app.group_id;
                return groupsMdl.findUserIds(groupId);
            }).then((memberUserIds) => {
                // 將聊天室內所有的群組成員的未讀數加上訊息總數
                // 不需更新發送者的未讀數
                memberUserIds = memberUserIds ? memberUserIds.filter((memberUserId) => memberUserId !== senderUid) : [];
                return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, memberUserIds, messages.length);
            }).then(() => {
                // 更新發送者的聊天狀態
                return appsChatroomsMessagersMdl.find(appId, chatroomId, senderMsgId).then((appsChatroomsMessagers) => {
                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    let messagers = chatrooms[chatroomId].messagers;
                    let senderMsger = messagers[senderMsgId];

                    let currentTime = Date.now();
                    let _messager = {
                        platformUid: senderMsger.platformUid,
                        chatCount: senderMsger.chatCount ? senderMsger.chatCount : 1,
                        lastTime: currentTime
                    };
                    if (senderMsger.lastTime) {
                        let lastChatedTimeGap = currentTime - new Date(senderMsger.lastTime).getTime();
                        if (CHAT_COUNT_INTERVAL_TIME <= lastChatedTimeGap) {
                            _messager.chatCount++;
                        }
                    }

                    return appsChatroomsMessagersMdl.update(appId, chatroomId, senderMsgId, _messager);
                });
            }).then((appsChatroomsMessagers) => {
                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let messagers = chatrooms[chatroomId].messagers;

                // 將 socket 資料原封不動的廣播到 chatshier chatroom
                socketBody.messagers = messagers;
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
            }).then(() => {
                ('function' === typeof callback) && callback();
            });
        });

        socket.on(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, (req, callback) => {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;
            let platformUid = req.params.platformuid;

            let messagerToSocket = {
                appId: appId,
                platformUid: platformUid,
                chatroomId: chatroomId
            };

            return ControllerCore.appsRequestVerify(req).then((checkedAppIds) => {
                if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                // 只允許更新 API 可編輯的屬性
                let messager = {};
                ('number' === typeof req.body.age) && (messager.age = req.body.age);
                ('string' === typeof req.body.email) && (messager.email = req.body.email);
                ('string' === typeof req.body.phone) && (messager.phone = req.body.phone);
                ('string' === typeof req.body.gender) && (messager.gender = req.body.gender);
                ('string' === typeof req.body.remark) && (messager.remark = req.body.remark);
                req.body.custom_fields && (messager.custom_fields = req.body.custom_fields);
                req.body.assigned_ids && (messager.assigned_ids = req.body.assigned_ids);

                return appsChatroomsMessagersMdl.updateByPlatformUid(appId, chatroomId, platformUid, messager);
            }).then((appsChatroomsMessagers) => {
                if (!appsChatroomsMessagers) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_UPDATE);
                }

                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let messagers = chatrooms[chatroomId].messagers;
                let messager = messagers[platformUid];
                messagerToSocket.messager = messager;
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.UPDATE_MESSAGER_TO_CLIENT, messagerToSocket);
            }).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                ('function' === typeof callback) && callback(err);
            });
        });

        // 推播全部人
        socket.on(SOCKET_EVENTS.PUSH_COMPOSES_TO_ALL, (data, callback) => {
            let userId = data.userId;
            let appId = data.appId;
            let composes = data.composes;
            let appsInsertedComposes = {};
            let req = {
                method: 'POST',
                params: {
                    appid: appId,
                    userid: userId
                }
            };
            let matchedChatrooms = {};
            let chatrooms;
            let app;

            // TODO 這裡為 socket 進入 不是 REST request
            return ControllerCore.appsRequestVerify(req).then(() => {
                if (!appId) {
                    return Promise.reject(new Error(API_ERROR.APPID_WAS_EMPTY));
                }
                return appsMdl.find(appId, null);
            }).then((apps) => {
                if (!apps) {
                    return Promise.reject(API_ERROR.APPID_FAILED_TO_FIND);
                }
                app = apps[appId];
                return botSvc.create(appId, app);
            }).then(() => {
                return appsChatroomsMessagersMdl.find(appId, null, null, app.type);
            }).then((appsChatroomsMessagers) => {
                if (!appsChatroomsMessagers) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }
                chatrooms = appsChatroomsMessagers[appId].chatrooms;

                for (let i in composes) {
                    let compose = composes[i];
                    let composeAgeRange = compose.ageRange;
                    let composeGender = compose.gender;
                    let composeFields = compose.field_ids || {};

                    for (let chatroomId in chatrooms) {
                        let chatroom = chatrooms[chatroomId];
                        let messagers = chatroom.messagers;

                        for (let messagerId in messagers) {
                            let messager = messagers[messagerId];
                            let messagerAge = messager.age || 0;
                            let messagerGender = messager.gender || '';
                            let messagerFields = messager.custom_fields || {};
                            let isMatch = true;

                            if (composeAgeRange && messagerAge &&
                                (messagerAge < composeAgeRange[0] || messagerAge > composeAgeRange[1])) {
                                isMatch = false;
                            }

                            if (composeGender && messagerGender && messagerGender !== composeGender) {
                                isMatch = false;
                            }

                            for (let fieldId in composeFields) {
                                let messagerFieldValue = messagerFields[fieldId].value;
                                let composeFieldValue = composeFields[fieldId].value;

                                if (messagerFieldValue instanceof Array) {
                                    for (let k in messagerFieldValue) {
                                        if (messagerFieldValue[k] && composeFieldValue && messagerFieldValue[k] !== composeFieldValue) {
                                            isMatch = false;
                                            break;
                                        }
                                    }
                                } else {
                                    if (messagerFieldValue && composeFieldValue && messagerFieldValue !== composeFieldValue) {
                                        isMatch = false;
                                    }
                                }
                            }

                            if (isMatch && !chatroom.platformGroupId) {
                                matchedChatrooms[chatroomId] = messager.platformUid;
                            }
                        }
                    }
                }

                let recipientUids = Object.values(matchedChatrooms);
                return recipientUids.length > 0 && botSvc.multicast(recipientUids, composes, appId, app);
            }).then(() => {
                return Promise.all(composes.map((compose) => {
                    return appsComposes.insert(appId, compose).then((_appsComposes) => {
                        // 失敗需要 reject, catch
                        if (!_appsComposes) {
                            return Promise.reject(API_ERROR.APP_COMPOSE_FAILED_TO_INSERT);
                        }
                        Object.assign(appsInsertedComposes, _appsComposes);
                        return _appsComposes;
                    });
                }));
            }).then(() => {
                let chatroomIds = Object.keys(matchedChatrooms);
                return Promise.all(chatroomIds.map((chatroomId) => {
                    return Promise.all(composes.map((compose) => {
                        let message = {
                            from: SYSTEM,
                            type: compose.type || 'text',
                            messager_id: '',
                            text: compose.text,
                            src: compose.src || '',
                            time: Date.now()
                        };

                        return appsChatroomsMessagesMdl.insert(appId, chatroomId, message).then((appsChatroomsMessages) => {
                            if (!appsChatroomsMessages) {
                                return Promise.reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                            };

                            let messagesInDB = appsChatroomsMessages[appId].chatrooms[chatroomId].messages;
                            let messageId = Object.keys(messagesInDB).shift() || '';
                            return messagesInDB[messageId];
                        });
                    })).then((messages) => {
                        let recipientUid = matchedChatrooms[chatroomId];
                        /** @type {ChatshierChatSocketBody} */
                        let socketBody = {
                            app_id: appId,
                            type: app.type,
                            chatroom_id: chatroomId,
                            senderUid: '',
                            recipientUid: recipientUid,
                            messages: messages
                        };
                        // 所有訊息發送完畢後，再將所有訊息一次發送至 socket client 端
                        return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
                    });
                }));
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsInsertedComposes
                };
                ('function' === typeof callback) && callback(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                ('function' === typeof callback) && callback(json);
            });
        });

        // 訊息已讀
        socket.on(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, (data) => {
            let appId = data.appId;
            let chatroomId = data.chatroomId;
            let userId = data.userId;
            return appsChatroomsMessagersMdl.resetUnReadByPlatformUid(appId, chatroomId, userId);
        });
        /* ===聊天室end=== */
    });

    return socketIOServer;
}

module.exports = init;
