var API_ERROR = require('../config/apiError');
var express = require('express');
var users = require('../models/users');
var apps = require('../models/apps');
var autoreplies = require('../models/autoreplies');
var router = express.Router();

router.get('/apps/appid/:appid', (req, res, next) => {
});

router.get('/apps/users/:userid', (req, res, next) => {

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
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
            apps.getAppsByAppIds(appIds, (data) => {
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
            "msg": 'ERROR.MSG',
            "code": 'ERROR.CODE'
        };
        res.status(403).json(json);
    });
});

router.get('/apps/:appid/users/:userid', (req, res, next) => {
    var appId = req.params.appid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });


    proceed
    .then(()=>{
        return new Promise((resolve, reject)=>{


            if ('' === appId || null === appId) {
                reject(API_ERROR.APPID_NOT_EXISTS);
                return;
            }

            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }

            resolve();
        });
    }).then(()=>{
        return new Promise((resolve, reject)=>{
            apps.findByAppId(appId, (data)=>{
                var app = data;
                if('' === app || null === app || undefined === app || (app instanceof Array && 0 === app.length)){
                    reject(API_ERROR.APP_NOT_EXISTS);
                    return;
                }

                resolve(app);
            });
        });
    }).then((data)=>{
        var app = data;
        var json = {
            "status": 1,
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


});

router.post('/apps/users/:userid', (req, res, next) => {
    var userId = req.params.userid;
    var id1 = req.body.id1;
    var id2 = req.body.id2;
    var name = req.body.name;
    var secret = req.body.secret;
    var token1 = req.body.token1;
    var token2 = req.body.token2;
    var type = req.body.type;

    var postData = {
        id1: req.body.id1,
        id2: req.body.id2,
        name: req.body.name,
        secret: req.body.secret,
        token1: req.body.token1,
        token2: req.body.token2,
        type: req.body.type
    }

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
        return new Promise((resolve, reject)=>{
            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            resolve();
        });

    }).then(() => {

    }).catch(() => {

    });
});

// 自動回覆
router.get('/autoreplies/:userid', (req, res, next) => {
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
            users.getAppIdFromUsers(userId, (data) => {
                if(data === null) {
                    reject(API_ERROR.USER_NOT_EXISTS);
                } else {
                    resolve(data);
                }
            })
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            let appId = data[0];
            autoreplies.find(appId,(info) => {
                if(info === null) {
                    reject();
                } else {
                    resolve(info);
                }
            });
        })
    })
    .then((data) => {
        let result = data !== undefined ? data : {};
        var json = {
            "status": 1,
            "data": result
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

router.post('/autoreplies/:userid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var dataObj = {
        userId: userId,
        name: req.body.name,
        start: req.body.start,
        end: req.body.end,
        content: req.body.content
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
            users.getAppIdFromUsers(userId, (data) => {
                if(data === null) {
                    reject(API_ERROR.USER_NOT_EXISTS);
                } else {
                    resolve(data);
                }
            })
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            autoreplies.insert(data[0], dataObj, (autorepliesid) => {
                resolve(autorepliesid);
            });
        });
    })
    .then((data) => {
        var json = {
            "status": 1,
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

router.put('/autoreplies/:userid/:autoreplyid', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var autoreplyId = req.params.autoreplyid;
    var dataObj = {
        userId: userId,
        autoreplyId: autoreplyId,
        name: req.body.name,
        start: req.body.start,
        end: req.body.end,
        content: req.body.content
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
            users.getAppIdFromUsers(userId, (data) => {
                if(data === null) {
                    reject(API_ERROR.USER_NOT_EXISTS);
                } else {
                    resolve(data);
                }
            })
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            let appIds = data;
            appIds.map((appId) => {
                autoreplies.update(appId,autoreplyId,dataObj,() => {
                    resolve();
                });
            });
        });
    })
    .then(() => {
        var json = {
            "status": 1,
            "data": 'Data Updated!'
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

router.delete('/autoreplies/:userid/:autoreplyid', (req, res, next) => {
    var userId = req.params.userid;
    var autoreplyId = req.params.autoreplyid;

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
            users.getAppIdFromUsers(userId, (data) => {
                if(data === null) {
                    reject(API_ERROR.USER_NOT_EXISTS);
                } else {
                    resolve(data);
                }
            })
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            let appIds = data;
            appIds.map((appId) => {
                autoreplies.remove(appId,autoreplyId, () => {
                    resolve();
                });
            });
        });
    })
    .then(() => {
        var json = {
            "status": 1,
            "data": 'Data Deleted!'
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

module.exports = router;