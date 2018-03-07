const schedule = require('node-schedule');
const admin = require('firebase-admin');

const serviceAccount = require('../config/firebase-adminsdk');
const databaseURL = require('../config/firebase_admin_database_url');
const API_ERROR = require('../config/api_error');

const timer = require('../helpers/timer');
const botSvc = require('../services/bot');
const appsMdl = require('../models/apps');

const CHATSHIER = 'CHATSHIER';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

let jobProcess = () => {
    let startedUnixTime = Date.now();
    let appIds = '';

    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    return new Promise((resolve, reject) => {
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
            for (let composeId in composes) {
                if (composes[composeId].text &&
                    1 === composes[composeId].status &&
                    timer.minutedUnixTime(startedUnixTime) === timer.minutedUnixTime(composes[composeId].time) &&
                    0 === composes[composeId].isDeleted
                ) {
                    let message = {
                        type: composes[composeId].type,
                        text: composes[composeId].text
                    };
                    messages.push(message);
                }
            };
            let messagers = app.messagers || {};
            // 沒有訊息對象 或 沒有群發訊息 就不做處理
            if (0 === Object.keys(messagers).length || 0 === messages.length) {
                return Promise.resolve(null);
            };

            // 把 messages 分批，每五個一包，因為 line.multicast 方法 一次只能寄出五次
            let multicasts = [];
            while (messages.length > 5) {
                multicasts.push(messages.splice(0, 5));
            }
            multicasts.push(messages);
            return botSvc.sendMulticast(Object.keys(messagers), multicasts, appId, app);
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
