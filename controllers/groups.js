module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const appsMdl = require('../models/apps');
    const appsChatroomsMdl = require('../models/apps_chatrooms');
    const appsTagsMdl = require('../models/apps_tags');
    const appsMessagersMdl = require('../models/apps_messagers');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');

    function GroupsController() {};

    GroupsController.prototype.getAll = function(req, res, next) {
        let userId = req.params.userid;

        let proceed = Promise.resolve();
        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
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
            let groupIds = user.group_ids || [];
            return new Promise((resolve, reject) => {
                groupsMdl.find(groupIds, req.params.userid, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: groups
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    GroupsController.prototype.postOne = function(req, res, next) {
        let userId = req.params.userid;
        let postGroup = {
            name: req.body.name
        };

        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    return reject(API_ERROR.USERID_WAS_EMPTY);
                } else if (!postGroup.name) {
                    return reject(API_ERROR.NAME_WAS_EMPTY);
                };

                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        return reject(API_ERROR.USER_FAILED_TO_FIND);
                    }
                    resolve(users[userId]);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.insert(userId, postGroup, (groups) => {
                    if (!groups) {
                        return reject(API_ERROR.GROUP_MEMBER_FAILED_TO_INSERT);
                    }
                    resolve(groups);
                });
            }).then((groups) => {
                // group 成功新增之後，將 user 的 group_ids 更新
                let groupId = Object.keys(groups).shift();
                if (!groupId) {
                    return groups;
                }

                let group = groups[groupId];
                user.group_ids = user.group_ids || [];
                return new Promise((resolve) => {
                    user.group_ids.push(groupId);
                    usersMdl.update(userId, user, () => {
                        resolve();
                    });
                }).then(() => {
                    // 群組新增處理完畢後，自動新增一個內部聊天室的 App
                    return new Promise((resolve, reject) => {
                        let postApp = {
                            name: 'Chatshier - ' + group.name,
                            type: 'CHATSHIER',
                            group_id: groupId
                        };

                        appsMdl.insert(userId, postApp, (apps) => {
                            if (!apps) {
                                reject(API_ERROR.APP_FAILED_TO_INSERT);
                                return;
                            }
                            resolve(apps);
                        });
                    });
                }).then((apps) => {
                    let appId = Object.keys(apps).shift() || '';
                    // 將預設的客戶分類條件資料新增至 App 中
                    return new Promise((resolve, reject) => {
                        appsTagsMdl.insertDefaultTags(appId, (tags) => {
                            if (!tags) {
                                return reject(API_ERROR.APP_FAILED_TO_INSERT);
                            }
                            resolve();
                        });
                    }).then(() => {
                        // 為 App 創立一個 chatroom 並將 group 裡的 members 新增為 messagers
                        return appsChatroomsMdl.insert(appId).then((appsChatrooms) => {
                            let chatroomId = Object.keys(appsChatrooms[appId].chatrooms).shift();
                            let members = Object.values(groups[groupId].members);
                            return Promise.all(members.map((member) => {
                                let messager = {
                                    chatroom_id: chatroomId,
                                    isDeleted: 0
                                };
                                return appsMessagersMdl.replaceMessager(appId, member.user_id, messager);
                            }));
                        });
                    });
                }).then(() => {
                    return groups;
                });
            });
        }).then((groups) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: groups
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    GroupsController.prototype.putOne = function(req, res, next) {
        let userId = req.params.userid;
        let groupId = req.params.groupid;
        let putGroup = {
            name: req.body.name || null
        };

        // 前端未填入的訊息，不覆蓋
        for (let key in putGroup) {
            if (null === putGroup[key]) {
                delete putGroup[key];
            };
        };

        Promise.resolve().then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.groupid || undefined === req.params.groupid || null === req.params.groupid) {
                return Promise.reject(API_ERROR.GROUPID_WAS_EMPTY);
            };
            if (0 === Object.keys(putGroup).length) {
                return Promise.reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
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
            let groupIds = user.group_ids;
            let index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMdl.find(groupId, req.params.userid, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            let group = Object.values(groups)[0];
            let members = group.members;
            let userIds = Object.values(members).map((member) => {
                return member.user_id;
            });

            let index = userIds.indexOf(userId);

            // member 當下 userid 在此 group 對應到的 群組成員
            let member = Object.values(members)[index];
            if (READ === member.type) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMdl.update(groupId, putGroup, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: groups
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };
    return new GroupsController();
})();