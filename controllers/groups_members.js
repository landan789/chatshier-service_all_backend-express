module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');
    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    var usersMdl = require('../models/users');
    var groupsMembersMdl = require('../models/groups_members');

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
                usersMdl.findUser(userId, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_GROUP);
            }

            return new Promise((resolve, reject) => {
                groupsMembersMdl.findGroupsMembers(groupIds, null, (groupsMembers) => {
                    if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                        reject(groupsMembers);
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
            res.status(403).json(json);
        });
    };

    GroupsMembersController.prototype.postOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var postMember = {
            user_id: req.body.userid || '',
            status: 0, // 0 邀請中 ; 1 已加入
            type: 0 <= [OWNER, ADMIN, WRITE, READ].indexOf(req.body.type) ? req.body.type : READ // OWNER 群組擁有者 ; ADMIN 群組管理員 ; WRITE 群組可修改 ; READ 群組可查看
        };
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
                usersMdl.findUser(req.params.userid, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(postMember.user_id, (data) => {
                    var _user = data;
                    if (undefined === _user || null === _user || '' === _user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        // 不存在的 user 無法加入 群組
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_GROUP);
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
            var index = userIds.indexOf(req.params.userid);
            var memberId = Object.keys(members)[index];
            var member = members[memberId];
            if (0 <= userIds.indexOf(req.body.userid)) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_ALREADY_IN_THIS_GROUP);
            }
            if (WRITE === member.type || READ === member.type) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_INSERT_MEMBER);
            };
            return Promise.resolve();
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMembersMdl.insert(groupId, postMember, (groupsMembers) => {
                    if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                        reject(groupsMembers);
                        return;
                    };
                    resolve(groupsMembers);
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
            res.status(403).json(json);
        });
    };

    GroupsMembersController.prototype.putOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var memberId = req.params.memberid;
        var putMember = {
            status: 0 <= [0, 1].indexOf(Number(req.body.status)) ? Number(req.body.status) : null, // 0 邀請中 ; 1 已加入
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
                usersMdl.findUser(req.params.userid, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_GROUP);
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
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_DELETED_IN_THIS_GROUP);
            }
            var _memberId = Object.keys(members)[index];
            // member 當下使用者所對應到的 member 在 該 group 中
            var member = members[_memberId];
            if (1 === putMember.status && _memberId !== memberId) {
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
            res.status(403).json(json);
        });
    };

    GroupsMembersController.prototype.deleteOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var memberId = req.params.memberid;

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
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(userId, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_GROUP);
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
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_DELETED_IN_THIS_GROUP);
            }
            var _memberId = Object.keys(members)[index];
            // member 當下使用者所對應到的 member 在 該 group 中
            var member = members[_memberId];
            if (OWNER !== member.type && ADMIN !== member.type) {
                // 只有當下使用者為 OWNER 或 ADMIN 才能夠 刪除 成員
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_REMOVE_GROUP_MEMBER);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMembersMdl.remove(groupId, memberId, (groupsMembers) => {
                    if (null === groupsMembers || undefined === groupsMembers || '' === groupsMembers) {
                        reject(API_ERROR.GROUP_MEMBER_FAILED_TO_REMOVE);
                    };
                    resolve(groupsMembers);
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
            res.status(403).json(json);
        });
    };
    return new GroupsMembersController();
})();