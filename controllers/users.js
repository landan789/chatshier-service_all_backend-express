module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const usersMdl = require('../models/users');

    function UsersController() {}

    UsersController.prototype.getOne = (req, res, next) => {
        let userId = req.params.userid;

        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findUser(userId, (user) => {
                    if (!user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
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
        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                if (!userId) {
                    return reject(API_ERROR.USERID_WAS_EMPTY);
                };
                usersMdl.insert(userId, postUser, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(users);
                });
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

            usersMdl.updateUserByUserId(userId, userData, (users) => {
                if (!users) {
                    reject(API_SUCCESS.USER_FAILED_TO_UPDATE);
                    return;
                }
                resolve(users);
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