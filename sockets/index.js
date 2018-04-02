const socketIO = require('socket.io');

const line = require('@line/bot-sdk');
const wechat = require('wechat');
const facebook = require('facebook-bot-messenger'); // facebook串接
const fuseHlp = require('../helpers/fuse');
const StorageHlp = require('../helpers/storage');

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

const controllerCre = require('../cores/controller');

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

        let webhookPromise = Promise.all(webhookProcQueue).then(() => {
            let appId = '';
            let app = {};

            let receivedMessages = [];
            let repliedMessages = [];
            let totalMessages = [];
            let platformUid;
            let chatroomId;
            let messagerId;

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
                return botSvc.retrievePlatformUid(req, app);
            }).then((_platformUid) => {
                platformUid = _platformUid;
                return platformUid && botSvc.getProfile(platformUid, appId, app);
            }).then((profile) => {
                // 找出此 webhook 傳過來的發送者隸屬於哪一個 chatroom 中
                // 取出此發送者的 chatroomId 與隸屬 chatroom 裡的 messagerId
                return platformUid && appsChatroomsMessagersMdl.findByPlatformUid(appId, null, platformUid).then((appsChatroomsMessagers) => {
                    if (!appsChatroomsMessagers || (appsChatroomsMessagers && 0 === Object.keys(appsChatroomsMessagers).length)) {
                        // 如果沒找到屬於哪一個聊天室，則此訊息發送者尚未隸屬於任何聊天室中
                        return appsChatroomsMdl.insert(appId).then((appsChatrooms) => {
                            let chatrooms = appsChatrooms[appId].chatrooms;
                            chatroomId = Object.keys(chatrooms).shift() || '';
                            let messager = {
                                type: app.type,
                                platformUid: platformUid
                            };

                            // 自動建立一個聊天室後，將此訊息發送者加入，並同時更新 consumer 資料
                            return Promise.all([
                                appsChatroomsMessagersMdl.replace(appId, chatroomId, messager),
                                consumersMdl.replace(platformUid, profile)
                            ]).then((promiseResponses) => {
                                let appsChatroomsMessagers = promiseResponses.shift();
                                let messagers = appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers;
                                let messager = messagers[platformUid];
                                messagerId = messager._id;
                            });
                        });
                    }

                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    chatroomId = Object.keys(chatrooms).shift() || '';
                    let messagers = chatrooms[chatroomId].messagers;
                    let messager = messagers[platformUid];
                    messagerId = messager._id;
                    return consumersMdl.replace(platformUid, profile);
                });
            }).then(() => {
                return botSvc.getReceivedMessages(req, res, messagerId, appId, app);
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
                return botSvc.replyMessage(res, platformUid, replyToken, repliedMessages, appId, app);
            }).then(() => {
                return chatshierHlp.getKeywordreplies(receivedMessages, appId, app);
            }).then((keywordreplies) => {
                return Promise.all(keywordreplies.map((keywordreply) => {
                    return appsKeywordrepliesMdl.increaseReplyCount(appId, keywordreply._id);
                }));
            }).then(() => {
                return new Promise((resolve, reject) => {
                    groupsMdl.find(app.group_id, null, (groups) => {
                        resolve(groups);
                    });
                });
            }).then((groups) => {
                if (!groups) {
                    return;
                }

                let group = groups[app.group_id];
                let members = group.members;
                let recipientIds = Object.keys(members).map((memberId) => {
                    let userId = members[memberId].user_id;
                    // 有新訊息時，群組中的成員需要更新 unRead 數
                    return userId;
                });
                return recipientIds;
            }).then((recipientIds) => {
                if (!recipientIds) {
                    return;
                }

                totalMessages = receivedMessages.concat(repliedMessages);
                return totalMessages.length > 0 && chatroomId && appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, recipientIds, totalMessages.length);
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
                    return StorageHlp.filesMoveV2(fromPath, toPath);
                }
                return messages;
            }).then(() => {
                if (!(chatroomId && _messages && Object.keys(_messages).length > 0)) {
                    return;
                }

                /** @type {ChatshierChatSocketBody} */
                let messagesToSend = {
                    app_id: appId,
                    type: app.type,
                    chatroom_id: chatroomId,
                    // 從 webhook 打過來的訊息，不能確定接收人是誰(因為是群組接收)
                    // 因此傳到 chatshier 聊天室裡不需要聲明接收人是誰
                    recipientUid: '',
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
            let recipientUid = socketBody.recipientUid;
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
                    let senderUid = messages[i].platformUid || '';
                    delete messages[i].platformUid;

                    return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, senderUid).then((appsChatroomsMessagers) => {
                        if (!appsChatroomsMessagers) {
                            return Promise.reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                        }
                        let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                        let messager = chatrooms[chatroomId].messagers[senderUid];
                        let messagerId = messager._id;

                        messages[i].messager_id = messagerId;
                        let message = messages[i];

                        // messagerId 訊息寄送者，這裡為 vendor 的 userid
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
                            return botSvc.pushMessage(recipientUid, message, srcBuffer, appId, app);
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
                                if (senderUid === memberUserId) {
                                    return Promise.resolve();
                                }
                                return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, memberUserId);
                            }));
                        }).then(() => {
                            return nextMessage(i + 1);
                        });
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

        socket.on(SOCKET_EVENTS.UPDATE_CONSUMER_TO_SERVER, (req, callback) => {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;
            let platformUid = req.params.platformuid;

            let consumerToSocket = {
                appId: appId,
                platformUid: platformUid,
                chatroomId: chatroomId
            };

            return controllerCre.AppsRequestVerify(req).then((checkedAppIds) => {
                if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                // 只允許更新 API 可編輯的屬性
                let consumer = {};
                ('string' === typeof req.body.photo) && (consumer.photo = req.body.photo);
                ('number' === typeof req.body.age) && (consumer.age = req.body.age);
                ('string' === typeof req.body.email) && (consumer.email = req.body.email);
                ('string' === typeof req.body.phone) && (consumer.phone = req.body.phone);
                ('string' === typeof req.body.gender) && (consumer.gender = req.body.gender);
                ('string' === typeof req.body.remark) && (consumer.remark = req.body.remark);
                req.body.custom_fields && (consumer.custom_fields = req.body.custom_fields);

                return consumersMdl.replace(platformUid, consumer);
            }).then((consumers) => {
                if (!consumers) {
                    return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_UPDATE);
                }
                let consumer = consumers[platformUid];
                consumerToSocket.consumer = consumer;
                return appsChatroomsMessagersMdl.findByPlatformUid(appId, chatroomId, platformUid);
            }).then((appsChatroomsMessagers) => {
                if (!appsChatroomsMessagers) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }
                let messager = appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[platformUid];
                consumerToSocket.messager = messager;
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.UPDATE_CONSUMER_TO_CLIENT, consumerToSocket);
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
            let messages = data.composes;
            let consumers;
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
                return appsChatroomsMessagersMdl.findPlatformUids(appId).then((platformUids) => {
                    platformUids = platformUids || [];
                    return consumersMdl.find(platformUids);
                }).then((_consumers) => {
                    if (!_consumers) {
                        return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_FIND);
                    }
                    consumers = _consumers;
                    return consumers;
                });
            }).then(() => {
                let originConsumers = consumers;
                return new Promise((resolve, reject) => {
                    Object.keys(originConsumers).map((platformUid) => {
                        messages.forEach((message) => {
                            let originConsumer = originConsumers[platformUid];
                            let originConsumerAge = originConsumer.age || '';
                            let originConsumerGender = originConsumer.gender || '';
                            let originConsumerFields = originConsumer.custom_fields || {};

                            let messageAgeRange = message.ageRange || '';
                            let messageGender = message.gender || '';
                            let messageFields = 0 === Object.keys(message.field_ids).length ? {} : message.field_ids;

                            for (let i = 0; i < messageAgeRange.length; i++) {
                                if (i % 2) {
                                    if (originConsumerAge > messageAgeRange[i] && '' !== messageAgeRange[i]) {
                                        delete consumers[platformUid];
                                        continue;
                                    }
                                } else {
                                    if (originConsumerAge < messageAgeRange[i] && '' !== messageAgeRange[i]) {
                                        delete consumers[platformUid];
                                        continue;
                                    }
                                }
                            }
                            if (originConsumerGender !== messageGender && '' !== messageGender) {
                                delete consumers[platformUid];
                            }
                            Object.keys(messageFields).map((fieldId) => {
                                let originMessagerFieldValue = originConsumerFields[fieldId].value || '';
                                let messageFieldValue = messageFields[fieldId].value || '';
                                if (originMessagerFieldValue instanceof Array) {
                                    for (let i in originMessagerFieldValue) {
                                        if (originMessagerFieldValue[i] !== messageFieldValue && '' !== messageFieldValue) {
                                            delete consumers[platformUid];
                                        }
                                    }
                                } else {
                                    if (originMessagerFieldValue !== messageFieldValue && '' !== messageFieldValue) {
                                        delete consumers[platformUid];
                                    }
                                }
                            });
                        });
                    });
                    if (0 === Object.keys(consumers).length) {
                        reject(API_ERROR.APP_COMPOSE_DID_NOT_HAVE_THESE_FIELDS);
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return botSvc.multicast(Object.keys(consumers), messages, appId, app);
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
                return Promise.all(Object.keys(consumers).map((platformUid) => {
                    let consumer = consumers[platformUid];
                    let chatroomIds = consumer.chatroom_ids;

                    return Promise.all(chatroomIds.map((chatroomId) => {
                        return Promise.all(messages.map((message) => {
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
                                recipientUid: platformUid,
                                messages: _messages
                            };
                            // 所有訊息發送完畢後，再將所有訊息一次發送至 socket client 端
                            return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
                        });
                    }));
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
            let userId = data.userId;
            return appsChatroomsMessagersMdl.resetUnReadByPlatformUid(appId, chatroomId, userId);
        });
        /* ===聊天室end=== */
    });

    return socketIOServer;
}

module.exports = init;
