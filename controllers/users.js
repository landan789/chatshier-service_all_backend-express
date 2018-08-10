module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');

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
            let queryEmail = (req.query.email || '').toLowerCase();
            let useFuzzy = !!req.query.fuzzy;

            // searchUser 回傳的型態為陣列與 model 回傳的型態不同
            // 代碼可能不安全，因此將之分開處理
            if (useFuzzy) {
                return Promise.resolve().then(() => {
                    if (!userId) {
                        return Promise.reject(ERROR.USERID_WAS_EMPTY);
                    }

                    // 沒有輸入搜尋的關鍵字樣本，回傳空陣列
                    if (!queryEmail) {
                        return Promise.resolve([]);
                    }

                    return fuseHlp.searchUser(queryEmail).then((usersArray) => {
                        // 如果搜尋結果超過 5 筆，只需回傳 5 筆
                        if (usersArray.length > 5) {
                            usersArray = usersArray.slice(0, 5);
                        }
                        return Promise.resolve(usersArray);
                    });
                }).then((users) => {
                    let suc = {
                        msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                        data: users
                    };
                    return this.successJson(req, res, suc);
                }).catch((err) => {
                    return this.errorJson(req, res, err);
                });
            }

            return Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USERID_WAS_EMPTY);
                }

                return usersMdl.find(userId).then((users) => {
                    if (!(users && users[userId])) {
                        return Promise.reject(ERROR.USER_FAILED_TO_FIND);
                    }
                    return Promise.resolve(users[userId]);
                });
            }).then((user) => {
                let groupIds = user.group_ids || [];

                return groupsMdl.findUserIds(groupIds, true).then((userIds) => {
                    if (!userIds) {
                        return Promise.reject(ERROR.GROUP_MEMBER_USER_FAILED_TO_FIND);
                    }
                    (userIds.indexOf(userId) < 0) && userIds.push(userId);

                    // 有 query email 就不搜尋使用者下的所有群組的的所有成員 USERIDs
                    return usersMdl.find(queryEmail ? void 0 : userIds, queryEmail).then((users) => {
                        if (!users) {
                            return Promise.reject(ERROR.AUTHENTICATION_USER_FAILED_TO_FIND);
                        }
                        return Promise.resolve(users);
                    });
                });
            }).then((users) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: users
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
                    reject(ERROR.USERID_WAS_EMPTY);
                    return;
                }

                if ('string' === typeof putUser.name && 0 === putUser.name.length) {
                    reject(ERROR.NAME_WAS_EMPTY);
                    return;
                }

                usersMdl.update(userId, putUser, (users) => {
                    if (!users) {
                        reject(ERROR.USER_FAILED_TO_UPDATE);
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
