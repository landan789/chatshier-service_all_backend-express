var API_ERROR = require('../config/apiError');
var express = require('express');
var admin = require('firebase-admin');
var users = require('../models/users');
var apps = require('../models/apps');
var templates = require('../models/templates');
var router = express.Router();

router.get('/apps/users/:userid', (req, res, next) => {

    var p = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            var userId = req.params.userid;
            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.getUser(userId, (data) => {
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
            apps.findAppIdsByUserId(appIds, (data) => {
                var apps = data;
                if (null === apps || '' === apps || undefined === apps) {
                    reject();
                }

                resolve(apps);
            });
        });

    }).then((apps) => {
        var json = {
            "status": 1,
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
});


//template 樣板   //find
router.get('/templates/:userid', (req, res, next) => {
    var userId = req.params.userid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {

            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.ERROR_USERID_NOT_EXISTS);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.ERROR_USERID_NOT_EXISTS)
                    } else
                        resolve(data);
                });
            });

        })
        .then((data) => {
            return new Promise((resolve, reject) => {
                let appid = data[0];
                templates.findByAppId(appid, (info) => {
                    if (info === null) {
                        reject();
                    } else
                        resolve(info);
                });
            });
        })
        .then((info) => {
            let result = info !== undefined ? info : {};
            var json = {
                "status": 1,
                "data": result

            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "mgs": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })
});
// insert
router.post('/templates/:userid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var dataObj = {
        userId: userId,
        name: req.body.name,
        content: req.body.content
    }
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed.then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_NOT_EXISTS);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.USER_NOT_EXISTS);
                    } else
                        resolve(data);
                });
            });
        }).then((data) => {
            return new Promise((resolve, reject) => {
                templates.insertByAppId(data[0], dataObj, () => {
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "data": 'Data Created! '
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "mgs": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });


});
//update
router.put('/templates/:userid/:templatesid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var templatesId = req.params.templatesid;
    var dataObj = {
        userId: userId,
        templatesId: templatesId,
        name: req.body.name,
        content: req.body.content
    }
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_NOT_EXISTS);
                    return;
                }
                users.findAppIdsByUserId(userId, (Data) => {
                    if (Data === null) {
                        reject(API_ERROR.USER_NOT_EXISTS);
                    } else {
                        resolve(Data);
                    }
                })
            });
        }).then((Data) => {
            return new Promise((resolve, reject) => {
                let appIds = Data;
                appIds.map((appId) => {
                    templates.updateByAppIdByTemplateId(appId, templatesId, dataObj, () => {
                        resolve();
                    })
                });



            });

        }).then(() => {
            var json = {
                "status": 1,
                "data": 'Data Update!'
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "mgs": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });



});

//delete
router.delete('/templates/:userid/:templateid', (req, res, next) => {

    var userId = req.params.userid;
    var templateId = req.params.templateid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed.then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.ERROR_USERID_NOT_EXISTS);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.ERROR_USERID_NOT_EXISTS);
                    } else
                        resolve(data);
                })
            });
        }).then((data) => {
            return new Promise((resolve, reject) => {
                var appIds = data;
                appIds.map((appId) => {
                    templates.removeByAppIdByTemplateId(appId, templateId, () => {
                        resolve();
                    });
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "data": 'Data Remove!'

            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "mgs": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })
})





module.exports = router