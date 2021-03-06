const socketIO = require('socket.io');

const storageHlp = require('../helpers/storage');
const socketHlp = require('../helpers/socket');
const composeHlp = require('../helpers/compose');
const chatshierHlp = require('../helpers/chatshier');
const botSvc = require('../services/bot');

const appsMdl = require('../models/apps');
const appsChatroomsMdl = require('../models/apps_chatrooms');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const groupsMdl = require('../models/groups');
const usersMdl = require('../models/users');

const SOCKET_EVENTS = require('../config/socket-events');
/** @type {any} */
const ERROR = require('../config/error.json');

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

    chatshierNsp.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        socket.on(SOCKET_EVENTS.USER_REGISTRATION, (userId, callback) => {
            userId && socketHlp.addSocket(userId, socket);
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
            let recipientUserIds = [];

            return appsMdl.find(appId).then((apps) => {
                if (!apps) {
                    return Promise.reject(ERROR.APP_FAILED_TO_FIND);
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

                    let originalFilePath = `/.tmp/${fileName}`;
                    let srcBuffer = message.src;

                    return Promise.resolve().then(() => {
                        if ('text' === message.type || 'imagemap' === message.type) {
                            return;
                        }

                        return storageHlp.filesUpload(originalFilePath, srcBuffer).then(() => {
                            let useShortUrl = 'file' === message.type;
                            return storageHlp.sharingCreateSharedLink(originalFilePath, useShortUrl);
                        }).then((url) => {
                            message.src = url;
                        });
                    }).then(() => {
                        return appsChatroomsMdl.find(appId, chatroomId).then((appsChatrooms) => {
                            if (!(appsChatrooms && appsChatrooms[appId])) {
                                return Promise.reject(ERROR.APP_CHATROOM_FAILED_TO_FIND);
                            }

                            let chatroom = appsChatrooms[appId].chatrooms[chatroomId];
                            if (chatroom.platformGroupId) {
                                return Promise.resolve(chatroom.platformGroupId);
                            }
                            return Promise.resolve(socketBody.recipientUid);
                        });
                    }).then((recipientUid) => {
                        return botSvc.pushMessage(recipientUid, message, srcBuffer, appId, app);
                    }).then(() => {
                        delete message.fileName;
                        delete message.duration;
                        return appsChatroomsMessagesMdl.insert(appId, chatroomId, [message]).then((appsChatroomsMessages) => {
                            if (!(appsChatroomsMessages && appsChatroomsMessages[appId])) {
                                return Promise.reject(new Error(ERROR.APP_CHATROOM_MESSAGE_FAILED_TO_INSERT));
                            }
                            return Promise.resolve(appsChatroomsMessages[appId].chatrooms[chatroomId].messages);
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
                memberUserIds = memberUserIds || [];
                recipientUserIds = memberUserIds.slice();

                // 將聊天室內所有的群組成員的未讀數加上訊息總數
                // 不需更新發送者的未讀數
                let _memberUserIds = memberUserIds.filter((memberUserId) => memberUserId !== senderUid);
                return appsChatroomsMessagersMdl.increaseUnReadByPlatformUid(appId, chatroomId, _memberUserIds, messages.length);
            }).then(() => {
                // 更新發送者的聊天狀態
                return appsChatroomsMessagersMdl.find(appId, chatroomId, senderMsgId).then((appsChatroomsMessagers) => {
                    if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                        return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                    }

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
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_UPDATE);
                }

                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let chatroom = chatrooms[chatroomId];

                // 將 socket 資料原封不動的廣播到 chatshier chatroom
                socketBody.chatroom = chatroom;
                return socketHlp.emitToAll(recipientUserIds, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
            }).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.error(err);
                let json = {
                    status: 0,
                    msg: err.MSG,
                    code: err.CODE
                };
                ('function' === typeof callback) && callback(json);
            });
        });

        socket.on(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_SERVER, (data, callback) => {
            let appId = data.appId;
            let chatroomId = data.chatroomId;
            let senderUid = data.senderUid;
            let socketBody = data;

            return appsChatroomsMessagersMdl.find(appId, chatroomId, void 0, CHATSHIER).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                }

                let chatroom = appsChatroomsMessagers[appId].chatrooms[chatroomId];
                let messagers = chatroom.messagers;
                let recipientUserIds = Object.keys(messagers).map((messagerId) => {
                    return messagers[messagerId].platformUid;
                }).filter((recipientUserId) => recipientUserId !== senderUid);

                return socketHlp.emitToAll(recipientUserIds, SOCKET_EVENTS.BROADCAST_MESSAGER_TO_CLIENT, socketBody);
            }).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.error(err);
                let json = {
                    status: 0,
                    msg: err.MSG,
                    code: err.CODE
                };
                ('function' === typeof callback) && callback(json);
            });
        });

        // 推播全部人
        socket.on(SOCKET_EVENTS.PUSH_COMPOSES_TO_ALL, (data, callback) => {
            /** @type {string[]} */
            let appIds = data.appIds || [];
            /** @type {any[]} */
            let composes = data.composes || [];
            /** @type {any[]} */
            let conditions = data.conditions || [];

            composes = composes.map((compose) => {
                let _compose = {
                    from: SYSTEM,
                    messager_id: ''
                };
                return Object.assign(_compose, compose);
            });

            return Promise.all(appIds.map((appId) => {
                return appsMdl.find(appId).then((apps) => {
                    if (!(apps && apps[appId])) {
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }

                    return Promise.all([
                        apps[appId],
                        chatshierHlp.prepareReplies(appId, composes)
                    ]);
                }).then(([ app, messages ]) => {
                    return composeHlp.findAvailableMessagers(conditions, appId).then((appsChatroomsMessagers) => {
                        if (!appsChatroomsMessagers[appId]) {
                            return Promise.resolve([]);
                        }

                        let chatroomIds = Object.keys(appsChatroomsMessagers[appId].chatrooms);
                        return Promise.all(chatroomIds.map((chatroomId) => {
                            let chatroom = appsChatroomsMessagers[appId].chatrooms[chatroomId];
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
                                    return appsChatroomsMessagesMdl.insert(appId, chatroomId, [message]).then((appsChatroomsMessages) => {
                                        if (!(appsChatroomsMessages && appsChatroomsMessages[appId])) {
                                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGE_FAILED_TO_INSERT);
                                        };

                                        let messagesInDB = appsChatroomsMessages[appId].chatrooms[chatroomId].messages;
                                        let messageId = Object.keys(messagesInDB).shift() || '';
                                        return Promise.resolve(messagesInDB[messageId]);
                                    });
                                })).then((messages) => {
                                    let chatroom = appsChatroomsMessagers[appId].chatrooms[chatroomId];
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
                                        recipientUid: recipientUids.shift() || '',
                                        messages: messages
                                    };

                                    return appsChatroomsMessagersMdl.find(appId, chatroomId, void 0, CHATSHIER).then((appsChatroomsMessagers) => {
                                        if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                                            return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                                        }

                                        let chatroom = appsChatroomsMessagers[appId].chatrooms[chatroomId];
                                        let messagers = chatroom.messagers;
                                        let recipientUserIds = Object.keys(messagers).map((messagerId) => {
                                            return messagers[messagerId].platformUid;
                                        });
                                        // 所有訊息發送完畢後，再將所有訊息一次發送至 socket client 端
                                        return socketHlp.emitToAll(recipientUserIds, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, socketBody);
                                    });
                                });
                            }));
                        });
                    });
                });
            })).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((ERR) => {
                console.error(ERR);
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
                console.error(err);
                ('function' === typeof callback) && callback(err);
            });
        });

        /* ===聊天室end=== */

        socket.on(SOCKET_EVENTS.USER_ADD_GROUP_MEMBER_TO_SERVER, (data, callback) => {
            let groupId = data.groupId;
            let memberId = data.memberId;
            let memberUserId = data.memberUserId;
            let userId = data.userId;
            let socketBody = {
                groupId: groupId,
                memberId: memberId
            };

            return groupsMdl.find(groupId, memberUserId).then((groups) => {
                if (!(groups && groups[groupId])) {
                    return Promise.reject(ERROR.GROUP_FAILED_TO_FIND);
                }
                return Promise.resolve(groups[groupId]);
            }).then((group) => {
                socketBody.group = group;

                return usersMdl.find(userId).then((users) => {
                    if (!(users && users[userId])) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[userId]);
                });
            }).then((user) => {
                socketBody.user = user;
                return socketHlp.emitToAll(memberUserId, SOCKET_EVENTS.USER_ADD_GROUP_MEMBER_TO_CLIENT, socketBody);
            }).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.error(err);
                ('function' === typeof callback) && callback(err);
            });
        });

        socket.on(SOCKET_EVENTS.USER_REMOVE_GROUP_MEMBER_TO_SERVER, (data, callback) => {
            let memberUserId = data.memberUserId;
            let socketBody = data;

            return socketHlp.emitToAll(memberUserId, SOCKET_EVENTS.USER_REMOVE_GROUP_MEMBER_TO_CLIENT, socketBody).then(() => {
                ('function' === typeof callback) && callback();
            }).catch((err) => {
                console.error(err);
                ('function' === typeof callback) && callback(err);
            });
        });
    });

    return socketIOServer;
}

module.exports = init;
