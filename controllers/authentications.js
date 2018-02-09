module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    var authenticationsMdl = require('../models/authentications');
    var usersMdl = require('../models/users');
    var groupsMdl = require('../models/groups');

    function AuthenticationsController() {};

    AuthenticationsController.prototype.getAll = function(req, res, next) {
        var userId = req.params.userid;
        var queryEmail = req.query.email;

        Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(userId, (user) => {
                    if (null === user || undefined === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                    };
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids || [];

            return new Promise((resolve, reject) => {
                groupsMdl.findUserIds(groupIds, (userIds) => {
                    if (null === userIds || undefined === userIds || '' === userIds) {
                        reject(API_ERROR.GROUP_MEMBER_USER_FAILED_TO_FIND);
                    };
                    (userIds.indexOf(userId) < 0) && userIds.push(userId);
                    resolve(userIds);
                });
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
        }).then((authentications) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: authentications
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG || ERROR.message,
                code: ERROR.CODE
            };
            res.status(403).json(json);
        });
    };

    return new AuthenticationsController();
})();