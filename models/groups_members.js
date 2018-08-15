module.exports = (function() {
    let ModelCore = require('../cores/model');
    const USERS = 'users';
    const GROUPS = 'groups';
    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    class GroupsMembersModel extends ModelCore {
        constructor() {
            super();
            this.UsersModel = this.model(USERS, this.UsersSchema);
            this.GroupsModel = this.model(GROUPS, this.GroupsSchema);
        }

        /**
         * @param {string | string[]} groupIds
         * @param {string} [memberId]
         * @param {(groupsMembers: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
         */
        find(groupIds, memberId, callback) {
            // polymorphism from groupid | groupid[]
            if (!(groupIds instanceof Array)) {
                groupIds = [groupIds];
            }

            let aggregations = [{
                $unwind: '$members'
            }, {
                $match: {
                    '_id': {
                        $in: groupIds.map((groupId) => this.Types.ObjectId(groupId))
                    },
                    'isDeleted': false,
                    'members._id': this.Types.ObjectId(memberId),
                    'members.isDeleted': false
                }
            }, {
                $project: {
                    members: 1
                }
            }, {
                $sort: {
                    'members.createdTime': -1 // 最晚建立的在最前頭
                }
            }];

            return this.GroupsModel.aggregate(aggregations).then((results) => {
                let groupsMembers = {};
                if (0 === results.length) {
                    return Promise.resolve(groupsMembers);
                }

                groupsMembers = results.reduce((output, group) => {
                    output[group._id] = output[group._id] || {members: {}};
                    Object.assign(output[group._id].members, this.toObject(group.members));
                    return output;
                }, {});
                return groupsMembers;
            }).then((groupsMembers) => {
                ('function' === typeof callback) && callback(groupsMembers);
                return Promise.resolve(groupsMembers);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 根據 groupId 找到 members
         *
         * @param {string} groupId
         * @param {string | string[]} [memberIds]
         * @param {boolean|null} [isDeleted=false]
         * @param {boolean} [status]
         * @param {(members: Chatshier.Models.GroupMembers | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.GroupMembers | null>}
         */
        findMembers(groupId, memberIds, isDeleted = false, status, callback) {
            if (memberIds && !(memberIds instanceof Array)) {
                memberIds = [memberIds];
            }

            let match = {
                '_id': this.Types.ObjectId(groupId),
                'isDeleted': false
            };

            if (memberIds instanceof Array) {
                match['members._id'] = {
                    $in: memberIds.map((memberId) => this.Types.ObjectId(memberId))
                };
            }

            if ('boolean' === typeof isDeleted) {
                match['members.isDeleted'] = {
                    $eq: isDeleted
                };
            }

            if ('boolean' === typeof status) {
                match['members.status'] = {
                    $eq: status
                };
            }

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
            return this.GroupsModel.aggregate(aggregations).then((results) => {
                let members = {};
                if (0 === results.length) {
                    return Promise.resolve(members);
                }

                members = results.reduce((output, group) => {
                    Object.assign(output, this.toObject(group.members));
                    return output;
                }, {});
                return members;
            }).then((members) => {
                ('function' === typeof callback) && callback(members);
                return Promise.resolve(members);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} groupId
         * @param {any} postMember
         * @param {(groupMembers: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
         */
        insert(groupId, postMember, callback) {
            let userId = postMember.user_id;
            let memberId = this.Types.ObjectId();
            postMember._id = memberId;
            postMember.createdTime = postMember.updatedTime = Date.now();

            let groupQuery = {
                '_id': groupId
            };

            let group = {
                '_id': groupId,
                $push: {
                    members: postMember
                }
            };
            return this.GroupsModel.update(groupQuery, group).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.UsersModel.findById(userId).then((user) => {
                    if (!user) {
                        return Promise.reject(new Error());
                    }
                    let groupIds = user.group_ids || [];
                    groupIds.push(groupId);
                    user.updatedTime = Date.now();
                    return user.save();
                }).then((user) => {
                    if (!user) {
                        return Promise.reject(new Error());
                    }
                    return this.find(groupId, memberId.toHexString());
                });
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
         * @param {string} memberId
         * @param {any} putMember
         * @param {(groupMembers: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
         */
        update(groupId, memberId, putMember, callback) {
            putMember = putMember || {};
            putMember.updatedTime = Date.now();

            let conditions = {
                '_id': this.Types.ObjectId(groupId),
                'members._id': this.Types.ObjectId(memberId)
            };

            let member = {
                $set: {
                    'members.$._id': memberId
                }
            };

            for (let prop in putMember) {
                if (null === putMember[prop] || undefined === putMember[prop]) {
                    continue;
                }
                member.$set['members.$.' + prop] = putMember[prop];
            }

            return this.GroupsModel.update(conditions, member).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.find(groupId, memberId);
            }).then((members) => {
                ('function' === typeof callback) && callback(members);
                return members;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} groupId
         * @param {string} memberId
         * @param {(groupMembers: Chatshier.Models.Groups | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Groups | null>}
         */
        remove(groupId, memberId, callback) {
            let conditions = {
                '_id': this.Types.ObjectId(groupId),
                'members._id': this.Types.ObjectId(memberId)
            };

            let setMember = {
                $set: {
                    'members.$.isDeleted': true,
                    'members.$.updatedTime': Date.now()
                }
            };

            return this.GroupsModel.update(conditions, setMember).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$members'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            members: 1
                        }
                    }
                ];

                return this.GroupsModel.aggregate(aggregations).then((results) => {
                    let groups = {};
                    if (0 === results.length) {
                        return Promise.resolve(groups);
                    }

                    groups = results.reduce((output, group) => {
                        output[group._id] = output[group._id] || {members: {}};
                        Object.assign(output[group._id].members, this.toObject(group.members));
                        return output;
                    }, {});
                    return groups;
                });
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new GroupsMembersModel();
})();
