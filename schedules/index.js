let schedule = require('node-schedule');
let line = require('@line/bot-sdk');
let admin = require('firebase-admin');
let serviceAccount = require('../config/firebase-adminsdk');
let databaseURL = require('../config/firebase_admin_database_url');
let timer = require('../helpers/timer');

const API_ERROR = require('../config/api_error');
const SCHEMA = require('../config/schema');

const SYSTEM = 'SYSTEM';
const CHATSHIER = 'CHATSHIER';
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

let job1 = schedule.scheduleJob('10 * * * * *', () => {
    let startedUnixTime = Date.now();
    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    Promise.resolve().then(() => {
        return admin.database().ref('apps').once('value');
    }).then((snap) => {
        let apps = snap.val();
        // 相異 apps 允許 同時間群發。
        // 相同 apps 只能 同時間發最多五則訊息。
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
                    0 === composes[composeId].isDeleted &&
                    timer.minutedUnixTime(startedUnixTime) === timer.minutedUnixTime(composes[composeId].time)
                ) {
                    let message = {
                        type: composes[composeId].type,
                        text: composes[composeId].text
                    };
                    messages.push(message);
                }
            };
            let messagers = app.messagers || {};
            let config = {
                channelSecret: app.secret,
                channelAccessToken: app.token1
            };
            let lineBot = new line.Client(config);

            // 沒有訊息對象 或 沒有群發訊息 就不做處理
            if (0 === Object.keys(messagers).length || 0 === messages.length) {
                return Promise.resolve(null);
            };

            // #region 把 messages 分批，每五個一包，因為 line.multicast 方法 一次只能寄出五次
            let multicasts = [];
            let messageIndex;
            for (messageIndex in messages) {
                let j = Math.floor(messageIndex / 5);
                if (0 === messageIndex % 5) {
                    let multicast = {
                        messages: []
                    };
                    multicasts[j] = multicast;
                };
                let message = messages[messageIndex];
                multicasts[j].messages.push(message);
            };
            // #endregion

            return multicast(Object.keys(messagers), multicasts).then(() => {
                return Promise.all(Object.keys(messagers).map((messagerId) => {
                    let messager = messagers[messagerId];
                    let chatroomId = messager.chatroom_id;

                    return Promise.all(messages.map((message) => {
                        let _message = {
                            from: SYSTEM,
                            messager_id: messagerId,
                            createdTime: Date.now()
                        };
                        message = Object.assign(SCHEMA.APP_CHATROOM_MESSAGE, message, _message);
                        return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push(message);
                    }));
                }));
            });

            function multicast(messagers, multicasts) {

                return nextPromise(0);
                function nextPromise(i) {
                    if (i >= multicasts.length) {
                        return Promise.resolve();
                    };
                    let messages = multicasts[i].messages;
                    return lineBot.multicast(messagers, messages).then(() => {
                        return nextPromise(i + 1);
                    });
                }
            }

        }));
    }).then(() => {
        let finishedUnixTime = Date.now();
        console.log('[finish] [' + finishedUnixTime + '] [' + new Date(finishedUnixTime).toString() + '] schedules/index.js is finishing ... ');
    }).catch((err) => {
        let failedUnixTime = Date.now();
        console.log('[fail]   [' + failedUnixTime + '] [' + new Date(failedUnixTime).toString() + '] schedules/index.js is failing ... ');
        console.error(err);
    });
});