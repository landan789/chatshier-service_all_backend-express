let socketIO = require('socket.io');

let line = require('@line/bot-sdk');
let wechat = require('wechat');
let facebook = require('facebook-bot-messenger'); // facebook串接
const fuseHlp = require('../helpers/fuse');
const StorageHlp = require('../helpers/storage');

let app = require('../app');

let chatshierHlp = require('../helpers/chatshier');
let socketHlp = require('../helpers/socket');
let botSvc = require('../services/bot');

let appsMdl = require('../models/apps');
let appsMessagersMdl = require('../models/apps_messagers');
let appsTemplatesMdl = require('../models/apps_templates');
let appsGreetingsMdl = require('../models/apps_greetings');
let appsComposes = require('../models/apps_composes');
let appsAutorepliesMdl = require('../models/apps_autoreplies');
let appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
let appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
let groupsMdl = require('../models/groups');

let controllerCre = require('../cores/controller');

const SOCKET_EVENTS = require('../config/socket-events');
const API_ERROR = require('../config/api_error');
const API_SUCCESS = require('../config/api_success');

const FACEBOOK_WEBHOOK_VERIFY_TOKEN = 'verify_token';
const WECHAT_WEBHOOK_VERIFY_TOKEN = 'verify_token';
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

    app.get('/webhook/:webhookId', function(req, res) {
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
        let appId = '';
        let app = {};

        let webhookPromise = Promise.all(webhookProcQueue).then(() => {
            let receivedMessages = [];
            let repliedMessages = [];
            let totalMessages = [];
            let sender;
            let senderId;
            let groupId;
            let fromPath;
            let toPath;
            let _messages;

            return new Promise((resolve, reject) => {
                appsMdl.find(null, webhookid, (apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        reject(API_ERROR.APP_DID_NOT_EXIST);
                        return;
                    }
                    resolve(apps);
                });
            }).then((apps) => {
                appId = Object.keys(apps).shift() || '';
                app = apps[appId];
                return botSvc.parser(req, res, server, appId, app);
            }).then(() => {
                return botSvc.create(appId, app);
            }).then(() => {
                return botSvc.getReceivedMessages(req, res, appId, app);
            }).then((messages) => {
                receivedMessages = messages;
                if (receivedMessages.length > 0) {
                    senderId = receivedMessages[0].messager_id;
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
                return botSvc.replyMessage(res, senderId, replyToken, repliedMessages, appId, app);
            }).then(() => {
                return chatshierHlp.getKeywordreplies(receivedMessages, appId, app);
            }).then((keywordreplies) => {
                return Promise.all(keywordreplies.map((keywordreply) => {
                    return appsKeywordrepliesMdl.increaseReplyCount(appId, keywordreply.id);
                }));
            }).then(() => {
                return senderId && botSvc.getProfile(senderId, appId, app);
            }).then((profile) => {
                return senderId && new Promise((resolve) => {
                    appsMessagersMdl.replaceMessager(appId, senderId, profile, (messagers) => {
                        resolve(messagers);
                    });
                });
            }).then((messagers) => {
                if (!messagers) {
                    return;
                }

                sender = messagers[appId].messagers[senderId];
                groupId = app.group_id;
                return new Promise((resolve, reject) => {
                    groupsMdl.find(groupId, null, (groups) => {
                        resolve(groups);
                    });
                });
            }).then((groups) => {
                if (!groups) {
                    return;
                }

                let group = groups[groupId];
                let members = group.members;
                let messagerIds = Object.keys(members).map((memberId) => {
                    let userId = members[memberId].user_id;
                    // 只有 群組中 不為 寄送訊息的人員 才需要更新 unread 數目
                    if (userId !== senderId) {
                        return userId;
                    }
                });
                return messagerIds;
            }).then((messagerIds) => {
                if (!messagerIds) {
                    return;
                }

                totalMessages = receivedMessages.concat(repliedMessages);
                return totalMessages.length > 0 && appsChatroomsMessagersMdl.increaseMessagersUnRead(appId, sender.chatroom_id, messagerIds, totalMessages.length);
            }).then(() => {
                return totalMessages.length > 0 && new Promise((resolve, reject) => {
                    appsChatroomsMessagesMdl.insert(appId, sender.chatroom_id, totalMessages, (appsChatroomsMessages) => {
                        if (!appsChatroomsMessages) {
                            reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                            return;
                        };
                        resolve(appsChatroomsMessages[appId].chatrooms[sender.chatroom_id].messages);
                    });
                });
            }).then((messages) => {
                _messages = messages;
                let messageId = Object.keys(messages).shift() || '';
                if (messageId && messages[messageId] && messages[messageId].src.includes('dl.dropboxusercontent')) {
                    toPath = `/apps/${appId}/chatrooms/${sender.chatroom_id}/messages/${messageId}/src${fromPath}`;
                    return StorageHlp.filesMoveV2(fromPath, toPath);
                }
                return messages;
            }).then(() => {
                if (!(_messages && Object.keys(_messages).length > 0)) {
                    return;
                }

                /** @type {ChatshierChatSocketBody} */
                let messagesToSend = {
                    app_id: appId,
                    type: app.type,
                    chatroom_id: sender.chatroom_id,
                    // 從 webhook 打過來的訊息，不能確定接收人是誰(因為是群組接收)
                    // 因此傳到 chatshier 聊天室裡不需要聲明接收人是誰
                    recipientId: '',
                    messages: Object.values(_messages)
                };
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messagesToSend);
            });
        }).then(() => {
            let idx = webhookProcQueue.indexOf(webhookPromise);
            idx >= 0 && webhookProcQueue.splice(idx, 1);
        }).catch((error) => {
            console.trace(error);
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
            // Uid LINE 或 FACEBOOK 用戶的 Uid
            let recipientId = socketBody.recipientId;
            let app;

            return new Promise((resolve) => {
                appsMdl.find(appId, null, (apps) => {
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
                    // messagerId 訊息寄送者，這裡為 vendor 的 userid
                    let senderId = message.messager_id;
                    let originalFilePath = `/${message.time}.${media[message.type]}`;
                    let srcBuffer = message.src;

                    return Promise.resolve().then(() => {
                        if ('text' === message.type) {
                            return;
                        }
                        return StorageHlp.filesUpload(originalFilePath, srcBuffer).then((response) => {
                            return StorageHlp.sharingCreateSharedLink(originalFilePath);
                        }).then((response) => {
                            let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                            let url = wwwurl.replace('?dl=0', '');
                            message.src = url;
                        });
                    }).then(() => {
                        return botSvc.pushMessage(recipientId, message, srcBuffer, appId, app);
                    }).then(() => {
                        return new Promise((resolve, reject) => {
                            appsChatroomsMessagesMdl.insert(appId, chatroomId, message, (messagesInDB) => {
                                if (!messagesInDB) {
                                    reject(new Error(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT));
                                    return;
                                }
                                resolve(messagesInDB);
                            });
                        });
                    }).then((messagesInDB) => {
                        let messageId = Object.keys(messagesInDB).shift() || '';
                        let _message = messagesInDB[messageId];
                        if (!_message.src) {
                            return;
                        }
                        let newFilePath = `/apps/${appId}/chatrooms/${chatroomId}/messages/${messageId}/src/${_message.time}.${media[_message.type]}`;
                        return StorageHlp.filesMoveV2(originalFilePath, newFilePath);
                    }).then(() => {
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
                            return appsChatroomsMessagersMdl.increaseMessagersUnRead(appId, chatroomId, memberUserId);
                        }));
                    }).then(() => {
                        return nextMessage(i + 1);
                    });
                };
                return nextMessage(0);
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
        socket.on('push composes to all', (data, callback) => {
            let userId = data.userId;
            let appId = data.appId;
            let messages = data.composes;
            let messagers;
            let appsInsertedComposes = '';
            let appType = '';
            let req = {
                method: 'POST',
                params: {
                    appid: appId,
                    userid: userId
                }
            };
            let app;

            // TODO 這裡為 socket 進入 不是 REST request
            return controllerCre.AppsRequestVerify(req).then(() => {
                if (!appId) {
                    return Promise.reject(new Error(API_ERROR.APPID_FAILED_TO_FIND));
                };
                return new Promise((resolve, reject) => {
                    appsMdl.find(appId, null, (apps) => {
                        if (!apps) {
                            reject(API_ERROR.APPID_WAS_EMPTY);
                            return;
                        }
                        let app = apps[appId];
                        resolve(app);
                    });
                });
            }).then((_app) => {
                app = _app;
                appType = app.type;
                return botSvc.create(appId, app);
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMessagersMdl.find(appId, null, (appsMessagers) => {
                        if (!appsMessagers) {
                            reject(API_ERROR.APP_MESSAGER_FAILED_TO_FIND);
                            return;
                        };
                        messagers = appsMessagers[appId].messagers;
                        resolve();
                    });
                });
            }).then(() => {
                let originMessagers = messagers;
                return new Promise((resolve, reject) => {
                    Object.keys(originMessagers).map((messagerId) => {
                        if (messagers[messagerId].isDeleted) {
                            delete messagers[messagerId];
                            return;
                        }

                        messages.forEach((message) => {
                            let originMessager = originMessagers[messagerId];
                            let originMessagerAge = originMessager.age || '';
                            let originMessagerGender = originMessager.gender || '';
                            let originMessagerTags = originMessager.custom_tags || {};

                            let messageAge = message.age || '';
                            let messageGender = message.gender || '';
                            let messageTags = 0 === Object.keys(message.tag_ids).length ? {} : message.tag_ids;

                            for (let i = 0; i < messageAge.length; i++) {
                                if (i % 2) {
                                    if (originMessagerAge > messageAge[i] && '' !== messageAge[i]) {
                                        delete messagers[messagerId];
                                        continue;
                                    }
                                } else {
                                    if (originMessagerAge < messageAge[i] && '' !== messageAge[i]) {
                                        delete messagers[messagerId];
                                        continue;
                                    }
                                }
                            }
                            if (originMessagerGender !== messageGender && '' !== messageGender) {
                                delete messagers[messagerId];
                            }
                            Object.keys(messageTags).map((tagId) => {
                                let originMessagerTagValue = originMessagerTags[tagId].value || '';
                                let messageTagValue = messageTags[tagId].value || '';
                                if (originMessagerTagValue instanceof Array) {
                                    for (let i in originMessagerTagValue) {
                                        if (originMessagerTagValue[i] !== messageTagValue && '' !== messageTagValue) {
                                            delete messagers[messagerId];
                                        }
                                    }
                                } else {
                                    if (originMessagerTagValue !== messageTagValue && '' !== messageTagValue) {
                                        delete messagers[messagerId];
                                    }
                                }
                            });
                        });
                    });
                    if (0 === Object.keys(messagers).length) {
                        reject(API_ERROR.APP_COMPOSE_DID_NOT_HAVE_THESE_TAGS);
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return botSvc.multicast(Object.keys(messagers), messages, appId, app);
            }).then(() => {
                return Promise.all(messages.map((message) => {
                    return new Promise((resolve, reject) => {
                        appsComposes.insert(appId, message, (_appsComposes) => {
                            // 失敗需要 reject, catch
                            if (!_appsComposes) {
                                reject(API_ERROR.APP_COMPOSE_FAILED_TO_INSERT);
                                return;
                            }
                            appsInsertedComposes = _appsComposes;
                            resolve();
                        });
                    });
                }));
            }).then(() => {
                return Promise.all(Object.keys(messagers).map((messagerId) => {
                    let chatroomId = messagers[messagerId].chatroom_id;

                    return Promise.all(messages.map((message) => {
                        /** @type {ChatshierMessage} */
                        let _message = {
                            from: SYSTEM,
                            messager_id: '',
                            text: message.text,
                            src: '',
                            time: Date.now(),
                            type: 'text'
                        };

                        return new Promise((resolve, reject) => {
                            appsChatroomsMessagesMdl.insert(appId, chatroomId, _message, (messagesInDB) => {
                                if (!messagesInDB) {
                                    reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                                    return;
                                };
                                let messageId = Object.keys(messagesInDB).shift() || '';
                                resolve(messagesInDB[messageId]);
                            });
                        });
                    })).then((_messages) => {
                        /** @type {ChatshierChatSocketBody} */
                        let socketBody = {
                            app_id: appId,
                            type: appType,
                            chatroom_id: chatroomId,
                            recipientId: messagerId,
                            messages: _messages
                        };
                        // 所有訊息發送完畢後，再將所有訊息一次發送至 socket client 端
                        return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
                    });
                }));
            }).then(() => {
                let result = appsInsertedComposes !== undefined ? appsInsertedComposes : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: result
                };
                ('function' === typeof callback) && callback(json);
            }).catch((err) => {
                let json = {
                    status: 0,
                    msg: err.MSG,
                    code: err.CODE
                };
                ('function' === typeof callback) && callback(json);
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
    });

    return socketIOServer;
}

module.exports = init;
