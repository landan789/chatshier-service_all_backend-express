module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const appsMessagersMdl = require('../models/apps_messagers');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');
    const appsMdl = require('../models/apps');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    let instance = new AppsMessagersController();

    function AppsMessagersController() {}

    AppsMessagersController.prototype.paramsCheckingGetAll = function(params) {
        params = params || {};
        let userId = params.userid;
        let appId = params.appid;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                usersMdl.findUser(userId, (data) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!data) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(user.group_ids, params.userid, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    } else if (appId && -1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appIds);
                });
            });
        });
    };

    /**
     * 使用者的 AppId 清單前置檢查程序
     *
     * @param {string} userId
     * @param {string} appId
     */
    AppsMessagersController.prototype.paramsChecking = function(params) {
        let appId = params.appid;
        let userId = params.userid;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                if (!appId) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                };
                usersMdl.findUser(userId, (data) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!data) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(user.group_ids, params.userid, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    } else if (appId && -1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsMdl.findByAppId(appId, (apps) => {
                    if (null === apps || undefined === apps || '' === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(apps);
                });
            });
        }).then((apps) => {
            var app = Object.values(apps)[0];
            var groupId = app.group_id;
            return new Promise((resolve, reject) => {
                groupsMdl.findGroups(groupId, params.userid, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(API_ERROR.GROUP_FAILED_TO_FIND);
                        return;
                    };
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var group = Object.values(groups)[0];
            var members = group.members;

            var userIds = Object.values(members).map((member) => {
                if (0 === member.isDeleted) {
                    return member.user_id;
                }
            });

            var index = userIds.indexOf(userId);

            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            };

            var member = Object.values(members)[index];

            if (0 === member.status) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
            };

            if (READ === member.type) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
            };
            return appId;
        });
    };

    /**
     * 處理取得所有 App 及其所有 Messager 的請求
     */
    AppsMessagersController.prototype.getAllMessagers = function(req, res) {
        let appId = req.params.appid;

        return instance.paramsCheckingGetAll(req.params).then((appIds) => {
            // 再根據所有使用者的 App ID 陣列清單取得對應的所有 Messager
            return new Promise((resolve, reject) => {
                appsMessagersMdl.findAppMessagers(appId || appIds, (allAppMessagers) => {
                    if (!allAppMessagers) {
                        reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_FIND);
                        return;
                    }
                    resolve(allAppMessagers);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(403).json(json);
        });
    };

    AppsMessagersController.prototype.getMessager = function(req, res) {
        let msgerId = req.params.messagerid;
        return instance.paramsChecking(req.params).then((checkedAppId) => {
            return new Promise((resolve, reject) => {
                let appId = checkedAppId;
                if (!msgerId) {
                    reject(API_ERROR.MESSAGERID_WAS_EMPTY);
                    return;
                }
                appsMessagersMdl.findMessager(appId, msgerId, (messager) => {
                    if (!messager) {
                        reject(API_ERROR.APP_MESSAGER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(messager);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(403).json(json);
        });
    };

    /**
     * 處理更新 messager 基本資料的 API 請求
     *
     * @param {Request} req
     * @param {Response} res
     */
    AppsMessagersController.prototype.updateMessager = function(req, res) {
        let msgerId = req.params.messagerid;
        let appId = '';
        return instance.paramsChecking(req.params).then((checkedAppId) => {
            appId = checkedAppId;
            if (!msgerId) {
                return Promise.reject(API_ERROR.MESSAGERID_WAS_EMPTY);
            }

            // 只允許更新 API 可編輯的屬性
            let messagerData = {};
            ('string' === typeof req.body.photo) && (messagerData.photo = req.body.photo);
            ('number' === typeof req.body.age) && (messagerData.age = req.body.age);
            ('string' === typeof req.body.email) && (messagerData.email = req.body.email);
            ('string' === typeof req.body.phone) && (messagerData.phone = req.body.phone);
            ('string' === typeof req.body.gender) && (messagerData.gender = req.body.gender);
            ('string' === typeof req.body.remark) && (messagerData.remark = req.body.remark);

            if (!(req.body.custom_tags instanceof Array)) {
                return messagerData;
            }

            // 將舊的 custom_tags 陣列資料取出合併
            return new Promise((resolve) => {
                appsMessagersMdl.findMessager(appId, msgerId, (messager) => {
                    if (!messager) {
                        messagerData.custom_tags = req.body.custom_tags;
                        resolve(messagerData);
                        return;
                    }

                    // 預處理 custom_tags 陣列資料，使陣列當中的 tagId 不重複
                    messagerData.custom_tags = messagerData.custom_tags || [];
                    messagerData.custom_tags = (function tagArrayUnique(mergedArray) {
                        let arr = mergedArray.slice();
                        for (let i = 0; i < arr.length; ++i) {
                            for (let j = i + 1; j < arr.length; ++j) {
                                if (arr[i].tag_id === arr[j].tag_id) {
                                    arr[i].value = arr[j].value;
                                    arr.splice(j--, 1);
                                }
                            }
                        }
                        return arr;
                    })(messagerData.custom_tags.concat(req.body.custom_tags));
                    resolve(messagerData);
                });
            });
        }).then((messagerData) => {
            return new Promise((resolve, reject) => {
                appsMessagersMdl.replaceMessager(appId, msgerId, messagerData, (messager) => {
                    if (!messager) {
                        reject(API_ERROR.APP_MESSAGER_FAILED_TO_UPDATE);
                        return;
                    }
                    resolve(messager);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(403).json(json);
        });
    };

    return instance;
})();