module.exports = (function() {
    const admin = require('firebase-admin');
    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    function GroupsMembersModel() {};

    GroupsMembersModel.prototype._schema = function(callback) {
        var json = {
            user_id: '',
            status: 0, // 0 邀請中 ; 1 已加入
            type: READ, // OWNER 群組擁有者 ; ADMIN 群組管理員 ; WRITE 群組可修改 ; READ 群組可查看
            isDeleted: 0,
            updatedTime: Date.now(),
            createdTime: Date.now()
        };
        callback(json);
    };
    GroupsMembersModel.prototype.insert = function(groupId, member, callback) {
        var memberId;
        var userId = member.user_id;
        Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                GroupsMembersModel.prototype._schema((initMember) => {
                    member = Object.assign(initMember, member);
                    resolve(member);
                });
            });
        }).then((member) => {
            return admin.database().ref('groups/' + groupId + '/members').push(member);
        }).then((ref) => {
            memberId = ref.key;
            return admin.database().ref('groups/' + groupId + '/members/' + memberId).once('value');
        }).then((snap) => {
            var member = snap.val();
            if (null === member || undefined === member || '' === member) {
                return Promise.reject();
            }
            return Promise.resolve(member);
        }).then(() => {
            return admin.database().ref('users/' + userId).once('value');
        }).then((snap) => {
            var user = snap.val();
            var groupIds = user.group_ids || [];
            groupIds.push(groupId);
            var _user = {
                group_ids: groupIds,
                updatedTime: Date.now(),
                createdTime: Date.now()
            };
            return admin.database().ref('users/' + userId).update(_user);
        }).then(() => {
            var groupsMembers = {
                [groupId]: {
                    members: {
                        [memberId]: member
                    }
                }
            };
            return Promise.resolve(groupsMembers);
        }).then((groupsMembers) => {
            callback(groupsMembers);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 根據 {groupid}, {memberid|memberids} 回傳 一筆 members 的資料
     * @param {string} groupId
     * @param {string|string[]} memberIds
     * @param {function} callback 
     */
    GroupsMembersModel.prototype.findMembers = function(groupId, memberIds, callback) {


        var members = {};
        Promise.resolve().then(() => {
            if ('string' === typeof groupId && 'string' === typeof memberIds) {
                var memberId = memberIds;
                return admin.database().ref('groups/' + groupId + '/members/' + memberId).once('value').then((snap) => {
                    var member = snap.val();
                    var memberId = member.ref.key;
                    members[memberId] = member;
                    return Promise.resolve(member);
                });
            };
            if ('string' === typeof groupId && memberIds instanceof Array) {
                return Promise.all(memberIds.map((memberId) => {
                    return admin.database().ref('groups/' + groupId + '/members/' + memberId).once('value').then((snap) => {
                        var member = snap.val();
                        if (null === member || undefined === member || '' === member) {
                            return Promise.reject();
                        };
                        var memberId = member.ref.key;
                        members[memberId] = member;
                        return Promise.resolve(member);
                    });
                }));
            };

            if ('string' === typeof groupId && null === memberIds) {
                return admin.database().ref('groups/' + groupId + '/members/').once('value').then((snap) => {
                    members = snap.val();
                    if (null === members || undefined === members || '' === members) {
                        return Promise.reject();
                    };
                    return Promise.resolve();
                });
            };

            return Promise.reject();
        }).then(() => {
            callback(members);
        }).catch(() => {
            callback(null);
        });
    };
    /**
     * 根據 {groupid| groupids} , {memberid} 回傳 一筆或數筆GroupsMembers 的資料
     * @param {string|string[]} groupIds
     * @param {string} memberId 
     * @param {function} callback 
     */
    GroupsMembersModel.prototype.findGroupsMembers = function(groupIds, memberId, callback) {

        var groupsMembers = {};
        Promise.resolve().then(() => {
            if ('string' === typeof groupIds && 'string' === typeof memberId) {
                var groupId = groupIds;
                return admin.database().ref('groups/' + groupId + '/members/' + memberId).orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                    var member = snap.val();
                    if (null === member || undefined === member || '' === member) {
                        return Promise.resolve({});
                    };
                    groupsMembers = {
                        [groupId]: {
                            members: {
                                [memberId]: member
                            }
                        }
                    };
                    return Promise.resolve(groupsMembers);
                });
            };

            if ('string' === typeof groupIds && 'string' !== typeof memberId) {
                groupIds = [groupIds];
            }

            memberId = undefined;
            return Promise.all(groupIds.map((groupId) => {
                return admin.database().ref('groups/' + groupId).orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                    var group = snap.val();
                    if (null === group || undefined === group || '' === group) {
                        return Promise.resolve(null);
                    };
                    groupsMembers[groupId] = group;
                    return Promise.resolve();
                });
            })).then(() => {
                return Promise.resolve(groupsMembers);
            });
        }).then((groupsMembers) => {
            callback(groupsMembers);
        }).catch(() => {
            callback(null);
        });
    };
    GroupsMembersModel.prototype.update = function(groupId, memberId, member, callback) {
        member.updatedTime = Date.now();
        admin.database().ref('groups/' + groupId + '/members/' + memberId).update(member).then(() => {
            return admin.database().ref('groups/' + groupId + '/members/' + memberId).once('value');
        }).then((snap) => {
            var member = snap.val();
            if (null === member || undefined === member || '' === member) {
                return Promise.reject();
            }
            return member;
        }).then((member) => {
            var groupsMembers = {
                [groupId]: {
                    members: {
                        [memberId]: member
                    }
                }
            };
            return Promise.resolve(groupsMembers);
        }).then((groupsMembers) => {
            callback(groupsMembers);
        }).catch(() => {
            callback(null);
        });
    };

    GroupsMembersModel.prototype.remove = function(groupId, memberId, callback) {
        var deletedMember = {
            isDeleted: 1,
            updatedTime: Date.now()
        };

        admin.database().ref('groups/' + groupId + '/members/' + memberId).update(deletedMember).then(() => {
            return admin.database().ref('groups/' + groupId + '/members/' + memberId).once('value');
        }).then((snap) => {
            var member = snap.val();
            if (null === member || undefined === member || '' === member) {
                return Promise.reject();
            }

            var groupsMembers = {
                [groupId]: {
                    members: {
                        [memberId]: member
                    }
                }
            };

            callback(groupsMembers);
        }).catch(() => {
            callback(null);
        });
    };

    return new GroupsMembersModel();
})();