var schedule = require('node-schedule');
const line = require('@line/bot-sdk');
var admin = require('firebase-admin');
var serviceAccount = require('./config/firebase-adminsdk');
var databaseURL = require('./config/firebase_admin_database_url');

var agents = require('./models/agents');
var appsComposes = require('./models/apps_composes');
var appsAutorepliesMdl = require('./models/apps_autoreplies');
var linetemplate = require('./models/linetemplate');
var chats = require('./models/chats');
var appsKeywordrepliesMdl = require('./models/apps_keywordreplies');
var users = require('./models/users');

var apiModel = require('./models/apiai');
var utility = require('./helpers/utility');
var webhookMdl = require('./models/webhooks');
var appsMdl = require('./models/apps');
var appsChatroomsMessagesMdl = require('./models/apps_chatrooms_messages');
var appsChatrooms = require('./models/apps_chatrooms');
var appsMessengersMdl = require('./models/apps_messagers');
var groupsMdl = require('./models/groups');
var appsMessagesMdl = require('./models/apps_messages');
var appsTemplatesMdl = require('./models/apps_templates');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});


var times = [];

for (let i = 0; i < 60; i++) {
    times.push(i);
}

var rule1 = new schedule.RecurrenceRule();
rule1.minute = times;

var job1 = schedule.scheduleJob(rule1, function() {
    var timeInMs = ISODateTimeString(new Date());
    console.log('running')
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('apps').once('value', (snap) => {
                let apps = snap.val();
                if (!apps) {
                    reject();
                    return;
                }
                resolve(apps);
            });
        })
    }).then((apps) => {
        return new Promise((resolve, reject) => {
            let messages = [];
            let proceed = new Promise((resolve, reject) => {
                resolve();
            });
            for (let appId in apps) {
                let composes = apps[appId].composes === undefined ? '' : apps[appId].composes;
                let messagers = Object.keys(apps[appId].messagers === undefined ? '' : apps[appId].messagers);
                var lineConfig = {
                    channelSecret: apps[appId].secret,
                    channelAccessToken: apps[appId].token1
                };
                for (let composesId in composes) {
                    let time = ISODateTimeString(composes[composesId].time);
                    let status = composes[composesId].status;
                    if (status === 1) {
                        var lineBot = new line.Client(lineConfig);
                        if (time.match(timeInMs)) {
                            let message = {
                                "type": composes[composesId].type,
                                "text": composes[composesId].text
                            }
                            messages.push(message);
                        }
                    }
                }
                proceed.then(() => {
                    return new Promise((resolve, reject) => {
                        lineBot.multicast(messagers, messages);
                        resolve();
                    })
                }).then(() => {
                    let asyncTask = [];
                    for (let i in messagers) {
                        let messagersId = [];
                        messagersId = messagers[i];
                        asyncTask.push(admin.database().ref('apps/' + appId + '/messagers/' + messagersId).once('value').then((snap) => {
                            let messagersInfo = snap.val();
                            let chatroomId = messagersInfo.chatroom_id;
                            return chatroomId;
                            if (!messagersInfo) {
                                reject();
                                return;
                            }
                            return Promise.all(asyncTask);
                        }).then((chatroomId) => {
                            let messageInfo = {};
                            let updateMessages = [];
                            for (let j in messages) {
                                messageInfo = {
                                    from: 'SYSTEM',
                                    messager_id: '',
                                    name: 'agent',
                                    text: messages[j].text,
                                    time: Date.now()
                                }
                                updateMessages.push(messageInfo);
                                admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages').push().then((ref) => {
                                    var messageId = ref.key;
                                    return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messages/' + messageId).update(updateMessages[j]);
                                })
                            }
                        }))
                    }

                })




            }
            resolve();
        })
    }).catch(() => {
        callback(null);
    });

});
// all composes
function ISODateTimeString(d) {
    d = new Date(d);

    function pad(n) { return n < 10 ? '0' + n : n }
    return d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes());
}