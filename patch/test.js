let groups_mdl = require('../models/groups_.js');
let appsChatroomsMdl = require('../models/apps_chatrooms_.js');
let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers_.js');
let appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages_.js');
let appsComposesMdl = require('../models/apps_composes_.js');
let appsFieldsMdl = require('../models/apps_fields_.js');
let appsTicketsMdl = require('../models/apps_tickets_.js');

let userId = '5aaa2c5a84297108d14b731c';
let groupId = '5aab75f3691cde41d84b0778';
let group = {
    name: '群組名稱',
    app_id: ['11111111', '22222222']
};

let _group = {
    name: '_群組名稱'
};

// groups_mdl.insert(userId, group, (data) => {
//     console.log(JSON.stringify(data, null, 2));
// });

// groups_mdl.find(groupId, userId, (data) => {
//     console.log(JSON.stringify(data, null, 2));
// });

// groups_mdl.update(groupId, _group, (data) => {
// console.log(JSON.stringify(data, null, 2));
// });

// groups_mdl.findAppIds(groupId, userId, (data) => {
// console.log(JSON.stringify(data, null, 2));
// });

// groups_mdl.findUserIds(groupId, (data) => {
// console.log(JSON.stringify(data, null, 2));
// });

function testAppsChatrooms(appId) {
    console.log('--- Test AppsChatrooms Start ---');

    return appsChatroomsMdl.insert(appId).then((inserted) => {
        console.log('--- inserted ---');
        console.log(JSON.stringify(inserted, void 0, 2));
    }).then(() => {
        console.log('--- Test AppsChatrooms End ---');
    });
}

function testAppsChatroomsMessagers(appId, chatroomId) {
    console.log('--- Test AppsChatroomsMessagers Start ---');

    let messagerId1 = appsChatroomsMessagersMdl.Types.ObjectId();
    let messagerId2 = appsChatroomsMessagersMdl.Types.ObjectId();
    return appsChatroomsMessagersMdl.increaseMessagersUnRead(appId, chatroomId, [messagerId1, messagerId2]).then((updated) => {
        console.log('--- unRead updated ---');
        console.log(JSON.stringify(updated, void 0, 2));
    }).then(() => {
        return appsChatroomsMessagersMdl.increaseMessagersUnRead(appId, chatroomId, messagerId1, 2).then((updated) => {
            console.log('--- unRead updated 2 ---');
            console.log(JSON.stringify(updated, void 0, 2));
        });
    }).then(() => {
        return appsChatroomsMessagersMdl.resetMessagerUnRead(appId, chatroomId, messagerId1).then((reseted) => {
            console.log('--- unRead reseted ---');
            console.log(JSON.stringify(reseted, void 0, 2));
        });
    }).then(() => {
        console.log('--- Test AppsChatrooms End ---');
    });
}

function testAppsChatroomsMessages(appId, chatroomId) {
    console.log('--- Test AppsChatroomsMessages Start ---');

    let message = {
        type: 'text',
        text: 'test message'
    };

    return appsChatroomsMessagesMdl.insert(appId, chatroomId, message).then((inserted) => {
        console.log('--- inserted ---');
        console.log(JSON.stringify(inserted, void 0, 2));
    }).then(() => {
        console.log('--- Test AppsChatroomsMessages End ---');
    });
}

function testAppsComposes(appId) {
    console.log('--- Test AppsComposes Start ---');

    let compose = {
        text: 'insert'
    };

    return appsComposesMdl.insert(appId, compose).then((inserted) => {
        console.log('--- inserted ---');
        console.log(JSON.stringify(inserted, void 0, 2));

        let composeId = Object.keys(inserted[appId].composes).shift();
        compose.description = 'update';
        return appsComposesMdl.update(appId, composeId, compose).then((updated) => {
            console.log('--- updated ---');
            console.log(JSON.stringify(updated, void 0, 2));
        }).then(() => {
            return appsComposesMdl.remove(appId, composeId, compose).then((removed) => {
                console.log('--- removed ---');
                console.log(JSON.stringify(removed, void 0, 2));
            });
        }).then(() => {
            return appsComposesMdl.find(appId, composeId).then((found) => {
                console.log('--- found ---');
                console.log(JSON.stringify(found, void 0, 2));
                console.log('--- should be: null ---');
            });
        }).then(() => {
            console.log('--- Test AppsComposes End ---');
        });
    });
}

function testAppsFields(appId) {
    console.log('--- Test AppsFields Start ---');

    let field = {
        description: 'insert'
    };

    return appsFieldsMdl.insert(appId, field).then((inserted) => {
        console.log('--- inserted ---');
        console.log(JSON.stringify(inserted, void 0, 2));

        let fieldId = Object.keys(inserted[appId].tags).shift();
        field.description = 'update';
        return appsFieldsMdl.update(appId, fieldId, field).then((updated) => {
            console.log('--- updated ---');
            console.log(JSON.stringify(updated, void 0, 2));
        }).then(() => {
            return appsFieldsMdl.remove(appId, fieldId, field).then((removed) => {
                console.log('--- removed ---');
                console.log(JSON.stringify(removed, void 0, 2));
            });
        }).then(() => {
            return appsFieldsMdl.find(appId, fieldId).then((found) => {
                console.log('--- found ---');
                console.log(JSON.stringify(found, void 0, 2));
                console.log('--- should be: null ---');
            });
        }).then(() => {
            console.log('--- Test AppsFields End ---');
        });
    });
}

function testAppsTickets(appId) {
    console.log('--- Test AppsTickets Start ---');

    let ticket = {
        description: 'insert'
    };

    return appsTicketsMdl.insert(appId, ticket).then((inserted) => {
        console.log('--- inserted ---');
        console.log(JSON.stringify(inserted, void 0, 2));

        let ticketId = Object.keys(inserted[appId].tickets).shift();
        ticket.description = 'update';
        return appsTicketsMdl.update(appId, ticketId, ticket).then((updated) => {
            console.log('--- updated ---');
            console.log(JSON.stringify(updated, void 0, 2));
        }).then(() => {
            return appsTicketsMdl.remove(appId, ticketId, ticket).then((removed) => {
                console.log('--- removed ---');
                console.log(JSON.stringify(removed, void 0, 2));
            });
        }).then(() => {
            return appsTicketsMdl.find(appId, ticketId).then((found) => {
                console.log('--- found ---');
                console.log(JSON.stringify(found, void 0, 2));
                console.log('--- should be: null ---');
            });
        }).then(() => {
            console.log('--- Test AppsTickets End ---');
        });
    });
}

/**
 * 1. 把 Firebase DB 無縫接軌到 MongoDB
 * 2. 只改變 models/**.js 的行為 ， Controller , Helper 都不改
 * 3. 所有 model 的 method 行為保持一致
 * 4. Mongoose 文件 http://mongoosejs.com/docs/guide.html
 * 5. GroupsModel.model 接上了 mongoose.model(name, schema);
 * 6. 所有 *_ids 的屬性都改為 *_id (如 app_ids -> app_id ), 並且"統一"都為陣列結構. (因為 MongoDB 不能使用 _ids 命名)
 * 7. MongoDB 裡面 sub collection 的結構為陣列, 或許這是好的結構。 但考慮重購原則(一次只改一點，每一次改動都是可用) , 我們應該改由 model 打包跟原本相同的結構
 * 8. 使用 MongoDG 裡面的 schema type 取代 firebase typeless 格式
 */