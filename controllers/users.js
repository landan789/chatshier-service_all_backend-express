module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let fuseHlp = require('../helpers/fuse');
    let redisHlp = require('../helpers/redis');

    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');

    class UsersController extends ControllerCore {
        constructor() {
            super();
            this.getOne = this.getOne.bind(this);
            this.putOne = this.putOne.bind(this);
        }

        getOne(req, res, next) {
            let userId = req.params.userid;
            let queryEmail = req.query.email;
            let useFuzzy = !!req.query.fuzzy;

            return Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if (!userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }

                    usersMdl.find(userId, void 0, (users) => {
                        if (!(users && users[userId])) {
                            reject(API_ERROR.USER_FAILED_TO_FIND);
                            return;
                        }
                        resolve(users[userId]);
                    });
                });
            }).then((user) => {
                let groupIds = user.group_ids || [];

                if (useFuzzy) {
                    // 沒有輸入搜尋的關鍵字樣本，回傳空陣列
                    if (!queryEmail) {
                        return [];
                    }

                    return fuseHlp.searchUser(queryEmail).then((result) => {
                        // 如果搜尋結果超過5筆，只需回傳5筆
                        if (result.length > 5) {
                            return result.slice(0, 5);
                        }
                        return result;
                    });
                }

                return groupsMdl.findUserIds(groupIds, true).then((userIds) => {
                    if (!userIds) {
                        return Promise.reject(API_ERROR.GROUP_MEMBER_USER_FAILED_TO_FIND);
                    };
                    (userIds.indexOf(userId) < 0) && userIds.push(userId);

                    return new Promise((resolve, reject) => {
                        // 有 query email 就不搜尋使用者下的所有群組的的所有成員 USERIDs
                        if (queryEmail) {
                            userIds = null;
                        }

                        usersMdl.find(userIds, queryEmail, (users) => {
                            if (!users) {
                                reject(API_ERROR.AUTHENTICATION_USER_FAILED_TO_FIND);
                                return;
                            };
                            resolve(users);
                        });
                    });
                });
            }).then((data) => {
                var suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let userId = req.params.userid;
            let putUser = {};
            ('string' === typeof req.body.name) && (putUser.name = req.body.name);
            ('string' === typeof req.body.company) && (putUser.company = req.body.company);
            ('string' === typeof req.body.phone) && (putUser.phone = req.body.phone);
            ('string' === typeof req.body.address) && (putUser.address = req.body.address);

            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                if ('string' === typeof putUser.name && 0 === putUser.name.length) {
                    reject(API_ERROR.NAME_WAS_EMPTY);
                    return;
                }

                usersMdl.update(userId, putUser, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_UPDATE);
                        return;
                    }
                    resolve(users);
                });
            }).then((users) => {
                // 更新 fuzzy search 清單中此 user 的資料
                fuseHlp.updateUsers(users);

                let redisReqBody = JSON.stringify({
                    users: users,
                    eventName: redisHlp.EVENTS.UPDATE_FUSE_USERS
                });
                return redisHlp.publish(redisHlp.CHANNELS.REDIS_API_CHANNEL, redisReqBody).then(() => {
                    return users;
                });
            }).then((users) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: users
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new UsersController();
})();
