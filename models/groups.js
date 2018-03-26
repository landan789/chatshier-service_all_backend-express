module.exports = (function() {
    const ModelCore = require('../cores/model');
    const GROUPS = 'groups';
    const OWNER = 'OWNER';

    class GroupsModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(GROUPS, this.GroupsSchema);
            this.project = {
                name: true,
                createdTime: true,
                updatedTime: true,
                isDeleted: true,
                members: true,
                app_ids: true
            };
        }

        find(groupIds, userId, callback) {
            // polymorphism from groupid | groupid[]
            if (!(groupIds instanceof Array)) {
                groupIds = [groupIds];
            };
            return Promise.resolve().then(() => {
                if (!userId) {
                    let aggregations = [
                        {
                            $unwind: '$members'
                        }, {
                            $match: {
                                '_id': {
                                    $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                                },
                                'isDeleted': false,
                                'members.isDeleted': false,
                                'members.status': true
                            }
                        }, {
                            $project: this.project
                        }
                    ];
                    return this.Model.aggregate(aggregations);
                }
                let aggregations = [
                    {
                        $unwind: '$members'
                    }, {
                        $match: {
                            '_id': {
                                $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                            },
                            'isDeleted': false,
                            'members.isDeleted': false,
                            'members.status': true,
                            'members.user_id': userId
                        }
                    }, {
                        $project: this.project
                    }
                ];
                return this.Model.aggregate(aggregations);
            }).then((results) => {
                let groups = {};
                if (0 === results.length) {
                    return Promise.resolve(groups);
                }

                groups = results.reduce((output, group) => {
                    output[group._id] = output[group._id] || {
                        name: group.name,
                        createdTime: group.createdTime,
                        updatedTime: group.updatedTime,
                        isDeleted: group.isDeleted,
                        members: {},
                        app_ids: group.app_ids
                    };
                    Object.assign(output[group._id].members, this.toObject(group.members));
                    return output;
                }, {});
                return groups;
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        insert(userId, postGroup, callback) {
            let group = new this.Model();
            group.name = postGroup.name;

            // The creator of groups must be the owner of group
            group.members[0] = {
                status: 1,
                type: OWNER,
                user_id: userId,
                isDeleted: 0
            };

            return group.save().then((insertedGroup) => {
                let groupId = insertedGroup._id;
                return this.find(groupId, userId);
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        update(groupId, putGroup, callback) {
            putGroup.updatedTime = undefined === putGroup.updatedTime ? Date.now() : putGroup.updatedTime;
            let query = {
                '_id': groupId
            };
            let group = {
                '_id': putGroup
            };
            for (let prop in putGroup) {
                if (null === putGroup[prop]) {
                    continue;
                }
                group.$set['events.$.' + prop] = putGroup[prop];
            }
            return this.Model.update(query, group).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(groupId, null);
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        findAppIds(groupIds, userId, callback) {
            // polymorphism to both groupid[] and groupid
            if (!(groupIds instanceof Array)) {
                groupIds = [groupIds];
            };
            let appIds = {};
            return Promise.all(groupIds.map((groupId) => {
                let query = {
                    '_id': groupId,
                    'members.user_id': userId,
                    'members.isDeleted': false,
                    'members.status': true
                };
                return this.Model.findOne(query).then((group) => {
                    let _appIds = group.app_ids;
                    while (0 < _appIds.length) {
                        let appId = _appIds.pop();
                        appIds[appId] = appId;
                    };
                    return Promise.resolve();
                });
            })).then(() => {
                appIds = Object.keys(appIds);
                ('function' === typeof callback) && callback(appIds);
                return appIds;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        findUserIds(groupIds, callback) {
            // polymorphism to both groupid[] and groupid
            if (!(groupIds instanceof Array)) {
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
                return userIds;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new GroupsModel();
})();
