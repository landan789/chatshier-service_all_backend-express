const mongoose = require('mongoose');
const appsMdl = require('../models/apps');
const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
const groupsMdl = require('../models/groups');

console.log('[START] start checking messagers of chatroom for correct group members');
appsMdl.find().then((apps) => {
    if (!apps) {
        return Promise.resolve();
    }

    let appIds = Object.keys(apps);
    let nextApps = (i) => {
        if (i >= appIds.length) {
            return Promise.resolve();
        }

        let appId = appIds[i];
        let app = apps[appId];
        let groupId = app.group_id;

        return Promise.all([
            groupsMdl.find(groupId),
            appsChatroomsMessagersMdl.find(appId, void 0, void 0, 'CHATSHIER')
        ]).then(([ groups, appsChatroomsMessagers ]) => {
            if (!(groups && groups[groupId])) {
                return Promise.resolve([]);
            }

            if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                return Promise.resolve([]);
            }

            let groupMembers = groups[groupId].members;
            let memberUserIds = Object.keys(groupMembers).filter((memberId) => {
                return groups[groupId].members[memberId].status;
            }).map((memberId) => {
                return groups[groupId].members[memberId].user_id;
            });
            let chatrooms = appsChatroomsMessagers[appId].chatrooms;

            return Promise.all(Object.keys(chatrooms).map((chatroomId) => {
                let messagers = chatrooms[chatroomId].messagers;

                return Promise.all(Object.keys(messagers).map((messagerId) => {
                    let memberUserId = messagers[messagerId].platformUid;
                    if (memberUserIds.includes(memberUserId)) {
                        return Promise.resolve(null);
                    }

                    console.log('[INFO] remove messager "' + messagerId + '" of user "' + memberUserId + '" in chatroom "' + chatroomId + '"');
                    return appsChatroomsMessagersMdl.remove(appId, chatroomId, memberUserId);
                }));
            }));
        }).then(() => {
            return nextApps(i + 1);
        });
    };
    return nextApps(0);
}).catch((err) => {
    console.error(err);
}).then(() => {
    console.log('[END] finish checking');
    return mongoose.disconnect();
});
