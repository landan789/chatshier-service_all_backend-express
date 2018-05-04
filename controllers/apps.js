module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    let appsMdl = require('../models/apps');
    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');
    let appsFieldsMdl = require('../models/apps_fields');

    class AppsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    let userId = req.params.userid;
                    if (!userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
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
                let groupIds = user.group_ids || [];
                return new Promise((resolve, reject) => {
                    groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
                        resolve(appIds);
                    });
                });
            }).then((appIds) => {
                return appsMdl.find(appIds).then((apps) => {
                    if (!apps) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return apps;
                });
            }).then((apps) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: apps
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

        getOne(req, res, next) {
            let appId = req.params.appid;
            let userId = req.params.userid;

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === appId || null === appId) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }

                    if ('' === userId || null === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }

                    resolve();
                });
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
                    groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
                        resolve(appIds);
                    });
                });
            }).then((appIds) => {
                if (0 > appIds.indexOf(appId)) {
                    return Promise.reject(API_ERROR.USER_OF_GROUP_DID_NOT_HAVE_THIS_APP);
                };
                return Promise.resolve();
            }).then(() => {
                return appsMdl.find(appId).then((apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return apps;
                });
            }).then((data) => {
                let app = data;
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: app
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
            let postApp = {
                id1: undefined === req.body.id1 ? null : req.body.id1,
                id2: undefined === req.body.id2 ? null : req.body.id2,
                name: undefined === req.body.name ? null : req.body.name,
                secret: undefined === req.body.secret ? null : req.body.secret,
                token1: undefined === req.body.token1 ? null : req.body.token1,
                token2: undefined === req.body.token2 ? null : req.body.token2,
                type: undefined === req.body.type ? null : req.body.type,
                group_id: undefined === req.body.group_id ? null : req.body.group_id
            };
            let apps;
            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === req.params.userid || null === req.params.userid || undefined === req.params.userid) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }

                    if ('' === req.body.id1 || null === req.body.id1 || undefined === req.body.id1) {
                        reject(API_ERROR.ID1_WAS_EMPTY);
                        return;
                    }

                    if ('' === req.body.name || null === req.body.name || undefined === req.body.name) {
                        reject(API_ERROR.NAME_WAS_EMPTY);
                        return;
                    }

                    if ('' === req.body.secret || null === req.body.secret || undefined === req.body.secret) {
                        reject(API_ERROR.TYPE_WAS_EMPTY);
                        return;
                    }

                    // wechat 新增 app 不需要輸入 token
                    // if ('' === req.body.token1 || null === req.body.token1 || undefined === req.body.token1) {
                    //     reject(API_ERROR.TOKEN1_WAS_EMPTY);
                    //     return;
                    // }

                    if ('' === req.body.type || null === req.body.type || undefined === req.body.type) {
                        reject(API_ERROR.TYPE_WAS_EMPTY);
                        return;
                    }

                    if ('' === req.body.group_id || null === req.body.group_id || undefined === req.body.group_id) {
                        reject(API_ERROR.GROUPID_WAS_EMPTY);
                        return;
                    }
                    resolve();
                });
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
                let groupIds = user.group_ids || [];
                if (0 > groupIds.indexOf(req.body.group_id)) {
                    return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                };

                return new Promise((resolve, reject) => {
                    groupsMdl.find(req.body.group_id, req.params.userid, (groups) => {
                        if (!groups || (groups && 0 === Object.keys(groups).length)) {
                            reject(API_ERROR.GROUP_DID_NOT_EXIST);
                            return;
                        }
                        let group = groups[req.body.group_id];
                        resolve(group);
                    });
                });
            }).then((group) => {
                let members = group.members;

                // userIds 此群組底下所有成員 userIDs
                let userIds = Object.values(members).map((member) => {
                    if (!member.isDeleted) {
                        return member.user_id;
                    }
                });

                let index = userIds.indexOf(req.params.userid);
                // member 當下使用者在此群組的 member 物件資料
                let member = Object.values(members)[index];

                if (0 > index) {
                    return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                };

                if (0 === member.status) {
                    return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                };

                if (READ === member.type) {
                    return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.insert(req.params.userid, postApp, (_apps) => {
                        if (!_apps) {
                            reject(API_ERROR.APP_FAILED_TO_INSERT);
                            return;
                        }
                        apps = _apps;
                        resolve(apps);
                    });
                });
            }).then((apps) => {
                let appId = Object.keys(apps).shift() || '';
                return new Promise((resolve, reject) => {
                    appsFieldsMdl.insertDefaultFields(appId, (fields) => {
                        if (!fields) {
                            reject(API_ERROR.APP_FAILED_TO_INSERT);
                            return;
                        }
                        resolve();
                    });
                });
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: apps
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
            let appId = req.params.appid;
            let id1 = req.body.id1;
            let id2 = req.body.id2;
            let name = req.body.name;
            let secret = req.body.secret;
            let token1 = req.body.token1;
            let token2 = req.body.token2;
            let type = req.body.type;

            let putApp = {
                id1: undefined === req.body.id1 ? null : req.body.id1,
                id2: undefined === req.body.id2 ? null : req.body.id2,
                name: undefined === req.body.name ? null : req.body.name,
                secret: undefined === req.body.secret ? null : req.body.secret,
                token1: undefined === req.body.token1 ? null : req.body.token1,
                token2: undefined === req.body.token2 ? null : req.body.token2,
                type: undefined === req.body.type ? null : req.body.type
            };
            // app.group_id 無法經由 HTTP PUT 更改

            // 前端未填入的訊息，不覆蓋
            for (let key in putApp) {
                if (null === putApp[key]) {
                    delete putApp[key];
                };
            };

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId || undefined === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    if (0 === Object.keys(putApp).length) {
                        reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
                        return;
                    };
                    resolve();
                });
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
                return appsMdl.find(appId).then((apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return apps;
                });
            }).then((apps) => {
                let app = Object.values(apps)[0];
                let groupId = app.group_id;
                return new Promise((resolve, reject) => {
                    groupsMdl.find(groupId, req.params.userid, (groups) => {
                        if (null === groups || undefined === groups || '' === groups) {
                            reject(API_ERROR.GROUP_FAILED_TO_FIND);
                            return;
                        };
                        resolve(groups);
                    });
                });
            }).then((groups) => {
                let group = Object.values(groups)[0];
                let members = group.members;

                let userIds = Object.values(members).map((member) => {
                    if (!member.isDeleted) {
                        return member.user_id;
                    }
                });

                let index = userIds.indexOf(req.params.userid);

                if (0 > index) {
                    return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                };

                let member = Object.values(members)[index];

                if (0 === member.status) {
                    return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                };

                if (READ === member.type) {
                    return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.update(req.params.appid, putApp, (apps) => {
                        if (null === apps || undefined === apps || '' === apps) {
                            reject(API_ERROR.APP_FAILED_TO_UPDATE);
                            return;
                        };
                        resolve(apps);
                    });
                });
            }).then((apps) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: apps
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

        deleteOne(req, res, next) {
            let userId = req.params.userid;
            let appId = req.params.appid;

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId || undefined === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }

                    if ('' === appId || null === appId || undefined === appId) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    };
                    resolve();
                });
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
                return appsMdl.find(appId).then((apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return apps;
                });
            }).then((apps) => {
                let app = Object.values(apps)[0];
                let groupId = app.group_id;
                return new Promise((resolve, reject) => {
                    groupsMdl.find(groupId, req.params.userid, (groups) => {
                        if (null === groups || undefined === groups || '' === groups) {
                            reject(API_ERROR.GROUP_FAILED_TO_FIND);
                            return;
                        };
                        resolve(groups);
                    });
                });
            }).then((groups) => {
                let group = Object.values(groups)[0];
                let members = group.members;

                let userIds = Object.values(members).map((member) => {
                    if (!member.isDeleted) {
                        return member.user_id;
                    };
                });

                let index = userIds.indexOf(req.params.userid);

                if (0 > index) {
                    return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                };

                let member = Object.values(members)[index];

                if (0 === member.status) {
                    return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                };

                if (READ === member.type) {
                    return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.remove(req.params.appid, (apps) => {
                        if (!apps) {
                            reject(API_ERROR.APP_FAILED_TO_REMOVE);
                            return;
                        }
                        resolve(apps);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: data
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
    }
    return new AppsController();
})();
