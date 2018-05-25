const socketIO = require('socket.io');

const storageHlp = require('../helpers/storage');
const socketHlp = require('../helpers/socket');
const composeHlp = require('../helpers/compose');
const botSvc = require('../services/bot');

const appsMdl = require('../models/apps');
const appsChatroomsMdl = require('../models/apps_chatrooms');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const groupsMdl = require('../models/groups');

const SOCKET_EVENTS = require('../config/socket-events');
/** @type {any} */
const API_ERROR = require('../config/api_error.json');

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
                        if ('text' === message.type || 'imagemap' === message.type) {
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
                        if (!_message.src || 'imagemap' === _message.type) {
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

        socket.on(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_SERVER, (data, callback) => {
            var appId = data.appId;
            var socketBody = data;

            return socketHlp.emitToAll(appId, SOCKET_EVENTS.BROADCAST_MESSAGER_TO_CLIENT, socketBody).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.error(err);
                ('function' === typeof callback) && callback(err);
            });
        });

        // 推播全部人
        socket.on(SOCKET_EVENTS.PUSH_COMPOSES_TO_ALL, (data, callback) => {
            let appIds = data.appIds || [];
            let composes = data.composes || [];
            let conditions = data.conditions || [];
            let messages = composes.map((compose) => {
                let message = {
                    from: SYSTEM,
                    messager_id: '',
                    text: compose.text,
                    type: compose.type || 'text',
                    time: compose.time,
                    src: compose.src || ''
                };
                return message;
            });

            return Promise.all(appIds.map((appId) => {
                return composeHlp.findAvailableMessagers(conditions, appId).then((appsChatroomsMessagers) => {
                    let app = appsChatroomsMessagers[appId];
                    let chatroomIds = Object.keys(app.chatrooms);
                    return Promise.all(chatroomIds.map((chatroomId) => {
                        let chatroom = app.chatrooms[chatroomId];
                        let messagers = chatroom.messagers;
                        let messagerIds = Object.keys(chatroom.messagers);
                        let recipientUids = messagerIds.map((messagerId) => messagers[messagerId].platformUid);

                        if (0 === recipientUids.length) {
                            return Promise.resolve();
                        }
                        return botSvc.multicast(recipientUids, messages, appId, app);
                    })).then(() => {
                        return Promise.all(chatroomIds.map((chatroomId) => {
                            return Promise.all(messages.map((message) => {
                                return appsChatroomsMessagesMdl.insert(appId, chatroomId, message).then((appsChatroomsMessages) => {
                                    if (!appsChatroomsMessages) {
                                        return Promise.reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                                    };

                                    let messagesInDB = appsChatroomsMessages[appId].chatrooms[chatroomId].messages;
                                    let messageId = Object.keys(messagesInDB).shift() || '';
                                    return messagesInDB[messageId];
                                });
                            })).then((messages) => {
                                let chatroom = app.chatrooms[chatroomId];
                                let messagers = chatroom.messagers;
                                let messagerIds = Object.keys(messagers);
                                let recipientUids = messagerIds.map((messagerId) => messagers[messagerId].platformUid);

                                /** @type {ChatshierChatSocketBody} */
                                let socketBody = {
                                    app_id: appId,
                                    type: app.type,
                                    chatroom_id: chatroomId,
                                    chatroom: chatroom,
                                    senderUid: '',
                                    recipientUid: recipientUids.shift(),
                                    messages: messages
                                };
                                // 所有訊息發送完畢後，再將所有訊息一次發送至 socket client 端
                                return socketHlp.emitToAll(appId, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
                            });
                        }));
                    });
                });
            })).then(() => {
                ('function' === typeof callback) && callback();
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
        socket.on(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, (data, callback) => {
            let appId = data.appId;
            let chatroomId = data.chatroomId;
            let userId = data.userId;
            return appsChatroomsMessagersMdl.resetUnReadByPlatformUid(appId, chatroomId, userId).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                ('function' === typeof callback) && callback(err);
            });
        });

        /* ===聊天室end=== */
    });

    return socketIOServer;
}

module.exports = init;
