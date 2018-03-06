let schedule = require('node-schedule');
let line = require('@line/bot-sdk');
let admin = require('firebase-admin');
let facebook = require('facebook-bot-messenger'); // facebook串接
let serviceAccount = require('../config/firebase-adminsdk');
let databaseURL = require('../config/firebase_admin_database_url');
let timer = require('../helpers/timer');

const API_ERROR = require('../config/api_error');
const SCHEMA = require('../config/schema');

let appsMdl = require('../models/apps');
let appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
const SYSTEM = 'SYSTEM';
const CHATSHIER = 'CHATSHIER';
const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

let job1 = schedule.scheduleJob('10 * * * * *', () => {
    let startedUnixTime = Date.now();
    let appIds = '';
    let bot = {};
    let appType = '';
    console.log('[start]  [' + startedUnixTime + '] [' + new Date(startedUnixTime).toString() + '] schedules/index.js is starting ... ');
    return new Promise((resolve, reject) => {
        appsMdl.findAppsByAppIds(appIds, (apps) => {
            if (!apps) {
                reject(API_ERROR.APPS_FAILED_TO_FIND);
            }
            resolve(apps);
        });
    }).then((apps) => {
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
            appType = app.type;
            switch (app.type) {
                case LINE:
                    let lineConfig = {
                        channelSecret: app.secret,
                        channelAccessToken: app.token1
                    };
                    bot = new line.Client(lineConfig);
                    break;
                case FACEBOOK:
                    let facebookConfig = {
                        pageID: app.id1,
                        appID: app.id2 || '',
                        appSecret: app.secret,
                        validationToken: app.token1,
                        pageToken: app.token2 || ''
                    };
                    // fbBot 因為無法取得 json 因此需要在 bodyParser 才能解析，所以拉到這層
                    bot = facebook.create(facebookConfig);
                    break;
            }
            switch (appType) {
                case LINE:
                    return multicast(Object.keys(messagers), multicasts).then(() => {
                        return Promise.all(Object.keys(messagers).map((messagerId) => {
                            return Promise.all(messages.map((message) => {
                                let _message = {
                                    from: SYSTEM,
                                    messager_id: '',
                                    text: message.text,
                                    time: Date.now(),
                                    type: 'text'
                                };
                                message = Object.assign(SCHEMA.APP_CHATROOM_MESSAGE, message, _message);
                                console.log('[database] insert to db each message each messager[' + messagerId + '] ... ');
                                console.log(_message);
                                return new Promise((resolve) => {
                                    appsChatroomsMessagesMdl.insertMessageByAppIdByMessagerId(appId, messagerId, _message, (message) => {
                                        console.log(message);
                                        resolve();
                                    });
                                });
                            }));
                        }));
                    });

                case FACEBOOK:
                    return Promise.all(Object.keys(messagers).map((messagerId) => {
                        return Promise.all(messages.map((message) => {
                            return bot.sendTextMessage(messagerId, message.text).then(() => {
                                let _message = {
                                    from: SYSTEM,
                                    messager_id: '',
                                    text: message.text,
                                    time: Date.now(),
                                    type: 'text'
                                };
                                appsChatroomsMessagesMdl.insertMessageByAppIdByMessagerId(appId, messagerId, _message, (message));
                            });
                        }));
                    }));
            }
            function multicast(messagers, multicasts) {
                return nextPromise(0);
                function nextPromise(i) {
                    if (i >= multicasts.length) {
                        return Promise.resolve();
                    };
                    let messages = multicasts[i].messages;
                    console.log('[multicast] multicast to all messagers in this app[' + appId + '] at most 5 messages ... ');
                    return bot.multicast(messagers, messages).then(() => {
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