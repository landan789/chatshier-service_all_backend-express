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

        find(groupIds, memberId, callback) {
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
                        'members._id': this.Types.ObjectId(memberId),
                        'members.isDeleted': false
                    }
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
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return Promise.resolve(groups);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        findMembers(groupId, memberIds, isDeleted = false, status = true, callback) {
            if (memberIds && !(memberIds instanceof Array)) {
                memberIds = [memberIds];
            };

            let query = {
                '_id': this.Types.ObjectId(groupId),
                'isDeleted': false
            };

            if (memberIds instanceof Array) {
                query['members._id'] = {
                    $in: memberIds.map((memberId) => this.Types.ObjectId(memberId))
                };
            }

            query['members.isDeleted'] = {
                $in: [true, false]
            };

            if ('boolean' === typeof isDeleted) {
                query['members.isDeleted'] = {
                    $eq: isDeleted
                };
            }

            query['members.status'] = {
                $in: [true, false]
            };

            if ('boolean' === typeof status) {
                query['members.status'] = {
                    $eq: status
                };
            }

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

        insert(groupId, postMember, callback) {
            let userId = postMember.user_id;
            let memberId = this.Types.ObjectId();
            postMember._id = memberId;

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
                    return this.find(groupId, memberId);
                });
            }).then((groups) => {
                ('function' === typeof callback) && callback(groups);
                return groups;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        update(groupId, memberId, putMember, callback) {
            let query = {
                '_id': groupId,
                'members._id': memberId
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
            return this.GroupsModel.update(query, member).then((result) => {
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

        remove(groupId, memberId, callback) {
            let query = {
                '_id': groupId,
                'members._id': memberId
            };
            let setMember = {
                $set: {
                    'members.$.isDeleted': true
                }
            };
            return this.GroupsModel.update(query, setMember).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let aggregations = [
                    {
                        $unwind: '$members'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(groupId),
                            'members._id': this.Types.ObjectId(memberId)
                        }
                    }, {
                        $project: {
                            members: 1
                        }
                    }
                ];

                return this.GroupsModel.aggregate(aggregations);
            }).then((results) => {
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
