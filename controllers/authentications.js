module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const authenticationsMdl = require('../models/authentications');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');
    const fuseHlp = require('../helpers/fuse');

    function AuthenticationsController() {};

    AuthenticationsController.prototype.getAll = function(req, res, next) {
        let userId = req.params.userid;
        let queryEmail = req.query.email;
        let useFuzzy = !!req.query.fuzzy;

        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.find(userId, null, (users) => {
                    if (!users) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    };
                    resolve(users[userId]);
                });
            });
        }).then((user) => {
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
                    if (null !== queryEmail && undefined !== queryEmail && '' !== queryEmail) {
                        userIds = null;
                    }

                    authenticationsMdl.findUser(userIds, queryEmail, (authentications) => {
                        if (null === authentications || undefined === authentications || '' === authentications) {
                            reject(API_ERROR.AUTHENTICATION_USER_FAILED_TO_FIND);
                        };
                        resolve(authentications);
                    });
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
                msg: ERROR.MSG || ERROR.message,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AuthenticationsController();
})();
