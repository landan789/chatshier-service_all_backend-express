let schedule = require('node-schedule');
let line = require('@line/bot-sdk');
let admin = require('firebase-admin');
let serviceAccount = require('../config/firebase-adminsdk');
let databaseURL = require('../config/firebase_admin_database_url');
let timer = require('../helpers/timer');

const API_ERROR = require('../config/api_error');

const SYSTEM = 'SYSTEM';
const CHATSHIER = 'CHATSHIER';
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

let job1 = schedule.scheduleJob('0 * * * * *', () => {
    let nowUnixTime = Date.now();
    console.log('[start] [' + nowUnixTime + '] schedules/index.js is starting ... ');
    Promise.resolve().then(() => {
        return admin.database().ref('apps').once('value');
    }).then((snap) => {
        let apps = snap.val();
        return Promise.all(Object.keys(apps).map((appId) => {
            let app = apps[appId];
            if (CHATSHIER === app.type) {
                return Promise.resolve();
            }
            let messages = [];
            let composes = app.composes === undefined ? '' : app.composes;
            for (let composeId in composes) {
                if (composes[composeId].text &&
                    1 === composes[composeId].status &&
                    timer.minutedUnixTime(nowUnixTime) === timer.minutedUnixTime(composes[composeId].time)) {
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

            return Promise.all(messages.map((message) => {
                return lineBot.multicast(messagers, message);
            })).then(() => {
                return Promise.all(Object.keys(messagers).map((messagerId) => {
                    let messager = messagers[messagerId];
                    let chatroomId = messager.chatroom_id;

                    return Promise.all(messages.map((message) => {
                        let _message = {
                            from: SYSTEM,
                            messager_id: messagerId,
                            createdTime: Date.now()
                        };
                        message = Object.assign(message, _message);
                        return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push(message);
                    }));
                }));
            });
        }));
    }).then(() => {
        console.log('[finish] [' + Date.now() + '] schedules/index.js is finishing ... ');
    }).catch((err) => {
        console.log('[fail] [' + Date.now() + '] schedules/index.js is failing ... ');
        console.error(err);
    });
});