var API_ERROR = require('../config/apiError');
var API_SUCCESS = require('../config/apiSuccess');
var express = require('express');
var users = require('../models/users');
var apps = require('../models/apps');
var templates = require('../models/templates');
var autorepliesCtl = require('../controllers/autoreplies');
var appCtl = require('../controllers/apps');
var richmenuCtl =require('../controllers/richmenus')
var router = express.Router();

router.get('/apps/users/:userid', appCtl.getAll);
router.get('/apps/:appid/users/:userid', appCtl.get);
router.post('/apps/users/:userid', appCtl.post);
router.put('/apps/:appid/users/:userid', appCtl.put);
router.delete('/apps/:appid/users/:userid', appCtl.delete);

router.get('/richmenus/apps/:appid/users/:userid', richmenuCtl.getAll);
router.get('/richmenus/:richmenuid/apps/:appid/users/:userid', richmenuCtl.get);
router.post('/richmenus/apps/:appid/users/:userid', richmenuCtl.post);
router.put('/richmenus/:richmenuid/apps/:appid/users/:userid', richmenuCtl.put);
router.delete('/richmenus/:richmenuid/apps/:appid/users/:userid', richmenuCtl.delete);

// 自動回覆
router.get('/autoreplies/users/:userid', autorepliesCtl.getAll);
router.get('/autoreplies/:autoreplyid/apps/:appid/users/:userid', autorepliesCtl.get);
router.post('/autoreplies/apps/:appid/users/:userid', autorepliesCtl.post);
router.put('/autoreplies/:autoreplyid/apps/:appid/users/:userid', autorepliesCtl.put);
router.delete('/autoreplies/:autoreplyid/apps/:appid/users/:userid', autorepliesCtl.delete);
router.get('/templates/users/:userid', (req, res, next) => {
    var userId = req.params.userid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {

            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_IS_EMPTY)
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
                "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
                "data": result

            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })
});
// insert
router.post('/templates/users/:userid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var dataObj = {
        userId: userId,
        keyword: req.body.keyword,
        type: req.body.type,
        content: req.body.content
    }
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed.then(() => {
            return new Promise((resolve, reject) => {

                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_IS_EMPTY);
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
                "msg": API_SUCCESS.DATA_INSERTED_SUCCESS.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });


});
//update

router.put('/templates/:templateid/users/:userid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var templateId = req.params.templateid;
    var dataObj = {
        userId: userId,
        templateId: templateId,
        keyword: req.body.keyword,
        type: req.body.type,
        content: req.body.content
    }
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (Data) => {
                    if (Data === null) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                    } else {
                        resolve(Data);
                    }
                })
            });
        }).then((Data) => {
            return new Promise((resolve, reject) => {
                let appIds = Data;
                appIds.map((appId) => {
                    templates.updateByAppIdByTemplateId(appId, templateId, dataObj, () => {
                        resolve();
                    })
                });



            });

        }).then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_UPDATED_SUCCESS.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });



});
//delete
router.delete('/templates/:templateid/users/:userid', (req, res, next) => {

    var userId = req.params.userid;
    var templateId = req.params.templateid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed.then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_IS_EMPTY);
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
                "msg": API_SUCCESS.DATA_DELETED_SUCCESS.MSG

            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })
})

// Vendor的個人資料
router.get('/users/:userid', (req, res, next) => {
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
        return new Promise((resolve,reject) => {
            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.findUserByUserId(userId, (data) => {
                if(data === null) {
                    reject(API_ERROR.USER_NOT_EXISTS);
                } else {
                    resolve(data);
                }
            })
        });
    })
    .then((data) => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
            "data": data
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

router.put('/users/:userid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var userObj = {
        company: req.body.company,
        phonenumber: req.body.phonenumber,
        address: req.body.address
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
        return new Promise((resolve,reject) => {
            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.updateUserByUserId(userId,userObj);
            resolve();
        });
    })
    .then(() => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG
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

module.exports = router
