module.exports = (function() {
    let ModelCore = require('../cores/model');
    let COLLECTION = 'groups';
    const OWNER = 'OWNER';
    class GroupsModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(COLLECTION, this.GroupSchema);
        }
        find(groupIds, userId, callback) {
            let groups = {};
            // polymorphism from groupid | groupid[]
            if ('string' === typeof groupIds) {
                groupIds = [groupIds];
            };
            return Promise.all(groupIds.map((groupId) => {
                let query = {
                    '_id': groupId,
                    'isDeleted': false,
                    'members.isDeleted': false,
                    'members.status': true,
                    'members.user_id': userId
                };
                return this.Model.findOne(query).then((group) => {
                    console.log(group);
                    let members = {};
                    let _members = group.members;
                    while (0 < _members.length) {
                        let member = _members.pop();
                        members[member._id] = member;
                    };
                    let _group = {
                        createdTime: group.createdTime,
                        updatedTime: group.updatedTime,
                        isDeleted: group.isDeleted,
                        members: members,
                        name: group.name
                    };
                    groups[group._id] = _group;
                });
            })).then(() => {
                ('function' === typeof callback) && callback(groups);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
            });
        }

        insert(userId, group, callback) {
            let groups = {};
            let groupId;

            let _group = new this.Model();
            _group.app_id = group.app_id;
            _group.name = group.name;

            // The creator of groups must be the owner of group
            _group.members[0] = {
                status: 1,
                type: OWNER,
                user_id: userId,
                isDeleted: 0
            };

            return _group.save().then((__group) => {
                let query = {
                    '_id': __group._id
                };
                return this.Model.findOne(query);
            }).then((group) => {
                let members = {};
                let _members = group.members;
                while (0 < _members.length) {
                    let member = _members.pop();
                    let __members = {
                        [member._id]: member
                    };
                    Object.assign(members, __members);
                };
                group.members = members;
                groups[group._id] = group;
            }).then(() => {
                ('function' === typeof callback) && callback(groups);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
            });
        }

        update(groupId, group, callback) {
            let query = {
                '_id': groupId
            };
            let groups = {};
            return this.Model.update(query, {
                $set: group
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.Model.findOne(query);
            }).then((group) => {
                groups = {
                    [group._id]: group
                };
                ('function' === typeof callback) && callback(groups);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
            });
        }

        findAppIds(groupIds, userId, callback) {
            // polymorphism to both groupid[] and groupid
            if ('string' === typeof groupIds) {
                groupIds = [groupIds];
            };
            let appIds = {};
            return Promise.all(groupIds.map((groupId) => {
                let query = {
                    '_id': groupId,
                    'members.user_id': userId,
                    'members.isDeleted': 0,
                    'members.status': 1
                };
                return this.Model.findOne(query).then((group) => {
                    let _appIds = group.app_id;
                    while (0 < _appIds.length) {
                        let appId = _appIds.pop();
                        appIds[appId] = appId;
                    };
                    return Promise.resolve();
                });
            })).then(() => {
                appIds = Object.keys(appIds);

                ('function' === typeof callback) && callback(appIds);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
            });
        }

        findUserIds(groupIds, callback) {
            // polymorphism to both groupid[] and groupid
            if ('string' === typeof groupIds) {
                groupIds = [groupIds];
            };
            let userIds = {};
            return Promise.all(groupIds.map((groupId) => {
                let query = {
                    '_id': groupId
                };
                return this.Model.findOne(query).then((group) => {
                    let members = group.members;
                    members.map((member) => {
                        let _userIds = member.user_id;
                        if ('string' === typeof _userIds) {
                            _userIds = [_userIds];
                        };
                        _userIds.map((userId) => {
                            userIds[userId] = userId;
                        });
                    });
                });
            })).then(() => {
                userIds = Object.keys(userIds);
                ('function' === typeof callback) && callback(userIds);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
            });
        }
    }
    return new GroupsModel();
})();
