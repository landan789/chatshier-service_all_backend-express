const schedule = require('node-schedule');
const timerHlp = require('../helpers/timer');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');
const appsMessagersMdl = require('../models/apps_messagers');
const appsComposesMdl = require('../models/apps_composes');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');

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
            let messagers = {};
            if (CHATSHIER === app.type || app.isDeleted) {
                return Promise.resolve([]);
            }

            let p1 = new Promise((resolve, reject) => {
                appsComposesMdl.find(appId, null, (appsComposes) => {
                    if (!appsComposes) {
                        return resolve([]);
                    }
                    resolve(appsComposes[appId].composes);
                });
            });
            let p2 = new Promise((resolve, reject) => {
                appsMessagersMdl.find(appId, null, (appsMessagers) => {
                    if (!appsMessagers) {
                        return resolve([]);
                    }
                    resolve(appsMessagers[appId].messagers);
                });
            });
            return Promise.all([p1, p2]).then((results) => {
                let composes = results[0];
                messagers = results[1];

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

                        for (let messagerId in messagers) {
                            let originMessager = messagers[messagerId] || {};
                            if (originMessager.isDeleted) {
                                delete messagers[messagerId];
                                continue;
                            }
                            let originMessagerAge = originMessager.age || '';
                            let originMessagerGender = originMessager.gender || '';
                            let originMessagerFields = originMessager.custom_fields || {};

                            let composeAgeRange = composes[composeId].ageRange || '';
                            let composeGender = composes[composeId].gander || '';
                            let composeFields = composes[composeId].field_ids || {};

                            for (let i = 0; i < composeAgeRange.length; i++) {
                                if (i % 2) {
                                    if (originMessagerAge > composeAgeRange[i] && '' !== composeAgeRange[i]) {
                                        delete messagers[messagerId];
                                        continue;
                                    }
                                } else {
                                    if (originMessagerAge < composeAgeRange[i] && '' !== composeAgeRange[i]) {
                                        delete messagers[messagerId];
                                        continue;
                                    }
                                }
                            }
                            if (originMessagerGender !== composeGender && '' !== composeGender) {
                                delete messagers[messagerId];
                            }
                            for (let fieldId in composeFields) {
                                let originMessagerTagValue = originMessagerFields[fieldId].value || '';
                                let composeTagValue = composeFields[fieldId].value || '';
                                if (originMessagerTagValue !== composeTagValue && '' !== composeTagValue) {
                                    delete messagers[messagerId];
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
                return Promise.all(Object.keys(messagers).map((messagerId) => {
                    let chatroomId = messagers[messagerId].chatroom_id;
                    if (!chatroomId) {
                        return Promise.resolve(null);
                    }
                    return Promise.all(messages.map((message) => {
                        console.log('[database] insert to db each message each messager[' + messagerId + '] ... ');
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
