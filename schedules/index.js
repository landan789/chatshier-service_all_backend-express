const schedule = require('node-schedule');
const timerHlp = require('../helpers/timer');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');
const appsComposesMdl = require('../models/apps_composes');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const consumersMdl = require('../models/consumers');

const API_ERROR = require('../config/api_error');
const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';

let jobProcess = () => {
    let startedUnixTime = Date.now();

    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    return new Promise((resolve, reject) => {
        let appIds = '';
        appsMdl.find(appIds, null, (apps) => {
            if (!apps) {
                reject(API_ERROR.APPS_FAILED_TO_FIND);
                return;
            }
            resolve(apps);
        });
    }).then((apps) => {
        // LINE BOT 相異 apps 允許 同時間群發。
        // LINE BOT 相同 apps 只能 同時間發最多五則訊息。
        return Promise.all(Object.keys(apps).map((appId) => {
            let app = apps[appId];
            let messages = [];
            let chatroomIds = [];

            if (CHATSHIER === app.type || app.isDeleted) {
                return Promise.resolve(null);
            }

            let p1 = new Promise((resolve, reject) => {
                appsComposesMdl.find(appId, null, (appsComposes) => {
                    if (!appsComposes) {
                        return resolve({});
                    }
                    resolve(appsComposes[appId].composes);
                });
            });
            let p2 = appsChatroomsMessagersMdl.find(appId, null, null, app.type).then((appsChatroomsMessagers) => {
                let messagers = {};
                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                chatroomIds = Object.keys(chatrooms);
                for (let chatroomId in chatrooms) {
                    let chatroomMessagers = chatrooms[chatroomId].messagers;
                    for (let messagerId in chatroomMessagers) {
                        let messager = chatroomMessagers[messagerId];
                        messagers[messager.platformUid] = messager;
                    }
                }
                return messagers;
            });

            return Promise.all([p1, p2]).then((results) => {
                let composes = results[0];
                let messagers = results[1];

                for (let composeId in composes) {
                    if (composes[composeId].text &&
                        composes[composeId].status &&
                        timerHlp.minutedUnixTime(startedUnixTime) === timerHlp.minutedUnixTime(composes[composeId].time) &&
                        !composes[composeId].isDeleted
                    ) {
                        let message = {
                            type: composes[composeId].type,
                            text: composes[composeId].text
                        };
                        messages.push(message);

                        for (let platformUid in messagers) {
                            let originMessager = messagers[platformUid] || {};
                            if (originMessager.isDeleted) {
                                delete messagers[platformUid];
                                continue;
                            }
                            let originMessagerAge = originMessager.age || '';
                            let originMessagerGender = originMessager.gender || '';
                            let originMessagerFields = originMessager.custom_fields || {};

                            let composeAgeRange = composes[composeId].ageRange || '';
                            let composeGender = composes[composeId].gender || '';
                            let composeFields = composes[composeId].field_ids || {};

                            for (let i = 0; i < composeAgeRange.length; i++) {
                                if (i % 2) {
                                    if (originMessagerAge > composeAgeRange[i] && '' !== composeAgeRange[i]) {
                                        delete messagers[platformUid];
                                        continue;
                                    }
                                } else {
                                    if (originMessagerAge < composeAgeRange[i] && '' !== composeAgeRange[i]) {
                                        delete messagers[platformUid];
                                        continue;
                                    }
                                }
                            }
                            if (originMessagerGender !== composeGender && '' !== composeGender) {
                                delete messagers[platformUid];
                            }
                            for (let fieldId in composeFields) {
                                let originMessagerTagValue = originMessagerFields[fieldId].value || '';
                                let composeTagValue = composeFields[fieldId].value || '';
                                if (originMessagerTagValue !== composeTagValue && '' !== composeTagValue) {
                                    delete messagers[platformUid];
                                }
                            }
                        }
                    }
                }
                // 沒有訊息對象 或 沒有群發訊息 就不做處理
                if (0 === Object.keys(messagers).length || 0 === messages.length) {
                    return Promise.resolve(null);
                };
                return botSvc.multicast(Object.keys(messagers), messages, appId, app);
            }).then(() => {
                // 將所有已發送的訊息加到隸屬於 consumer 的 chatroom 中
                return Promise.all(chatroomIds.map((chatroomId) => {
                    return Promise.all(messages.map((message) => {
                        console.log('[database] insert to db each message ... ');
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
let job1 = schedule.scheduleJob('10 * * * * *', jobProcess);
// jobProcess();
