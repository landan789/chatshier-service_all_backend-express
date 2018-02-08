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
            res.status(403).json(json);
        });
    };

    UsersController.prototype.update = (req, res, next) => {
        let userId = req.params.userid;
        let userData = {
            company: req.body.company,
            phonenumber: req.body.phonenumber,
            address: req.body.address
        };

        return new Promise((resolve, reject) => {
            if (!userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            usersMdl.updateUserByUserId(userId, userData, () => {
                resolve();
            });
        }).then(() => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            let json = {
                status: 0,
                mgs: ERR.MSG,
                code: ERR.CODE
            };
            res.status(403).json(json);
        });
    };

    let instance = new UsersController();
    return instance;
})();
