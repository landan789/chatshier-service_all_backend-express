module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const CHATSHIER = require('../config/chatshier');
    let ciperHlp = require('../helpers/cipher');
    let usersMdl = require('../models/users_');
    let jwt = require('jsonwebtoken');

    class SignoutController {
        postOne(req, res, next) {
            let token;
            let users;
            return Promise.resolve().then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.USER_SUCCEEDED_TO_SIGNOUT.MSG,
                    jwt: '',
                    data: {}
                };
                let options = {
                    domain: CHATSHIER.COOKIE.DOMAIN,
                    maxAge: 0,
                    httpOnly: true,
                    expires: new Date(Date.now() - CHATSHIER.JWT.EXPIRES)
                };
                res.cookie('jwt', token, options);
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG
                };
                res.status(500).json(json);
            });
        }
    };
    let signoutController = new SignoutController();
    return signoutController;
})();
