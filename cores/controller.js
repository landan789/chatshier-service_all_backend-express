module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    let appsMdl = require('../models/apps');
    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');

    // const OWNER = 'OWNER';
    // const ADMIN = 'ADMIN';
    // const WRITE = 'WRITE';
    const READ = 'READ';

    const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const DELETE = 'DELETE';

    class ControllerCore {
        /**
         * @returns {Promise<string[]>}
         */
        appsRequestVerify(req) {
            let appId = req.params.appid || req.query.appid;
            let userId = req.params.userid;
            let method = req.method;

            return Promise.resolve().then(() => {
                // 1. 先用 userId 去 users model 找到 appId 清單
                return new Promise((resolve, reject) => {
                    if (!userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    usersMdl.find(userId, null, (users) => {
                        // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                        if (!users) {
                            reject(API_ERROR.USER_FAILED_TO_FIND);
                            return;
                        }
                        resolve(users[userId]);
                    });
                });
            }).then((user) => {
                return new Promise((resolve, reject) => {
                    groupsMdl.findAppIds(user.group_ids, userId, (appIds) => {
                        appIds = appIds || [];
                        if (appId && -1 === appIds.indexOf(appId)) {
                            // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                            reject(API_ERROR.APP_FAILED_TO_FIND);
                            return;
                        }
                        resolve(appIds);
                    });
                });
            }).then((appIds) => {
                if (GET === req.method && undefined === req.params.appid) {
                    return Promise.resolve(appIds);
                };

                if (GET === req.method && req.params.appid) {
                    return Promise.resolve([req.params.appid]);
                };

                return appsMdl.find(appId).then((apps) => {
                    if (!apps) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return apps;
                }).then((apps) => {
                    let app = Object.values(apps)[0];
                    let groupId = app.group_id;
                    return new Promise((resolve, reject) => {
                        groupsMdl.find(groupId, userId, (groups) => {
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

                    let index = userIds.indexOf(userId);
                    let member = members[Object.keys(members)[index]];

                    if (READ === member.type && (POST === method || PUT === method || DELETE === method)) {
                        return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                    };

                    return Promise.resolve([req.params.appid]);
                });
            }).then((appIds) => {
                return Promise.resolve(appIds);
            });
        }
    }

    return ControllerCore;
})();
