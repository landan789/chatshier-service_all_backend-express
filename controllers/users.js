module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');
    const fuseHlp = require('../helpers/fuse');
    const redisHlp = require('../helpers/redis');

    function UsersController() {}

    UsersController.prototype.getOne = (req, res, next) => {
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
                let pattern = queryEmail;

                // 沒有輸入搜尋的關鍵字樣本，回傳空陣列
                if (!pattern) {
                    return [];
                }

                return fuseHlp.searchUser(pattern).then((result) => {
                    // 如果搜尋結果超過5筆，只需回傳5筆
                    if (result.length > 5) {
                        return result.slice(0, 5);
                    }
                    return result;
                });
            }

            return new Promise((resolve, reject) => {
                groupsMdl.findUserIds(groupIds, (userIds) => {
                    if (!userIds) {
                        reject(API_ERROR.GROUP_MEMBER_USER_FAILED_TO_FIND);
                        return;
                    };
                    (userIds.indexOf(userId) < 0) && userIds.push(userId);
                    resolve(userIds);
                });
            }).then((userIds) => {
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
            res.status(500).json(json);
        });
    };

    UsersController.prototype.postOne = (req, res, next) => {
        let userId = req.params.userid;
        let postUser = {
            company: undefined === req.body.company ? '' : req.body.company,
            phone: undefined === req.body.phone ? '' : req.body.phone,
            address: undefined === req.body.address ? '' : req.body.address
        };
        return new Promise((resolve, reject) => {
            if (!userId) {
                return reject(API_ERROR.USERID_WAS_EMPTY);
            };
            usersMdl.insert(postUser, (users) => {
                if (!users) {
                    reject(API_ERROR.USER_FAILED_TO_INSERT);
                    return;
                }
                resolve(users);
            });
        }).then((users) => {
            // 更新 user fuzzy search 清單，使搜尋時可找到此 user
            let userIds = Object.keys(users);
            fuseHlp.updateUsers(userIds);

            let redisReqBody = JSON.stringify({
                userIds: userIds,
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
    };

    UsersController.prototype.putOne = (req, res, next) => {
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
            let userIds = Object.keys(users);
            fuseHlp.updateUsers(userIds);

            let redisReqBody = JSON.stringify({
                userIds: userIds,
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
    };

    let instance = new UsersController();
    return instance;
})();
