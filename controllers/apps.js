var API_ERROR = require('../config/apiError');
var API_SUCCESS = require('../config/apiSuccess');

var appMdl = require('../models/apps');
var userMdl = require('../models/users');

var apps = {};

apps.getAll = (req, res, next) => {

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                var userId = req.params.userid;
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.getUser(userId, (data) => {
                    if (null === data) {
                        reject(API_ERROR.USER_NOT_EXISTS);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((data) => {
            var appIds = data.app_ids;

            return new Promise((resolve, reject) => {
                appMdl.findAppIdsByUserId(appIds, (data) => {
                    var apps = data;
                    if (null === apps || '' === apps || undefined === apps) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                    }

                    resolve(apps);
                });
            });

        }).then((apps) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
                "data": apps
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                "status": 0,
                "msg": ERROR.MSG,
                "code": ERROR.CODE
            };
            res.status(403).json(json);
        });
}

apps.get = (req, res, next) => {
    var appId = req.params.appid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });


    proceed
        .then(() => {
            return new Promise((resolve, reject) => {


                if ('' === appId || null === appId) {
                    reject(API_ERROR.APPID_IS_EMPTY);
                    return;
                }

                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }

                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appMdl.findByAppId(appId, (data) => {
                    var app = data;
                    if ('' === app || null === app || undefined === app || (app instanceof Array && 0 === app.length)) {
                        reject(API_ERROR.APP_NOT_EXISTS);
                        return;
                    }

                    resolve(app);
                });
            });
        }).then((data) => {
            var app = data;
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
                "data": app
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                "status": 0,
                "msg": ERROR.MSG,
                "code": ERROR.CODE
            };
            res.status(403).json(json);
        });


}

apps.post = (req, res, next) => {
    var userId = req.params.userid;
    var id1 = req.body.id1;
    var id2 = req.body.id2;
    var name = req.body.name;
    var secret = req.body.secret;
    var token1 = req.body.token1;
    var token2 = req.body.token2;
    var type = req.body.type;

    var postApp = {
        id1: req.body.id1,
        id2: req.body.id2,
        name: req.body.name,
        secret: req.body.secret,
        token1: req.body.token1,
        token2: req.body.token2,
        type: req.body.type,
        user_id: req.params.userid
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.USERID_NOT_EXISTS);
                    return;
                }

                if ('' === id1 || null === id1 || undefined === id1) {
                    reject(API_ERROR.ID1_IS_EMPTY);
                    return;
                }

                if ('' === name || null === name || undefined === name) {
                    reject(API_ERROR.NAME_IS_EMPTY);
                    return;
                }

                if ('' === secret || null === secret || undefined === secret) {
                    reject(API_ERROR.SECRET_IS_EMPTY);
                    return;
                }

                if ('' === token1 || null === token1 || undefined === token1) {
                    reject(API_ERROR.TOKEN1_IS_EMPTY);
                    return;
                }

                if ('' === type || null === type || undefined === type) {
                    reject(API_ERROR.TYPE_IS_EMPTY);
                    return;
                }

                resolve();
            });

        }).then(() => {
            return new Promise((resolve, reject) => {
                appMdl.insertByUserid(userId, postApp, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_INSERTED_FAIL);
                        return;
                    }

                    resolve();

                });
            });

        }).then(() => {
            var json = {
                "status": 1,
                "msg": 'data inserted success'
            }
            res.status(200).json(json);

        }).catch((ERROR) => {
            var json = {
                "status": 0,
                "msg": ERROR.MSG,
                "code": ERROR.CODE
            };
            res.status(403).json(json);
        });
}
apps.put = (req, res, next) => {

}

apps.delete = (req, res, next) => {

}

module.exports = apps;