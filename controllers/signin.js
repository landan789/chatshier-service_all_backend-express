module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const CHATSHIER = require('../config/chatshier');
    let usersMdl = require('../models/users');
    let jwt = require('jsonwebtoken');

    class SigninController {
        postOne(req, res, next) {
            let userId = 'sd25G55xzf09666';
            let payload = {
                sub: CHATSHIER.JWT.SUBJECT,
                iss: CHATSHIER.JWT.ISSUER,
                adu: CHATSHIER.JWT.AUDIENCE,
                exp: Date.now() + CHATSHIER.JWT.EXPIRE_TIME,
                iat: Date.now(),
                uid: userId
            };
            let token = jwt.sign(payload, CHATSHIER.JWT.SECRECT);
            res.json({message: 'ok', token: token});
        }
    };
    let signinController = new SigninController();
    return signinController;
})();
