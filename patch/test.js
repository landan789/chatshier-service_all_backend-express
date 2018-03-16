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

/**
 * 1. 把 Firebase DB 無縫接軌到 MongoDB
 * 2. 只改變 models/**.js 的行為 ， Controller , Helper 都不改
 * 3. 所有 model 的 method 行為保持一致
 * 4. Mongoose 文件 http://mongoosejs.com/docs/guide.html
 * 5. GroupsModel.model 接上了 mongoose.model(name, schema);
 * 6. 所有 *_ids 的屬性都改為 *_id (如 app_ids -> app_id ), 並且"統一"都為陣列結構. (因為 MongoDB 不能使用 _ids 命名)
 * 7. MongoDB 裡面 sub collection 的結構為陣列, 或許這是好的結構。 但考慮重購原則(一次只改一點，每一次改動都是可用) , 我們應該改由 model 打包跟原本相同的結構
 */