module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    var authenticationsMdl = require('../models/authentications');

    function AuthenticationsController() {};

    AuthenticationsController.prototype.getOne = function(req, res, next) {
        var email = req.query.email;

        Promise.resolve().then(() => {
            if (null === email || undefined === email || '' === email) {
                return Promise.reject(API_ERROR.EMAIL_WAS_EMPTY);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                authenticationsMdl.findUser(email, (userRecord) => {
                    if (null === userRecord || undefined === userRecord || '' === userRecord) {
                        reject(API_ERROR.AUTHENTICATION_USER_FAILED_TO_FIND);
                    };
                    resolve(userRecord);
                });
            });
        }).then((userRecord) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: userRecord
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

    return new AuthenticationsController();
})();