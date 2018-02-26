const API_ERROR = require('../config/api_error');

const admin = require('firebase-admin');

const jwt = {
    verify: (req, res, next) => {
        let idToken = req.headers.authorization || req.headers.Authorization;

        let procced = Promise.resolve();
        procced.then(() => {
            if (!idToken) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_AUTHORIZED);
            }
            return admin.auth().verifyIdToken(idToken, true);
        }).then((decodedToken) => {
            return new Promise((resolve, reject) => {
                req = Object.assign(req, decodedToken);

                let uid = req.uid;
                let userId = req.params.userid;
                if (uid !== userId) {
                    reject(API_ERROR.USER_WAS_NOT_PERMITTED);
                    return;
                }
                resolve();
            });
        }).then(() => {
            next();
        }).catch((ERROR) => {
            ERROR.CODE = ERROR.code ? ERROR.code : ERROR.CODE;
            ERROR.MSG = ERROR.message ? ERROR.message : ERROR.MSG;

            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(401).json(json);
        });
    }
};

module.exports = jwt;
