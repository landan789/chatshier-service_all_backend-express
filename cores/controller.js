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
                if (!userId) {
                    return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
                }

                // 1. 先用 userId 去 users model 找到 appId 清單
                return usersMdl.find(userId).then((users) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!(users && users[userId])) {
                        return Promise.reject(API_ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[userId]);
                });
            }).then((user) => {
                return groupsMdl.findAppIds(user.group_ids, userId).then((appIds) => {
                    appIds = appIds || [];
                    if (appId && -1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appIds);
                });
            }).then((appIds) => {
                if (GET === req.method && undefined === req.params.appid) {
                    return Promise.resolve(appIds);
                }

                if (GET === req.method && req.params.appid) {
                    return Promise.resolve([req.params.appid]);
                }

                return appsMdl.find(appId).then((apps) => {
                    if (!(apps && apps[appId])) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps[appId]);
                }).then((app) => {
                    let groupId = app.group_id;
                    return groupsMdl.find(groupId, userId).then((groups) => {
                        if (!(groups && groups[groupId])) {
                            return Promise.reject(API_ERROR.GROUP_FAILED_TO_FIND);
                        }
                        return Promise.resolve(groups[groupId]);
                    });
                }).then((group) => {
                    let members = group.members;
                    let memberIdOfUser = Object.keys(members).filter((memberId) => userId === members[memberId].user_id).shift();

                    if (!(memberIdOfUser && members[memberIdOfUser])) {
                        return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
                    }

                    let memberOfUser = members[memberIdOfUser];
                    if (READ === memberOfUser.type && (POST === method || PUT === method || DELETE === method)) {
                        return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
                    }
                    return Promise.resolve([req.params.appid]);
                });
            }).then((appIds) => {
                return Promise.resolve(appIds);
            });
        }

        successJson(req, res, suc) {
            let json = {
                status: 1,
                msg: suc.MSG || '',
                data: suc.data || {}
            };
            suc.jwt && (json.jwt = suc.jwt);
            return res && res.status(200).json(json);
        }

        errorJson(req, res, err) {
            console.error(err);
            let json = {
                status: 0,
                msg: err.MSG || '',
                code: err.CODE || ''
            };
            return res && res.status(err && err.CODE === API_ERROR.USER_WAS_NOT_AUTHORIZED.CODE ? 401 : 500).json(json);
        }
    }

    return ControllerCore;
})();
