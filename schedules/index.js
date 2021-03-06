const schedule = require('node-schedule');
const timerHlp = require('../helpers/timer');
const composeHlp = require('../helpers/compose');
const chatshierHlp = require('../helpers/chatshier');
const socketHlp = require('../helpers/socket');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');
const appsComposesMdl = require('../models/apps_composes');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');

/** @type {any} */
const ERROR = require('../config/error.json');
const SOCKET_EVENTS = require('../config/socket-events');

const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';

let jobProcess = () => {
    let startedUnixTime = Date.now();

    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    return appsMdl.find().then((apps) => {
        if (!apps) {
            return Promise.reject(ERROR.APP_FAILED_TO_FIND);
        }

        // LINE BOT 相異 apps 允許 同時間群發。
        // LINE BOT 相同 apps 只能 同時間發最多五則訊息。
        let appIds = Object.keys(apps);
        return Promise.all(appIds.map((appId) => {
            let app = apps[appId];
            if (CHATSHIER === app.type || app.isDeleted) {
                return Promise.resolve(null);
            }

            return appsComposesMdl.find(appId).then((appsComposes) => {
                if (!appsComposes) {
                    return Promise.reject(ERROR.APP_COMPOSE_FAILED_TO_FIND);
                }

                let appComposes = appsComposes[appId] || {};
                let composes = appComposes.composes || {};

                for (let composeId in composes) {
                    let compose = composes[composeId];
                    if (compose.isDeleted ||
                        ('text' === compose.type && !compose.text) ||
                        ('image' === compose.type && !compose.src) ||
                        ('imagemap' === compose.type && !compose.imagemap_id) ||
                        ('template' === compose.type && !compose.template_id) ||
                        !compose.status ||
                        timerHlp.minutedUnixTime(startedUnixTime) !== timerHlp.minutedUnixTime(compose.time)) {
                        delete composes[composeId];
                    }
                }

                return chatshierHlp.prepareReplies(appId, composes).then((_composes) => {
                    return Promise.all(Object.keys(_composes).map((composeId) => {
                        let compose = _composes[composeId];
                        let conditions = compose.conditions || [];
                        let _compose = {
                            from: SYSTEM,
                            messager_id: ''
                        };
                        let message = Object.assign(_compose, compose);
                        message.time = Date.now();

                        let messages = [message];
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
                                        console.log('[database] insert each message to chatroom - ' + chatroomId);
                                        return appsChatroomsMessagesMdl.insert(appId, chatroomId, [message]).then((appsChatroomsMessages) => {
                                            if (!appsChatroomsMessages) {
                                                return Promise.reject(ERROR.APP_CHATROOM_MESSAGE_FAILED_TO_INSERT);
                                            }

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

                                        return appsChatroomsMessagersMdl.find(appId, chatroomId, void 0, CHATSHIER).then((_appsChatroomsMessagers) => {
                                            if (!(_appsChatroomsMessagers && _appsChatroomsMessagers[appId])) {
                                                return Promise.reject(ERROR.APP_CHATROOM_MESSAGER_FAILED_TO_FIND);
                                            }

                                            let chatroom = _appsChatroomsMessagers[appId].chatrooms[chatroomId];
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
                    }));
                });
            });
        }));
    }).then(() => {
        let finishedUnixTime = Date.now();
        console.log('[finish] [' + finishedUnixTime + '] [' + new Date(finishedUnixTime).toString() + '] schedules/index.js is finishing ... ');
    }).catch((err) => {
        let failedUnixTime = Date.now();
        console.log('[fail]   [' + failedUnixTime + '] [' + new Date(failedUnixTime).toString() + '] schedules/index.js is failing ... ');
        console.error(err);
    });
};

// the rule of schedule follows the rule of Linux crontab
schedule.scheduleJob('10 * * * * *', jobProcess);
