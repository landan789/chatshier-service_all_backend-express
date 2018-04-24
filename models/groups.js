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

        /**
         * @param {string[]|string} groupIds
         * @param {string|null} userId
         * @param {(groups: any) => any} [callback]
         */
        find(groupIds, userId, callback) {
            // polymorphism from groupid | groupid[]
            if (!(groupIds instanceof Array)) {
                groupIds = [groupIds];
            };
            let aggregations = [
                {
                    $unwind: '$members'
                }, {
                    $match: {
                        '_id': {
                            $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                        },
                        'isDeleted': false,
                        'members.isDeleted': false
                    }
                }
            ];
            return this.Model.aggregate(aggregations).then((results) => {
                let groups = {};
                if (0 === results.length) {
                    return Promise.resolve(groups);
                }

                let userIds = [];
                groups = results.reduce((output, group) => {
                    output[group._id] = output[group._id] || {
                        name: group.name,
                        createdTime: group.createdTime,
                        updatedTime: group.updatedTime,
                        isDeleted: group.isDeleted,
                        members: {},
                        app_ids: group.app_ids
                    };

                    userIds.push(group.members.user_id);
                    Object.assign(output[group._id].members, this.toObject(group.members));
                    return output;
                }, {});

                if (userId && 0 > userIds.indexOf(userId)) {
                    return Promise.reject(new Error());
                };

                return groups;
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} userId
         * @param {any} postGroup
         * @param {(groups: any) => any} [callback]
         */
        insert(userId, postGroup, callback) {
            let group = new this.Model();
            group.name = postGroup.name;

            // The creator of groups must be the owner of group
            group.members.push({
                status: 1,
                type: OWNER,
                user_id: userId,
                isDeleted: false
            });

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

        /**
         * @param {string} groupId
         * @param {any} putGroup
         * @param {(groups: any) => any} [callback]
         */
        update(groupId, putGroup, callback) {
            putGroup.updatedTime = undefined === putGroup.updatedTime ? Date.now() : putGroup.updatedTime;
            let query = {
                '_id': groupId
            };
            let group = {
                '_id': groupId,
                $set: {}
            };
            for (let prop in putGroup) {
                if (null === putGroup[prop]) {
                    continue;
                }
                group.$set[prop] = putGroup[prop];
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

            let query = {
                '_id': {
                    $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                },
                'isDeleted': false,
                'members.user_id': userId,
                'members.status': true
            };

            let aggregations = [
                {
                    $unwind: '$members'
                }, {
                    $match: query
                }, {
                    $project: {
                        app_ids: true
                    }
                }
            ];

            let apps = {};
            return this.Model.aggregate(aggregations).then((groups) => {
                groups.forEach((group) => {
                    group.app_ids.forEach((appId) => {
                        apps[appId] = true;
                    });
                });
            }).then(() => {
                let appIds = Object.keys(apps);
                ('function' === typeof callback) && callback(appIds);
                return appIds;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string|string[]} groupIds
         * @param {(userIds: string[]) => any} [callback]
         */
        findUserIds(groupIds, callback) {
            // polymorphism to both groupid[] and groupid
            if (groupIds && !(groupIds instanceof Array)) {
                groupIds = [groupIds];
            };

            let query = {
                '_id': {
                    $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                },
                'isDeleted': false,
                'members.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$members'
                }, {
                    $match: query
                }, {
                    $project: {
                        members: true
                    }
                }
            ];

            return this.Model.aggregate(aggregations).then((groupsMembers) => {
                let users = {};
                groupsMembers.forEach((group) => {
                    let members = group.members;
                    users[members.user_id] = members.user_id;
                });
                return Object.keys(users);
            }).then((userIds) => {
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
