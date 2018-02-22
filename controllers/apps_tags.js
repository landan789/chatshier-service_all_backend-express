module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const usersMdl = require('../models/users');
    const appsTagsMdl = require('../models/apps_tags');
    const groupsMdl = require('../models/groups');
    const appsMdl = require('../models/apps');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    function AppsTagsController() {}

    /**
     * 使用者的 AppId 清單前置檢查程序
     */
    let paramsCheckingGetAll = function(params) {
        let appId = params.appid;
        let userId = params.userid;

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
     */
    let paramsChecking = function(params) {
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

    AppsTagsController.prototype.getAll = function(req, res) {
        return paramsCheckingGetAll(req.params).then((appIds) => {
            // 1. 根據 appId 清單去 tags model 抓取清單
            return new Promise((resolve, reject) => {
                appsTagsMdl.findTags(appIds, (appsTags) => {
                    if (!appsTags) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appsTags);
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
            res.status(500).json(json);
        });
    };

    AppsTagsController.prototype.postOne = function(req, res) {
        let appId = req.params.appid;

        // 建立並過濾用戶端傳過來的資料
        let postTagData = {
            text: req.body.text || '',
            type: req.body.type || appsTagsMdl.TypeEnum.CUSTOM,
            sets: req.body.sets || [''],
            setsType: req.body.setsType ? req.body.setsType : 0,
            order: req.body.order ? req.body.order : 0,
            createdTime: req.body.createdTime || Date.now(),
            updatedTime: req.body.updatedTime || Date.now(),
            isDeleted: 0
        };

        return paramsChecking(req.params).then(() => {
            // 1. 將 tag 資料插入至指定 appId 中
            return new Promise((resolve, reject) => {
                appsTagsMdl.insertTag(appId, postTagData, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
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

    AppsTagsController.prototype.putOne = function(req, res) {
        let appId = req.params.appid;
        let tagId = req.params.tagid;

        // 建立並過濾用戶端傳過來的資料
        let putTagData = {
            type: req.body.type || appsTagsMdl.TypeEnum.CUSTOM,
            order: req.body.order ? req.body.order : 0,
            updatedTime: req.body.updatedTime || Date.now(),
            isDeleted: req.body.isDeleted ? req.body.isDeleted : 0
        };

        // 欲更新的資料只有是自定義型態才可變更名稱及資料
        if (appsTagsMdl.TypeEnum.CUSTOM === putTagData.type) {
            putTagData.text = req.body.text || '';
            putTagData.sets = req.body.sets || [''];
            putTagData.setsType = req.body.setsType ? req.body.setsType : 0;
        }

        return paramsChecking(req.params).then(() => {
            // 1. 將 tag 資料更新至指定 appId 中
            return new Promise((resolve, reject) => {
                appsTagsMdl.updateTag(appId, tagId, putTagData, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_UPDATE);
                        return;
                    }
                    resolve(data);
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
            res.status(500).json(json);
        });
    };

    AppsTagsController.prototype.deleteOne = function(req, res) {
        let appId = req.params.appid;
        let tagId = req.params.tagid;

        return paramsChecking(req.params).then(() => {
            // 1. 藉由 tags model 將指定的 tag 資料刪除
            return new Promise((resolve, reject) => {
                appsTagsMdl.removeTag(appId, tagId, (data) => {
                    if (!data) {
                        reject(API_ERROR.APP_TAG_FAILED_TO_REMOVE);
                        return;
                    }
                    resolve(data);
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

    return new AppsTagsController();
})();