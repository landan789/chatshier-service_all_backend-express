module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const CHATSHIER = 'CHATSHIER';

    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');
    let groupsMembersMdl = require('../models/groups_members');

    class GroupsMembersController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            let userId = req.params.userid;
            let groupId = req.params.groupid;

            let proceed = Promise.resolve();
            proceed.then(() => {
                if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                };

                if ('' === req.params.groupid || undefined === req.params.groupid || null === req.params.groupid) {
                    return Promise.reject(ERROR.GROUPID_WAS_EMPTY);
                };

                return new Promise((resolve, reject) => {
                    usersMdl.find(userId, void 0, (users) => {
                        if (!users) {
                            reject(ERROR.USER_FAILED_TO_FIND);
                            return;
                        }
                        resolve(users[userId]);
                    });
                });
            }).then((user) => {
                let groupIds = user.group_ids;
                let index = groupIds.indexOf(groupId);
                if (0 > index) {
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                }

                return new Promise((resolve, reject) => {
                    groupsMembersMdl.find(groupIds, void 0, (groupsMembers) => {
                        if (!groupsMembers) {
                            reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                            return;
                        }
                        resolve(groupsMembers);
                    });
                });
            }).then((groupsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: groupsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res, next) {
            let userId = req.params.userid;
            let groupId = req.params.groupid;
            let memberUser;

            let postMember = {
                user_id: req.body.userid || '',
                status: false, // false 邀請中 ; true 已加入
                type: 0 <= [OWNER, ADMIN, WRITE, READ].indexOf(req.body.type) ? req.body.type : READ // OWNER 群組擁有者 ; ADMIN 群組管理員 ; WRITE 群組可修改 ; READ 群組可查看
            };
            let proceed = Promise.resolve();

            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    if (!userId) {
                        return reject(ERROR.USERID_WAS_EMPTY);
                    } else if (!groupId) {
                        return reject(ERROR.GROUPID_WAS_EMPTY);
                    };

                    usersMdl.find(postMember.user_id, void 0, (users) => {
                        if (!(users && users[postMember.user_id])) {
                            // 不存在的 user 無法加入 群組
                            return reject(ERROR.USER_FAILED_TO_FIND);
                        }
                        memberUser = users[postMember.user_id];
                        resolve();
                    });
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    usersMdl.find(userId, void 0, (users) => {
                        if (!(users && users[userId])) {
                            reject(ERROR.USER_FAILED_TO_FIND);
                            return;
                        }
                        resolve(users[userId]);
                    });
                });
            }).then((user) => {
                let groupIds = user.group_ids;
                if (0 > groupIds.indexOf(groupId)) {
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                }

                return groupsMembersMdl.findMembers(groupId, void 0, null).then((members) => {
                    if (!members || (members && 0 === Object.keys(members).length)) {
                        return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(members);
                });
            }).then((members) => {
                // 該群組下的所有使用者 IDs
                let userIds = Object.values(members).map((member) => {
                    let userId = member.user_id;
                    return userId;
                });
                let paramsIndex = userIds.indexOf(req.params.userid);
                let paramsMemberId = Object.keys(members)[paramsIndex];
                let paramsMember = members[paramsMemberId];

                let bodyIndex = userIds.indexOf(req.body.userid);
                let bodyMemberId = Object.keys(members)[bodyIndex];
                let bodyMember = members[bodyMemberId];

                if (0 <= bodyIndex && !bodyMember.isDeleted && bodyMember.status) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_ALREADY_IN_THIS_GROUP);
                }

                if (0 <= bodyIndex && !bodyMember.isDeleted && !bodyMember.status) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                }

                if (WRITE === paramsMember.type || READ === paramsMember.type) {
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_INSERT_MEMBER);
                }

                if (0 <= bodyIndex && bodyMember.isDeleted) {
                    postMember.isDeleted = false;
                    postMember.status = false; // group member must be status false (not active) when we insert him or her again

                    return groupsMembersMdl.update(groupId, bodyMemberId, postMember).then((groupsMembers) => {
                        if (!groupsMembers || (groupsMembers && 0 === Object.keys(groupsMembers).length)) {
                            return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_UPDATE);
                        }
                        return Promise.resolve(groupsMembers);
                    }).then((groupsMembers) => {
                        let userGroupIds = memberUser.group_ids;
                        let index = userGroupIds.indexOf(groupId);
                        if (0 <= index) {
                            return Promise.resolve(null);
                        }

                        let groupIds = memberUser.group_ids;
                        if (groupIds.includes(groupId)) {
                            return groupsMembers;
                        }

                        groupIds.push(groupId);
                        let putMemberUser = {
                            group_ids: groupIds
                        };

                        return usersMdl.update(req.body.userid, putMemberUser).then((users) => {
                            if (!(users && users[req.body.userid])) {
                                return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_UPDATE);
                            }
                            return Promise.resolve(users);
                        }).then(() => {
                            return groupsMembers;
                        });
                    });
                }

                return groupsMembersMdl.insert(groupId, postMember).then((groupsMembers) => {
                    if (!(groupsMembers && groupsMembers[groupId])) {
                        return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(groupsMembers);
                });
            }).then((groupsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: groupsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let userId = req.params.userid;
            let groupId = req.params.groupid;
            let memberId = req.params.memberid;

            let putMember = {};
            if (undefined !== req.body.status) {
                putMember.status = !!req.body.status; // false 邀請中 ; true 已加入
            }
            if (undefined !== req.body.type && 0 <= [OWNER, ADMIN, WRITE, READ].indexOf(req.body.type)) {
                putMember.type = req.body.type;
            }

            // 前端未填入的訊息，不覆蓋
            for (let key in putMember) {
                if (null === putMember[key]) {
                    delete putMember[key];
                }
            }
            let proceed = Promise.resolve();

            proceed.then(() => {
                if ('' === userId || undefined === userId || null === userId) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                }

                if ('' === groupId || undefined === groupId || null === groupId) {
                    return Promise.reject(ERROR.GROUPID_WAS_EMPTY);
                }

                if ('' === memberId || undefined === memberId || null === memberId) {
                    return Promise.reject(ERROR.MEMBERID_WAS_EMPTY);
                }

                if (0 === Object.keys(putMember).length) {
                    return Promise.reject(ERROR.INVALID_REQUEST_BODY_DATA);
                }

                return new Promise((resolve, reject) => {
                    let userId = req.params.userid;
                    usersMdl.find(userId, void 0, (users) => {
                        if (!users) {
                            reject(ERROR.USER_FAILED_TO_FIND);
                            return;
                        }
                        resolve(users[userId]);
                    });
                });
            }).then((user) => {
                let groupIds = user.group_ids;
                let index = groupIds.indexOf(groupId);
                if (0 > index) {
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                }

                return groupsMembersMdl.findMembers(groupId).then((members) => {
                    if (!members || (members && 0 === Object.keys(members).length)) {
                        return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(members);
                });
            }).then((members) => {
                // 該群組下的所有使用者 IDs
                let groupOwner;
                let userIds = Object.values(members).map((member) => {
                    let userId = member.user_id;
                    if (OWNER === member.type) {
                        groupOwner = member;
                    }
                    return userId;
                });
                let index = userIds.indexOf(req.params.userid);

                if (0 > index) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_REMOVED_FROM_THIS_GROUP);
                }
                let _memberId = Object.keys(members)[index];
                // member 當下使用者所對應到的 member 在 該 group 中
                let member = members[_memberId];
                if (putMember.status && _memberId !== memberId) {
                    // 當下使用者只能改變自己的 member.status 狀態，回應邀請
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_STATUS);
                };

                if (OWNER === putMember.type && OWNER === member.type) {
                    // 只有當下使用者為 OWNER 無法使其他成員成為 OWNER
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
                }

                if (OWNER === putMember.type && ADMIN === member.type) {
                    // 當下使用者為 ADMIN 無法修改成員為 OWNER
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
                }

                if (putMember.type && READ === member.type) {
                    // 當下使用者為 READ 不能 修改 成員的 權限狀態
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
                }

                if (putMember.type && WRITE === member.type) {
                    // 當下使用者為 WRITE 不能夠 修改 成員的 權限狀態
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
                }

                return new Promise((resolve, reject) => {
                    groupsMembersMdl.update(groupId, memberId, putMember, (groupsMembers) => {
                        if (!groupsMembers) {
                            reject(ERROR.GROUP_MEMBER_FAILED_TO_UPDATE);
                            return;
                        };
                        resolve(groupsMembers);
                    });
                }).then((groupsMembers) => {
                    let member = groupsMembers[groupId].members[memberId];
                    let memberUserId = member.user_id;
                    let ownerUserId = groupOwner.user_id;

                    // 有更新 member 的 status 的話且更新為已加入的話
                    // 抓取出 group 裡的 app_ids 清單
                    // 則將此成員加入此群組中所有 app 的 chatrooms 裡
                    if (undefined !== req.body.status && member.status) {
                        return groupsMdl.findAppIds(groupId, ownerUserId).then((appIds) => {
                            appIds = appIds || [];

                            return Promise.all(appIds.map((appId) => {
                                // 群者此群組擁有者在群組 app 內所有的 chatroomId
                                // 將新成員加入至所有 app 的 chatroom 中
                                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, ownerUserId).then((appsChatroomsMessagers) => {
                                    if (!appsChatroomsMessagers) {
                                        return Promise.reject(ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                                    } else if (!appsChatroomsMessagers[appId]) {
                                        return [];
                                    }

                                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                    let chatroomIds = Object.keys(chatrooms);

                                    return Promise.all(chatroomIds.map((chatroomId) => {
                                        let messager = {
                                            type: CHATSHIER,
                                            isDeleted: false,
                                            unRead: 0,
                                            platformUid: memberUserId
                                        };
                                        return appsChatroomsMessagersMdl.replace(appId, chatroomId, messager);
                                    }));
                                });
                            }));
                        }).then(() => {
                            return groupsMembers;
                        });
                    }
                    return groupsMembers;
                });
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let userId = req.params.userid;
            let groupId = req.params.groupid;
            let memberId = req.params.memberid;
            let memberUserId;

            return Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                } else if (!groupId) {
                    return Promise.reject(ERROR.GROUPID_WAS_EMPTY);
                } else if (!memberId) {
                    return Promise.reject(ERROR.MEMBERID_WAS_EMPTY);
                }

                return usersMdl.find(userId).then((users) => {
                    if (!(users && users[userId])) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[userId]);
                });
            }).then((user) => {
                let userGroupIds = user.group_ids;
                let idx = userGroupIds.indexOf(groupId);
                if (0 > idx) {
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                }

                return groupsMembersMdl.findMembers(groupId);
            }).then((members) => {
                if (!members || (members && 0 === Object.keys(members).length)) {
                    return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_FIND);
                }

                // 該群組下的所有使用者 IDs
                let groupUserIds = Object.values(members).filter((_member) => {
                    return !_member.isDeleted;
                }).map((_member) => {
                    return _member.user_id;
                });

                let index = groupUserIds.indexOf(userId);
                if (0 > index) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_REMOVED_FROM_THIS_GROUP);
                }

                let currentUserMemberId = Object.keys(members)[index];
                // member 當下使用者所對應到的 member 在 該 group 中
                let currentMember = members[currentUserMemberId];
                if (OWNER !== currentMember.type &&
                    ADMIN !== currentMember.type &&
                    currentUserMemberId !== memberId) {
                    // 只有當下使用者為 OWNER 或 ADMIN 才能夠 刪除 成員
                    // 但是自己可以離開群組
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_REMOVE_GROUP_MEMBER);
                }

                let targetMember = members[memberId];
                if (!targetMember) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_REMOVED_FROM_THIS_GROUP);
                }
                memberUserId = targetMember.user_id;

                // 群組成員刪除時，需要刪除內部聊天室的 messager
                return groupsMdl.findAppIds(groupId, memberUserId);
            }).then((appIds) => {
                appIds = appIds || [];

                // 群組成員的 userId 即是內部聊天室的 platformUid
                return appsChatroomsMessagersMdl.remove(appIds, void 0, memberUserId).then((appsChatroomsMessagers) => {
                    if (!appsChatroomsMessagers) {
                        return Promise.reject(ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_REMOVE);
                    };
                    return Promise.resolve(appsChatroomsMessagers);
                });
            }).then(() => {
                // 群組成員 user 資料中的 groups 也須一併移除 group
                return usersMdl.find(memberUserId).then((users) => {
                    if (!(users && users[memberUserId])) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[memberUserId]);
                });
            }).then((memberUser) => {
                let userGroupIds = memberUser.group_ids;
                let idx = userGroupIds.indexOf(groupId);
                idx >= 0 && userGroupIds.splice(idx, 1);

                let updateUser = {
                    group_ids: userGroupIds
                };

                return usersMdl.update(memberUserId, updateUser).then((users) => {
                    if (!(users && users[memberUserId])) {
                        return Promise.reject(ERROR.USER_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(users[memberUserId]);
                });
            }).then(() => {
                return groupsMembersMdl.remove(groupId, memberId).then((groupsMembers) => {
                    if (!(groupsMembers && groupsMembers[groupId])) {
                        return Promise.reject(ERROR.GROUP_MEMBER_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(groupsMembers);
                });
            }).then((groupsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: groupsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new GroupsMembersController();
})();
