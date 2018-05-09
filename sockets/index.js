const socketIO = require('socket.io');

const storageHlp = require('../helpers/storage');
const socketHlp = require('../helpers/socket');
const botSvc = require('../services/bot');

const appsMdl = require('../models/apps');
const appsComposes = require('../models/apps_composes');
const appsChatroomsMdl = require('../models/apps_chatrooms');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const groupsMdl = require('../models/groups');

const ControllerCore = require('../cores/controller');

const SOCKET_EVENTS = require('../config/socket-events');
/** @type {any} */
const API_ERROR = require('../config/api_error.json');
/** @type {any} */
const API_SUCCESS = require('../config/api_success.json');

const CHAT_COUNT_INTERVAL_TIME = 900000;

const SYSTEM = 'SYSTEM';
const media = {
    image: 'png',
    audio: 'mp3',
    video: 'mp4'
};

function init(server) {
    let socketIOServer = socketIO(server);
    let chatshierNsp = socketIOServer.of('/chatshier');

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
            // 訊息寄送者，這裡為 vendor 的 userid
            let senderUid = socketBody.senderUid;
            let senderMsgId;
            let app;

            return appsMdl.find(appId).then((apps) => {
                if (!apps) {
                    return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                }
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

                    let fileName = message.fileName || `${message.time}.${media[message.type]}`;
                    delete message.fileName;

                    let originalFilePath = `/${fileName}`;
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
                        return appsChatroomsMessagesMdl.insert(appId, chatroomId, message).then((appsChatroomsMessages) => {
                            if (!appsChatroomsMessages) {
                                return Promise.reject(new Error(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT));
                            }
                            return appsChatroomsMessages[appId].chatrooms[chatroomId].messages;
                        });
                    }).then((messagesInDB) => {
                        let messageId = Object.keys(messagesInDB).shift() || '';
                        let _message = messagesInDB[messageId];
                        socketBody.messages[i] = _message;
                        if (!_message.src) {
                            return Promise.resolve(null);
                        }
                        let newFilePath = `/apps/${appId}/chatrooms/${chatroomId}/messages/${messageId}/src/${fileName}`;
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
                let chatroom = chatrooms[chatroomId];

                // 將 socket 資料原封不動的廣播到 chatshier chatroom
                socketBody.chatroom = chatroom;
                return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
            }).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.error(err);
                ('function' === typeof callback) && callback(err);
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
                console.error(err);
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
                return appsMdl.find(appId).then((apps) => {
                    if (!apps) {
                        return Promise.reject(API_ERROR.APPID_FAILED_TO_FIND);
                    }
                    return apps;
                });
            }).then((apps) => {
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
                        let chatroom = chatrooms[chatroomId];

                        /** @type {ChatshierChatSocketBody} */
                        let socketBody = {
                            app_id: appId,
                            type: app.type,
                            chatroom_id: chatroomId,
                            chatroom: chatroom,
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
