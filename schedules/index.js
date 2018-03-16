const admin = require('firebase-admin');
const schedule = require('node-schedule');

const serviceAccount = require('../config/firebase-adminsdk');
const databaseURL = require('../config/firebase_admin_database_url');
const API_ERROR = require('../config/api_error');

const SCHEMA = require('../config/schema');

const timerHlp = require('../helpers/timer');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');
const appsMessagersMdl = require('../models/apps_messagers');
const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');

const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

let jobProcess = () => {
    let startedUnixTime = Date.now();

    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    return new Promise((resolve, reject) => {
        let appIds = '';
        appsMdl.findAppsByAppIds(appIds, (apps) => {
            if (!apps) {
                reject(API_ERROR.APPS_FAILED_TO_FIND);
            }
            resolve(apps);
        });
    }).then((apps) => {
        // LINE BOT 相異 apps 允許 同時間群發。
        // LINE BOT 相同 apps 只能 同時間發最多五則訊息。
        return Promise.all(Object.keys(apps).map((appId) => {
            let app = apps[appId];
            if (CHATSHIER === app.type || 1 === app.isDeleted) {
                return Promise.resolve();
            }

            let messages = [];
            let composes = app.composes === undefined ? '' : app.composes;
            let messagers = app.messagers || {};
            for (let messagerId in messagers) {
                let originMessager = messagers[messagerId] || {};
                let originMessagerAge = originMessager.age || '';
                let originMessagerGender = originMessager.gender || '';
                let originMessagerTags = originMessager.custom_tags || {};

                for (let composeId in composes) {
                    if (composes[composeId].text &&
                        1 === composes[composeId].status &&
                        timerHlp.minutedUnixTime(startedUnixTime) === timerHlp.minutedUnixTime(composes[composeId].time) &&
                        0 === composes[composeId].isDeleted
                    ) {
                        let message = {
                            type: composes[composeId].type,
                            text: composes[composeId].text
                        };
                        messages.push(message);
                        let composeAge = composes[composeId].age || '';
                        let composeGender = composes[composeId].gander || '';
                        let composeTags = composes[composeId].tag_ids || {};

                        for (let i = 0; i < composeAge.length; i++) {
                            if (i % 2) {
                                if (originMessagerAge > composeAge[i] && '' !== composeAge[i]) {
                                    delete messagers[messagerId];
                                    continue;
                                }
                            } else {
                                if (originMessagerAge < composeAge[i] && '' !== composeAge[i]) {
                                    delete messagers[messagerId];
                                    continue;
                                }
                            }
                        }
                        if (originMessagerGender !== composeGender && '' !== composeGender) {
                            delete messagers[messagerId];
                        }
                        for (let tagId in composeTags) {
                            let originMessagerTagValue = originMessagerTags[tagId].value || '';
                            let composeTagValue = composeTags[tagId].value || '';
                            if (originMessagerTagValue !== composeTagValue && '' !== composeTagValue) {
                                delete messagers[messagerId];
                            }
                        }
                    }
                };
            }
            // 沒有訊息對象 或 沒有群發訊息 就不做處理
            if (0 === Object.keys(messagers).length || 0 === messages.length) {
                return Promise.resolve(null);
            };

            return botSvc.multicast(Object.keys(messagers), messages, appId, app).then(() => {
                return Promise.all(Object.keys(messagers).map((messagerId) => {
                    let chatroomId = messagers[messagerId].chatroom_id;
                    if (!chatroomId) {
                        return Promise.resolve(null);
                    }
                    return Promise.all(messages.map((message) => {
                        console.log('[database] insert to db each message each messager[' + messagerId + '] ... ');
                        return appsChatroomsMessagesMdl.insertMessages(appId, chatroomId, message);
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

// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
let job1 = schedule.scheduleJob('10 * * * * *', jobProcess);
// jobProcess();
