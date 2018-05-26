const schedule = require('node-schedule');
const timerHlp = require('../helpers/timer');
const composeHlp = require('../helpers/compose');
const socketHlp = require('../helpers/socket');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');
const appsComposesMdl = require('../models/apps_composes');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');

/** @type {any} */
const API_ERROR = require('../config/api_error.json');
const SOCKET_EVENTS = require('../config/socket-events');

const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';

let jobProcess = () => {
    let startedUnixTime = Date.now();

    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    return appsMdl.find().then((apps) => {
        if (!apps) {
            return Promise.reject(API_ERROR.APPS_FAILED_TO_FIND);
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
                if (!(appsComposes && appsComposes[appId])) {
                    return Promise.reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                }
                let composes = appsComposes[appId].composes;
                let composeIds = Object.keys(composes);
                composeIds = composeIds.filter((composeId) => {
                    let compose = composes[composeId];
                    return (
                        !compose.isDeleted &&
                        !!compose.text &&
                        compose.status &&
                        timerHlp.minutedUnixTime(startedUnixTime) === timerHlp.minutedUnixTime(compose.time)
                    );
                });

                return Promise.all(composeIds.map((composeId) => {
                    let compose = composes[composeId];
                    let conditions = compose.conditions;
                    let message = {
                        from: SYSTEM,
                        messager_id: '',
                        type: compose.type,
                        text: compose.text,
                        time: Date.now(),
                        src: compose.src || ''
                    };
                    let messages = [message];

                    return composeHlp.findAvailableMessagers(conditions, appId).then((appsChatroomsMessagers) => {
                        let _app = appsChatroomsMessagers[appId];
                        if (!_app) {
                            return Promise.resolve([]);
                        }

                        let chatroomIds = Object.keys(appsChatroomsMessagers[appId].chatrooms);
                        return Promise.all(chatroomIds.map((chatroomId) => {
                            let chatroom = _app.chatrooms[chatroomId];
                            let messagers = chatroom.messagers;
                            let messagerIds = Object.keys(chatroom.messagers);
                            let recipientUids = messagerIds.map((messagerId) => messagers[messagerId].platformUid);

                            if (0 === recipientUids.length) {
                                return Promise.resolve();
                            }
                            return botSvc.multicast(recipientUids, messages, appId, _app);
                        })).then(() => {
                            return Promise.all(chatroomIds.map((chatroomId) => {
                                return Promise.all(messages.map((message) => {
                                    console.log('[database] insert each message to chatroom - ' + chatroomId);
                                    return appsChatroomsMessagesMdl.insert(appId, chatroomId, message).then((appsChatroomsMessages) => {
                                        if (!appsChatroomsMessages) {
                                            return Promise.reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                                        }

                                        let messagesInDB = appsChatroomsMessages[appId].chatrooms[chatroomId].messages;
                                        let messageId = Object.keys(messagesInDB).shift() || '';
                                        return messagesInDB[messageId];
                                    });
                                })).then((messages) => {
                                    let chatroom = _app.chatrooms[chatroomId];
                                    let messagers = chatroom.messagers;
                                    let messagerIds = Object.keys(messagers);
                                    let recipientUids = messagerIds.map((messagerId) => messagers[messagerId].platformUid);

                                    /** @type {ChatshierChatSocketBody} */
                                    let socketBody = {
                                        app_id: appId,
                                        type: _app.type,
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
                }));
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
