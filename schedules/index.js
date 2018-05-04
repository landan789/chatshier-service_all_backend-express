const schedule = require('node-schedule');
const timerHlp = require('../helpers/timer');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');
const appsComposesMdl = require('../models/apps_composes');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');

/** @type {any} */
const API_ERROR = require('../config/api_error.json');
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
            let messages = [];
            let matchedChatrooms = {};

            if (CHATSHIER === app.type || app.isDeleted) {
                return Promise.resolve(null);
            }

            return Promise.all([
                appsComposesMdl.find(appId),
                appsChatroomsMessagersMdl.find(appId, null, null, app.type)
            ]).then((results) => {
                let appsComposes = results[0];
                if (!appsComposes) {
                    return Promise.reject(API_ERROR.APP_COMPOSES_FAILED_TO_FIND);
                }

                let appsChatroomsMessagers = results[1];
                if (!appsChatroomsMessagers) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }

                let composes = appsComposes[appId].composes;
                let chatrooms = appsChatroomsMessagers[appId].chatrooms;

                for (let composeId in composes) {
                    let compose = composes[composeId];
                    if (compose.isDeleted ||
                        !(compose.text && compose.status && timerHlp.minutedUnixTime(startedUnixTime) === timerHlp.minutedUnixTime(compose.time))) {
                        continue;
                    }

                    let composeAgeRange = compose.ageRange;
                    let composeGender = compose.gender;
                    let composeFields = compose.field_ids || {};

                    let message = {
                        type: compose.type,
                        text: compose.text,
                        src: compose.src || ''
                    };
                    messages.push(message);

                    for (let chatroomId in chatrooms) {
                        let chatroom = chatrooms[chatroomId];
                        let messagers = chatroom.messagers;

                        for (let messagerId in messagers) {
                            let messager = messagers[messagerId];
                            let messagerAge = messager.age;
                            let messagerGender = messager.gender;
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

                // 沒有訊息對象 或 沒有群發訊息 就不做處理
                let recipientUids = Object.values(matchedChatrooms);
                return recipientUids.length > 0 && messages.length > 0 && botSvc.multicast(recipientUids, messages, appId, app);
            }).then(() => {
                let chatroomIds = Object.keys(matchedChatrooms);
                // 將所有已發送的訊息加到隸屬於 consumer 的 chatroom 中
                return Promise.all(chatroomIds.map((chatroomId) => {
                    return Promise.all(messages.map((message) => {
                        message.from = SYSTEM;
                        message.messager_id = '';
                        message.time = Date.now();
                        console.log('[database] insert each message to chatroom - ' + chatroomId);
                        return appsChatroomsMessagesMdl.insert(appId, chatroomId, message);
                    }));
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
