module.exports = (function() {
    const admin = require('firebase-admin');

    function GroupsModel() {};

    /**
     * 根據 groupid|groupid[] 回傳 Groups 的資料
     * @param {string|string[]} groupIds 
     * @param {function} callback 
     */
    GroupsModel.prototype.findGroups = function(groupIds, callback) {
        // 多行處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };
        var groups = {};
        Promise.all(groupIds.map((groupId) => {
            return admin.database().ref('groups/' + groupId).then((snap) => {
                var group = snap.val();
                if (null === group || undefined === group || '' === group) {
                    return Promise.resolve(null);
                };
                groups[groupId] = group;
                return Promise.resolve(group);
            });
        })).then(() => {
            callback(groups);
        }).catch(() => {
            callback(null);
        });

    };

    return new GroupsModel();
})();