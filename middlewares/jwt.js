var API_ERROR = require('../config/api_error');

var admin = require('firebase-admin');

var jwt = {};

jwt.verify = (req, res, next) => {

    var idToken = req.headers['authorization'] || req.headers['Authorization'];

    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced
        .then(() => {
            if ('' === idToken || undefined === idToken || null === idToken) {
                return Promise.reject(API_ERROR.USER_IS_NOT_AUTHORIZED);
            }
            return admin.auth().verifyIdToken(idToken);
        }).then((tokenObj) => {
            return new Promise((resolve, reject) => {

                req = Object.assign(req, tokenObj);

                var uid = req.uid;
                var userId = req.params.userid;
                if (uid !== userId) {
                    reject(API_ERROR.USER_IS_NOT_PERMITTED);
                    return;
                }
                resolve();
            });

        }).then(() => {
            next();
        }).catch((ERROR) => {
            ERROR.CODE = ERROR.code ? ERROR.code : ERROR.CODE;
            ERROR.MSG = ERROR.message ? ERROR.message : ERROR.MSG;

            var json = {
                "status": 0,
                "msg": ERROR.MSG,
                "code": ERROR.CODE
            };
            res.status(401).json(json);
        });
}

module.exports = jwt;