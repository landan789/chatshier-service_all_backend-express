module.exports = (function() {
    const admin = require('firebase-admin');
    const SCHEMA = require('../config/schema');

    const OWNER = 'OWNER';

    function GroupsModel() {};


    GroupsModel.prototype._schema = function(callback) {
        let json = {
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
     * @param {string|null} userId
     * @param {function} callback
     */
    GroupsModel.prototype.find = function(groupIds, userId, callback) {
        // 多行處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };
        let groups = {};
        Promise.all(groupIds.map((groupId) => {
            return admin.database().ref('groups/' + groupId).once('value').then((snap) => {
                let group = snap.val();
                if (null === group || undefined === group || '' === group || 0 !== group.isDeleted) {
                    return Promise.resolve(null);
                };
                let members = group.members;
                let userIds = Object.values(members).map((member) => {
                    // 如果 member 已刪  就不查詢此 group 底下的 app 資料
                    if (0 === member.isDeleted) {
                        return member.user_id;
                    };
                });

                if (0 > userIds.indexOf(userId) && null !== userId) {
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
     *
     * @param {string} userId
     * @param {object} group
     * @param {function} callback
     */
    GroupsModel.prototype.insert = function(userId, group, callback) {
        let groups = {};
        let groupId;
        group = Object.assign(SCHEMA.GROUP, group);
        admin.database().ref('groups/').push(group).then((ref) => {
            groupId = ref.key;
            let member = {
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
            let group = snap.val();
            groups = {
                [groupId]: group
            };
            callback(groups);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 藉由 groupid 修改一組 group
     * @param {string} groupId
     * @param {object} group
     * @param {function} callback
     */
    GroupsModel.prototype.update = function(groupId, group, callback) {
        let groups = {};
        Promise.resolve().then(() => {
            let _group = {
                updatedTime: Date.now()
            };
            group = Object.assign(group, _group);
            return admin.database().ref('groups/' + groupId).update(group);
        }).then(() => {
            return admin.database().ref('groups/' + groupId).once('value');
        }).then((snap) => {
            let group = snap.val();
            groups = {
                [groupId]: group
            };
            return Promise.resolve();
        }).then(() => {
            ('function' === typeof callback) && callback(groups);
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
        });
    };

    /**
     * 根據 groupid|groupid[] 回傳 對應的 appids 的資料
     * @param {string|string[]} groupIds
     * @param {string} userId
     * @param {(appIds: string[]|null) => any} [callback]
     * @returns {Promise<string[]>}
     */
    GroupsModel.prototype.findAppIds = function(groupIds, userId, callback) {
        // 多型處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };

        let _groupIds = groupIds;
        let appIds = {};
        return Promise.resolve().then(() => {
            if (!_groupIds) {
                return;
            }

            return Promise.all(_groupIds.map((groupId) => {
                return admin.database().ref('groups/' + groupId).once('value').then((snap) => {
                    let group = snap.val();

                    if (null === group || undefined === group || '' === group || '' === group.app_ids || undefined === group.app_ids || (group.app_ids instanceof Array && 0 === group.app_ids.length)) {
                        return Promise.resolve(null);
                    };

                    let members = group.members;
                    let userIds = Object.values(members).map((member) => {
                        // 如果 member 已刪除或未啟用 就不查詢此 group 底下的 app 資料
                        if (0 === member.isDeleted && 1 === member.status) {
                            return member.user_id;
                        };
                    });

                    if (0 > userIds.indexOf(userId)) {
                        return Promise.resolve(null);
                    };

                    let _appIds = group.app_ids;
                    _appIds.forEach((appId) => {
                        appIds[appId] = appId;
                    });
                });
            }));
        }).then(() => {
            let _appIds = Object.keys(appIds);
            ('function' === typeof callback) && callback(_appIds);
            return _appIds;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * 根據 groupid|groupid[] 回傳 群組中對應的 使用者 uesrIDs
     * @param {string|string[]} groupIds
     * @param {(userIds: string[]|null) => any} callback
     */
    GroupsModel.prototype.findUserIds = function(groupIds, callback) {
        // 多行處理
        if ('string' === typeof groupIds) {
            groupIds = [groupIds];
        };

        let userIds = [];
        Promise.all(groupIds.map((groupId) => {
            return admin.database().ref('groups/' + groupId + '/members').once('value').then((snap) => {
                let members = snap.val();
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
