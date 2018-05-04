module.exports = (function() {
    const ControllerCore = require('../cores/controller');

    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const CHATSHIER = 'CHATSHIER';

    let appsMdl = require('../models/apps');
    let appsChatroomsMdl = require('../models/apps_chatrooms');
    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    let appsFieldsMdl = require('../models/apps_fields');
    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');

    class GroupsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
        }

        getAll(req, res, next) {
            let userId = req.params.userid;

            let proceed = Promise.resolve();
            proceed.then(() => {
                if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                    return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
                };

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
                            reject(API_ERROR.GROUP_FAILED_TO_FIND);
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
        }

        postOne(req, res, next) {
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
                    let groupId = Object.keys(groups).shift() || '';
                    if (!groupId) {
                        return groups;
                    }

                    let group = groups[groupId];
                    user.group_ids = user.group_ids || [];
                    user.group_ids.push(groupId);

                    return usersMdl.update(userId, user).then(() => {
                        // 群組新增處理完畢後，自動新增一個內部聊天室的 App
                        let postApp = {
                            name: 'Chatshier - ' + group.name,
                            type: 'CHATSHIER',
                            group_id: groupId
                        };
                        return appsMdl.insert(userId, postApp);
                    }).then((apps) => {
                        if (!apps || (apps && 0 === Object.keys(apps).length)) {
                            return Promise.reject(API_ERROR.APP_FAILED_TO_INSERT);
                        }
                        let appId = Object.keys(apps).shift() || '';

                        // 為 App 創立一個 chatroom 並將 group 裡的 members 新增為 messagers
                        return appsChatroomsMdl.insert(appId).then((appsChatrooms) => {
                            if (!appsChatrooms) {
                                return Promise.reject(API_ERROR.APP_CHATROOMS_FAILED_TO_INSERT);
                            }

                            // 將預設的客戶分類條件資料新增至 App 中
                            return appsFieldsMdl.insertDefaultFields(appId).then((appsFields) => {
                                if (!appsFields) {
                                    return Promise.reject(API_ERROR.APP_FAILED_TO_INSERT);
                                }
                                return appsFields;
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
        }

        putOne(req, res, next) {
            let userId = req.params.userid;
            let groupId = req.params.groupid;
            let putGroup = {
                name: req.body.name || null
            };
            let groups;

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

                return new Promise((resolve, reject) => {
                    groupsMdl.find(groupId, req.params.userid, (groups) => {
                        if (null === groups || undefined === groups || '' === groups) {
                            reject(API_ERROR.GROUP_MEMBER_FAILED_TO_FIND);
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

                return new Promise((resolve, reject) => {
                    groupsMdl.update(groupId, putGroup, (groups) => {
                        if (null === groups || undefined === groups || '' === groups) {
                            reject(API_ERROR.GROUP_MEMBER_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve(groups);
                    });
                });
            }).then((updatedGroups) => {
                groups = updatedGroups;

                return groupsMdl.findAppIds(groupId, userId);
            }).then((appIds) => {
                if (!appIds) {
                    return Promise.reject(API_ERROR.APPID_FAILED_TO_FIND);
                }
                return appsMdl.find(appIds).then((apps) => {
                    if (!apps) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return apps;
                });
            }).then((apps) => {
                let appIds = Object.keys(apps);
                let putApp = {
                    name: 'Chatshier - ' + putGroup.name
                };

                return Promise.all(appIds.map((appId) => {
                    let app = apps[appId];
                    if (CHATSHIER === app.type) { // 更新 屬於 內部群組 的 app 名稱
                        return new Promise((resolve, reject) => {
                            appsMdl.update(appId, putApp).then((app) => {
                                if (!app) {
                                    reject(API_ERROR.APP_FAILED_TO_UPDATE);
                                    return;
                                }
                                resolve();
                            });
                        });
                    }
                }));
            }).then(() => {
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
        }
    }

    return new GroupsController();
})();
