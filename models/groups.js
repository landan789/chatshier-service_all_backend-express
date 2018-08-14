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
         * @param {string | string[]} groupIds
         * @param {string} [userId]
         * @param {(groups: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
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
                }, {
                    $sort: {
                        'createdTime': -1 // 最晚建立的在最前頭
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
         * @param {string | string[]} groupIds
         * @param {string} userId
         * @param {(groups: string[] | null) => any} [callback]
         * @returns {Promise<string[] | null>}
         */
        findAppIds(groupIds, userId, callback) {
            // polymorphism to both groupid[] and groupid
            if (!(groupIds instanceof Array)) {
                groupIds = [groupIds];
            };

            let match = {
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
                    $match: match
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
         * @param {string | string[]} groupIds
         * @param {boolean} [includeAny=false]
         * @param {(userIds: string[] | null) => any} [callback]
         * @returns {Promise<string[] | null>}
         */
        findUserIds(groupIds, includeAny, callback) {
            includeAny = !!includeAny;

            // polymorphism to both groupid[] and groupid
            if (!(groupIds instanceof Array)) {
                groupIds = [groupIds];
            };

            let match = {
                '_id': {
                    $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                },
                'isDeleted': false
            };
            !includeAny && (match['members.isDeleted'] = false);

            let aggregations = [
                {
                    $unwind: '$members'
                }, {
                    $match: match
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

        /**
         * @param {string} userId
         * @param {any} postGroup
         * @param {(groups: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
         */
        insert(userId, postGroup, callback) {
            let group = new this.Model();
            group.name = postGroup.name;
            group.createdTime = group.updatedTime = Date.now();

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
         * @param {(groups: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
         */
        update(groupId, putGroup, callback) {
            putGroup = putGroup || {};
            putGroup.updatedTime = Date.now();

            let match = {
                '_id': this.Types.ObjectId(groupId)
            };

            let group = { $set: {} };
            for (let prop in putGroup) {
                group.$set[prop] = putGroup[prop];
            }

            return this.Model.update(match, group).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(groupId);
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new GroupsModel();
})();
