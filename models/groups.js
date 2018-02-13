module.exports = (function() {
    const admin = require('firebase-admin');
    const SCHEMA = require('../config/schema');

    const OWNER = 'OWNER';

    function GroupsModel() {};


    GroupsModel.prototype._schema = function(callback) {
        var json = {
            app_ids: '',
            name: 'GROUP',
            isDeleted: 0,
            members: '',
            updatedTime: Date.now(),
            createdTime: Date.now()
        };
        callback(json);
    };
    /**
     * 根據 groupid|groupid[] 回傳 Groups 的資料
     * @param {string|string[]} groupIds
     * @param {function} callback
     */
    GroupsModel.prototype.findGroups = function(groupIds, userId, callback) {
        // 多行處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };
        var groups = {};
        Promise.all(groupIds.map((groupId) => {
            return admin.database().ref('groups/' + groupId).once('value').then((snap) => {
                var group = snap.val();
                if (null === group || undefined === group || '' === group || 0 !== group.isDeleted) {
                    return Promise.resolve(null);
                };
                var members = group.members;
                var userIds = Object.values(members).map((member) => {
                    // 如果 member 已刪  就不查詢此 group 底下的 app 資料
                    if (0 === member.isDeleted) {
                        return member.user_id;
                    };
                });

                if (0 > userIds.indexOf(userId)) {
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

    /**
     * 在某一個 user 之中 新增一筆 group，並指派為 owner
     * @param {userId} userId
     * @param {object} group 
     * @param {function} callback 
     */
    GroupsModel.prototype.insert = function(userId, group, callback) {
        var groups = {};
        var groupId;
        group = Object.assign(SCHEMA.GROUP, group);
        admin.database().ref('groups/').push(group).then((ref) => {
            groupId = ref.key;
        }).then(() => {
            var member = {
                updatedTime: Date.now(),
                createdTime: Date.now(),
                status: 1,
                type: OWNER,
                user_id: userId
            };
            member = Object.assign(SCHEMA.GROUP_MEMBER, member);
            return admin.database().ref('groups/' + groupId + '/members').push(member);
        }).then((ref) => {
            return admin.database().ref('groups/' + groupId).once('value');
        }).then((snap) => {
            var group = snap.val();
            groups = {
                [groupId]: group
            };
            return Promise.resolve();
        }).then(() => {
            callback(groups);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 藉由 groupid 修改一組 group
     * @param {groupId} groupId
     * @param {object} group 
     * @param {function} callback 
     */
    GroupsModel.prototype.update = function(groupId, group, callback) {

        var groups = {};
        Promise.resolve().then(() => {
            var _group = {
                updatedTime: Date.now()
            };
            group = Object.assign(group, _group);
            return admin.database().ref('groups/' + groupId).update(group);
        }).then(() => {
            return admin.database().ref('groups/' + groupId).once('value');
        }).then((snap) => {
            var group = snap.val();
            groups = {
                [groupId]: group
            };
            return Promise.resolve();
        }).then(() => {
            callback(groups);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 groupid|groupid[] 回傳 對應的 appids 的資料
     * @param {string|string[]} groupIds 
     * @param {(appIds: []) => any} callback
     * @returns {void}
     */
    GroupsModel.prototype.findAppIds = function(groupIds, userId, callback) {
        // 多型處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };
        var appIds = {};
        Promise.resolve().then(() => {
            if (null === groupIds || undefined === groupIds) {
                return Promise.resolve();
            }
            return Promise.all(groupIds.map((groupId) => {
                if (null === groupId || undefined === groupId) {
                    return Promise.resolve();
                }
                return admin.database().ref('groups/' + groupId).once('value').then((snap) => {
                    var group = snap.val();

                    if (null === group || undefined === group || '' === group || '' === group.app_ids || undefined === group.app_ids || (group.app_ids instanceof Array && 0 === group.app_ids.length)) {
                        return Promise.resolve(null);
                    };

                    var members = group.members;
                    var userIds = Object.values(members).map((member) => {
                        // 如果 member 已刪除或未啟用 就不查詢此 group 底下的 app 資料
                        if (0 === member.isDeleted && 1 === member.status) {
                            return member.user_id;
                        };
                    });

                    if (0 > userIds.indexOf(userId)) {
                        return Promise.resolve(null);
                    };

                    var _appIds = group.app_ids;
                    _appIds.forEach((appId) => {
                        appIds[appId] = appId;
                    });
                    return Promise.resolve();
                });
            }));
        }).then(() => {
            appIds = Object.keys(appIds);
            callback(appIds);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 groupid|groupid[] 回傳 群組中對應的 使用者 uesrIDs
     * @param {string|string[]} groupIds
     * @param {(userIds: string[]) => any} callback
     */
    GroupsModel.prototype.findUserIds = function(groupIds, callback) {
        // 多行處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };

        let userIds = [];
        Promise.all(groupIds.map((groupId) => {
            return admin.database().ref('groups/' + groupId + '/members').once('value').then((snap) => {
                var members = snap.val();
                if (!members) {
                    return null;
                };

                for (let memberId in members) {
                    let member = members[memberId];
                    let userId = member.user_id;
                    userId && userIds.push(userId);
                };
            });
        })).then(() => {
            callback(userIds);
        }).catch(() => {
            callback(null);
        });
    };
    return new GroupsModel();
})();
