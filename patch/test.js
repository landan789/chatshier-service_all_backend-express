let groups_mdl = require('../models/groups_.js');

let userId = '5aaa2c5a84297108d14b731c';
let groupId = '5aab75f3691cde41d84b0778';
let group = {
    name: '群組名稱',
    app_id: ['11111111', '22222222']
};

let _group = {
    name: '_群組名稱'
};

groups_mdl.insert(userId, group, (data) => {
    console.log(data);
});

// groups_mdl.find(groupId, userId, (data) => {
//     console.log(data);
// });

// groups_mdl.update(groupId, _group, (data) => {
//     console.log(data);
// });

// groups_mdl.findAppIds(groupId, userId, (data) => {
//     console.log(data);
// });

// groups_mdl.findUserIds(groupId, (data) => {
//     console.log(data);
// });