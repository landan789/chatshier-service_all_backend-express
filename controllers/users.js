module.exports = (function() {
    const ControllerCore = require('../cores/controller');

    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

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

                    usersMdl.find(userId, null, (users) => {
                        if (!users) {
                            reject(API_ERROR.USER_FAILED_TO_FIND);
                            return;
                        }
                        resolve(users);
                    });
                });
            }).then((users) => {
                let user = users[userId];
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
                var json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                var json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                console.log(ERROR);
                res.status(500).json(json);
            });
        }

        putOne(req, res, next) {
            let userId = req.params.userid;
            let userData = {
                company: req.body.company,
                phone: req.body.phone,
                address: req.body.address
            };

            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.update(userId, userData, (users) => {
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
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: users
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    mgs: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }
    }

    return new UsersController();
})();
