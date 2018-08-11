module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');

    const fbSvc = require('../services/facebook');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';

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
                        reject(ERROR.USERID_WAS_EMPTY);
                        return;
                    };
                    usersMdl.find(userId, void 0, (users) => {
                        if (!users) {
                            reject(ERROR.USER_FAILED_TO_FIND);
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
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: apps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let userId = req.params.userid;

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === appId || null === appId) {
                        reject(ERROR.APP_APPID_WAS_EMPTY);
                        return;
                    }

                    if ('' === userId || null === userId) {
                        reject(ERROR.USERID_WAS_EMPTY);
                        return;
                    }

                    resolve();
                });
            }).then(() => {
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
                let groupIds = user.group_ids || [];
                return new Promise((resolve, reject) => {
                    groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
                        resolve(appIds);
                    });
                });
            }).then((appIds) => {
                if (0 > appIds.indexOf(appId)) {
                    return Promise.reject(ERROR.USER_OF_GROUP_DID_NOT_HAVE_THIS_APP);
                };
                return Promise.resolve();
            }).then(() => {
                return appsMdl.find(appId).then((apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: apps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res, next) {
            /** @type {Chatshier.Models.Apps} */
            let apps;
            let userId = req.params.userid;
            let postApp = {
                id1: 'string' === typeof req.body.id1 ? req.body.id1 : '',
                id2: 'string' === typeof req.body.id2 ? req.body.id2 : '',
                name: 'string' === typeof req.body.name ? req.body.name : '',
                secret: 'string' === typeof req.body.secret ? req.body.secret : '',
                token1: 'string' === typeof req.body.token1 ? req.body.token1 : '',
                token2: 'string' === typeof req.body.token2 ? req.body.token2 : '',
                type: 'string' === typeof req.body.type ? req.body.type : '',
                group_id: 'string' === typeof req.body.group_id ? req.body.group_id : ''
            };
            let isNew = true;

            // 如果新增的 Facebook 類型的機器人沒有帶有 fb app 的資料
            // 則帶入 Chatshier 自己的 fb app
            if (FACEBOOK === postApp.type) {
                postApp.id2 = postApp.id2 || fbSvc.appId;
                postApp.secret = postApp.secret || fbSvc.appSecret;
                postApp.token1 = postApp.token1 || fbSvc.appAccessToken;
            }

            Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                }

                if (!postApp.id1) {
                    return Promise.reject(ERROR.ID1_WAS_EMPTY);
                }

                // 只有 Facebook 需要輸入 id2
                if (FACEBOOK === postApp.type && !postApp.id2) {
                    return Promise.reject(ERROR.ID2_WAS_EMPTY);
                }

                if (!postApp.name) {
                    return Promise.reject(ERROR.NAME_WAS_EMPTY);
                }

                if (!postApp.secret) {
                    return Promise.reject(ERROR.SECRET_WAS_EMPTY);
                }

                // 只有 LINE 和 Facebook 需要輸入 token1
                if ((FACEBOOK === postApp.type || LINE === postApp.type) && !postApp.token1) {
                    return Promise.reject(ERROR.TOKEN1_WAS_EMPTY);
                }

                // 只有 Facebook 需要輸入 token2
                if (FACEBOOK === postApp.type && !postApp.token2) {
                    return Promise.reject(ERROR.APP_TOKEN2_WAS_EMPTY);
                }

                if (!postApp.type) {
                    return Promise.reject(ERROR.TYPE_WAS_EMPTY);
                }

                if (!postApp.group_id) {
                    return Promise.reject(ERROR.GROUPID_WAS_EMPTY);
                }

                return usersMdl.find(userId).then((users) => {
                    if (!users) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[userId]);
                });
            }).then((user) => {
                let groupIds = user.group_ids || [];
                if (0 > groupIds.indexOf(req.body.group_id)) {
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                };

                return groupsMdl.find(req.body.group_id, req.params.userid).then((groups) => {
                    if (!groups || (groups && 0 === Object.keys(groups).length)) {
                        return Promise.reject(ERROR.GROUP_DID_NOT_EXIST);
                    }
                    return Promise.resolve(groups[req.body.group_id]);
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
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                }

                if (!member.status) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                }

                if (READ === member.type) {
                    return Promise.reject(ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                }

                return Promise.resolve().then(() => {
                    if (FACEBOOK === postApp.type && postApp.token2) {
                        // 在新增 facebook 類型的 app 之前
                        // 無論無何都須將粉絲專頁的 page token 轉為永久 token
                        // 因為從 web 取得的 user token 因為沒有進行 server-side token 轉換
                        // 因此取得的 page token 時效性只有 1-2 小時
                        return fbSvc.exchangeLongLivedToken(postApp.token2).then((longLiveToken) => {
                            postApp.token2 = longLiveToken.access_token;
                        });
                    }
                }).then(() => {
                    if (FACEBOOK === postApp.type) {
                        // 檢查同 group 內是否已經有匯入此粉絲專頁(包含已刪除的)
                        // 如果有則直接更新 app
                        let query = {
                            id1: postApp.id1,
                            group_id: postApp.group_id
                        };

                        return appsMdl.find(void 0, void 0, query).then((apps) => {
                            if (!apps || (apps && 0 === Object.keys(apps).length)) {
                                return appsMdl.insert(postApp);
                            }

                            let appIds = Object.keys(apps);
                            let appId = appIds.shift() || '';
                            if (!appId) {
                                return appsMdl.insert(postApp);
                            }
                            postApp.isDeleted = isNew = false;

                            // 如果同一群組內的 app 有多筆同一個粉絲專頁的資料，自動刪除重複的粉絲專頁
                            return Promise.all(appIds.map((_appId) => {
                                if (apps[_appId].isDeleted) {
                                    return Promise.resolve(null);
                                }

                                return appsMdl.remove(_appId).then((_apps) => {
                                    if (!(_apps && _apps[appId])) {
                                        return Promise.reject(ERROR.APP_FAILED_TO_REMOVE);
                                    }
                                    return Promise.resolve(_apps);
                                });
                            })).then(() => {
                                return appsMdl.update(appId, postApp);
                            });
                        }).then((apps) => {
                            return fbSvc.setFanPageSubscribeApp(postApp.id1, postApp.token2).then(() => {
                                return apps;
                            }).catch(() => {
                                return Promise.reject(ERROR.FACEBOOK_PAGE_FAILED_TO_SUBSCRIBE_APP);
                            });
                        });
                    }
                    return appsMdl.insert(postApp);
                }).then((_apps) => {
                    if (!_apps) {
                        return Promise.reject(ERROR.APP_FAILED_TO_INSERT);
                    }
                    apps = _apps;
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                if (!isNew) {
                    return Promise.resolve(apps);
                }

                let appId = Object.keys(apps).shift() || '';
                return appsFieldsMdl.insertDefaultFields(appId).then((appsFields) => {
                    if (!appsFields) {
                        return Promise.reject(ERROR.APP_FIELD_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(apps);
                });
            }).then(() => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: apps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let userId = req.params.userid;
            let appId = req.params.appid;

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
                        reject(ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    if (0 === Object.keys(putApp).length) {
                        reject(ERROR.INVALID_REQUEST_BODY_DATA);
                        return;
                    };
                    resolve();
                });
            }).then(() => {
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
                return appsMdl.find(appId).then((apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                let app = Object.values(apps)[0];
                let groupId = app.group_id;
                return new Promise((resolve, reject) => {
                    groupsMdl.find(groupId, req.params.userid, (groups) => {
                        if (!(groups && groups[groupId])) {
                            reject(ERROR.GROUP_FAILED_TO_FIND);
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
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                };

                let member = Object.values(members)[index];

                if (0 === member.status) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                };

                if (READ === member.type) {
                    return Promise.reject(ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                };

                return Promise.resolve();
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.update(req.params.appid, putApp, (apps) => {
                        if (!(apps && apps[req.params.appid])) {
                            reject(ERROR.APP_FAILED_TO_UPDATE);
                            return;
                        };
                        resolve(apps);
                    });
                });
            }).then((apps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: apps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res, next) {
            let userId = req.params.userid;
            let appId = req.params.appid;

            Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                }

                if (!appId) {
                    return Promise.reject(ERROR.APP_APPID_WAS_EMPTY);
                }

                return usersMdl.find(userId).then((users) => {
                    if (!(users && users[userId])) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[userId]);
                });
            }).then((user) => {
                return appsMdl.find(appId).then((apps) => {
                    if (!apps || (apps && 0 === Object.keys(apps).length)) {
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                let app = apps[appId];
                let groupId = app.group_id;
                return groupsMdl.find(groupId, userId).then((groups) => {
                    if (!groups) {
                        return Promise.reject(ERROR.GROUP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(groups);
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
                    return Promise.reject(ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                }

                let member = Object.values(members)[index];
                if (!member.status) {
                    return Promise.reject(ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
                }

                if (READ === member.type) {
                    return Promise.reject(ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                }

                return appsMdl.remove(appId).then((apps) => {
                    if (!(apps && apps[appId])) {
                        return Promise.reject(ERROR.APP_FAILED_TO_REMOVE);
                    }

                    let app = apps[appId];
                    if (FACEBOOK === app.type) {
                        return fbSvc.setFanPageUnsubscribeApp(app.id1, app.token2).then(() => {
                            return Promise.resolve(apps);
                        }).catch((err) => {
                            if (err && err.error && 'OAuthException' === err.error.type) {
                                return Promise.resolve(apps);
                            }
                            return Promise.reject(ERROR.FACEBOOK_PAGE_FAILED_TO_UNSUBSCRIBE_APP);
                        });
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: apps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }
    return new AppsController();
})();
