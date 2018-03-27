module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const CHATSHIER = 'CHATSHIER';

    const appsMdl = require('../models/apps');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');
    const groupsMembersMdl = require('../models/groups_members');
    const appsMessagersMdl = require('../models/apps_messagers');

    function GroupsMembersController() {};

    GroupsMembersController.prototype.getAll = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;

        var proceed = Promise.resolve();
        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.groupid || undefined === req.params.groupid || null === req.params.groupid) {
                return Promise.reject(API_ERROR.GROUPID_WAS_EMPTY);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(users[userId]);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            }

            return new Promise((resolve, reject) => {
                groupsMembersMdl.find(groupIds, null, (groupsMembers) => {
                    if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                        reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                        return;
                    }
                    resolve(groupsMembers);
                });
            });
        }).then((groupsMembers) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: groupsMembers
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    GroupsMembersController.prototype.postOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var memberUserId = req.body.userid;

        var postMember = {
            user_id: memberUserId || '',
            status: false, // false 邀請中 ; true 已加入
            type: 0 <= [OWNER, ADMIN, WRITE, READ].indexOf(req.body.type) ? req.body.type : READ // OWNER 群組擁有者 ; ADMIN 群組管理員 ; WRITE 群組可修改 ; READ 群組可查看
        };
        var proceed = Promise.resolve();

        proceed.then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    return reject(API_ERROR.USERID_WAS_EMPTY);
                } else if (!groupId) {
                    return reject(API_ERROR.GROUPID_WAS_EMPTY);
                };

                usersMdl.find(memberUserId, null, (users) => {
                    if (!users) {
                        // 不存在的 user 無法加入 群組
                        return reject(API_ERROR.USER_FAILED_TO_FIND);
                    }
                    resolve();
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        // 不存在的 user 無法加入 群組
                        return;
                    }
                    resolve(users[userId]);
                });
            });
        }).then((user) => {
            let groupIds = user.group_ids;
            if (0 > groupIds.indexOf(groupId)) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMembersMdl.findMembers(groupId, null, (members) => {
                    if (null === members || undefined === members || '' === members) {
                        reject(members);
                        return;
                    }
                    resolve(members);
                });
            });
        }).then((members) => {
            // 該群組下的所有使用者 IDs
            var userIds = Object.values(members).map((member) => {
                var userId = member.user_id;
                return userId;
            });
            var paramsIndex = userIds.indexOf(userId);
            var paramsMemberId = Object.keys(members)[paramsIndex];
            var paramsMember = members[paramsMemberId];

            var bodyIndex = userIds.indexOf(memberUserId);
            var bodyMemberId = Object.keys(members)[bodyIndex];
            var bodyMember = members[bodyMemberId];

            if (0 <= bodyIndex && !bodyMember.isDeleted) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_ALREADY_IN_THIS_GROUP);
            }
            if (WRITE === paramsMember.type || READ === paramsMember.type) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_INSERT_MEMBER);
            };

            if (0 <= bodyIndex && bodyMember.isDeleted) {
                var _member = {
                    isDeleted: false,
                    status: false
                };
                return new Promise((resolve, reject) => {
                    groupsMembersMdl.update(groupId, bodyMemberId, _member, (groupsMembers) => {
                        if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                            reject(groupsMembers);
                            return;
                        };
                        resolve(groupsMembers);
                    });
                });
            }

            return new Promise((resolve, reject) => {
                groupsMembersMdl.insert(groupId, postMember, (groupsMembers) => {
                    if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                        reject(groupsMembers);
                        return;
                    };
                    resolve(groupsMembers);
                });
            }).then((groupsMembers) => {
                // 抓取出 group 裡的 app_ids 清單
                // 將此 group member 加入此 group 裡所有 app 的 messagers
                return groupsMdl.findAppIds(groupId, userId).then((appIds) => {
                    return Promise.all(appIds.map((appId) => {
                        return new Promise((resolve) => {
                            appsMdl.find(appId, null, (apps) => {
                                resolve(apps);
                            });
                        }).then((apps) => {
                            let app = apps[appId];

                            // 非內部聊天室的 app 不處理
                            // 否則會造成加一個群組新成員 chatroom 就會新創一個
                            if (CHATSHIER !== app.type) {
                                return;
                            }

                            return appsMessagersMdl.find(appId, userId).then((appMessagers) => {
                                // 目前內部聊天室的 chatroom 只會有一個
                                // 因此所有群組成員的 chatroom_id 都會是一樣
                                // 抓取新增此成員的人的 chatroom_id 來作為 new messager 的 chatroom_id
                                let newMessager = {};
                                if (appMessagers && appMessagers[appId]) {
                                    let messager = appMessagers[appId].messagers[userId];
                                    newMessager.chatroom_id = messager.chatroom_id;
                                }
                                return appsMessagersMdl.replaceMessager(appId, memberUserId, newMessager);
                            });
                        });
                    }));
                }).then(() => {
                    return groupsMembers;
                });
            });
        }).then((groupsMembers) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: groupsMembers
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    GroupsMembersController.prototype.putOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var memberId = req.params.memberid;
        var putMember = {
            status: !!req.body.status, // false 邀請中 ; true 已加入
            type: 0 <= [OWNER, ADMIN, WRITE, READ].indexOf(req.body.type) ? req.body.type : null // OWNER 群組擁有者 ; ADMIN 群組管理員 ; WRITE 群組可修改 ; READ 群組可查看
        };

        // 前端未填入的訊息，不覆蓋
        for (var key in putMember) {
            if (null === putMember[key]) {
                delete putMember[key];
            }
        }
        var proceed = Promise.resolve();

        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.groupid || undefined === req.params.groupid || null === req.params.groupid) {
                return Promise.reject(API_ERROR.GROUPID_WAS_EMPTY);
            };

            if ('' === req.params.memberid || undefined === req.params.memberid || null === req.params.memberid) {
                return Promise.reject(API_ERROR.MEMBERID_WAS_EMPTY);
            };

            if (0 === Object.keys(putMember).length) {
                return Promise.reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                let userId = req.params.userid;
                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(users[userId]);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMembersMdl.findMembers(groupId, null, (members) => {
                    if (null === members || undefined === members || '' === members) {
                        reject(members);
                        return;
                    }
                    resolve(members);
                });
            });
        }).then((members) => {
            // 該群組下的所有使用者 IDs
            var userIds = Object.values(members).map((member) => {
                var userId = member.user_id;
                if (member.isDeleted) {
                    return null;
                }
                return userId;
            });
            var index = userIds.indexOf(req.params.userid);

            if (0 > index) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_REMOVED_FROM_THIS_GROUP);
            }
            var _memberId = Object.keys(members)[index];
            // member 當下使用者所對應到的 member 在 該 group 中
            var member = members[_memberId];
            if (putMember.status && _memberId !== memberId) {
                // 當下使用者只能改變自己的 member.status 狀態，回應邀請
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_STATUS);
            };

            if (OWNER === putMember.type && OWNER === member.type) {
                // 只有當下使用者為 OWNER 無法使其他成員成為 OWNER
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
            }

            if (OWNER === putMember.type && ADMIN === member.type) {
                // 當下使用者為 ADMIN 無法修改成員為 OWNER
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
            }

            if (putMember.type && READ === member.type) {
                // 當下使用者為 READ 不能 修改 成員的 權限狀態
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
            }

            if (putMember.type && WRITE === member.type) {
                // 當下使用者為 WRITE 不能夠 修改 成員的 權限狀態
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP_MEMBER_TYPE);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMembersMdl.update(groupId, memberId, putMember, (groupsMembers) => {
                    if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                        reject(API_ERROR.GROUP_MEMBER_FAILED_TO_UPDATE);
                        return;
                    };
                    resolve(groupsMembers);
                });
            });
        }).then((groupsMembers) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: groupsMembers
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    GroupsMembersController.prototype.deleteOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var memberId = req.params.memberid;

        var proceed = Promise.resolve();

        proceed.then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    return reject(API_ERROR.USERID_WAS_EMPTY);
                } else if (!groupId) {
                    return reject(API_ERROR.GROUPID_WAS_EMPTY);
                } else if (!memberId) {
                    return reject(API_ERROR.MEMBERID_WAS_EMPTY);
                };

                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(users[userId]);
                });
            });
        }).then((user) => {
            var userGroupIds = user.group_ids;
            var index = userGroupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            }

            return new Promise((resolve, reject) => {
                groupsMembersMdl.findMembers(groupId, null, (members) => {
                    if (null === members || undefined === members || '' === members) {
                        reject(members);
                        return;
                    }
                    resolve({ userGroupIds, members });
                });
            });
        }).then((promiseData) => {
            let userGroupIds = promiseData.userGroupIds;
            let members = promiseData.members;

            // 該群組下的所有使用者 IDs
            var groupUserIds = Object.values(members).map((member) => {
                var userId = member.user_id;
                if (member.isDeleted) {
                    return null;
                }
                return userId;
            });

            var index = groupUserIds.indexOf(userId);
            if (0 > index) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_REMOVED_FROM_THIS_GROUP);
            }

            var _memberId = Object.keys(members)[index];
            // member 當下使用者所對應到的 member 在 該 group 中
            var member = members[_memberId];
            if (OWNER !== member.type && ADMIN !== member.type) {
                // 只有當下使用者為 OWNER 或 ADMIN 才能夠 刪除 成員
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_REMOVE_GROUP_MEMBER);
            }

            return new Promise((resolve, reject) => {
                groupsMembersMdl.remove(groupId, memberId, (groupsMembers) => {
                    if (!groupsMembers) {
                        reject(API_ERROR.GROUP_MEMBER_FAILED_TO_REMOVE);
                        return;
                    };
                    resolve(groupsMembers);
                });
            }).then((groupsMembers) => {
                // 群組成員 user 資料中的 groups 也須一併移除 group
                // 群組成員刪除後，也需要刪除內部聊天室的 messager
                // 群組成員的 userId 即是內部聊天室的 messagerId
                let deletedMember = groupsMembers[groupId].members[memberId];
                let msgerId = deletedMember.user_id;

                return new Promise((resolve) => {
                    let idx = userGroupIds.indexOf(groupId);
                    userGroupIds.splice(idx, 1);

                    let updateUser = {
                        group_ids: userGroupIds
                    };
                    usersMdl.update(msgerId, updateUser, () => {
                        resolve();
                    });
                }).then(() => {
                    // 抓取出 group 裡的 app_ids 清單
                    // 將此 group member 從所有 app 裡的 messagers 刪除
                    return groupsMdl.findAppIds(groupId, userId).then((appIds) => {
                        return Promise.all(appIds.map((appId) => {
                            return appsMessagersMdl.remove(appId, msgerId);
                        }));
                    });
                }).then(() => {
                    return groupsMembers;
                });
            });
        }).then((groupsMembers) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                data: groupsMembers
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };
    return new GroupsMembersController();
})();
