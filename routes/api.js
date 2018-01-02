var API_ERROR = require('../config/apiError');
var express = require('express');
var admin = require('firebase-admin');
var users = require('../models/users');
var apps = require('../models/apps');
var autos = require('../models/autos');
var router = express.Router();

router.get('/apps/appid/:appid', (req, res, next) => {


});

router.get('/apps/userid/:userid', (req, res, next) => {


    var p = new Promise((resolve, reject) => {
        resolve();
    });

    p.then(() => {
        return new Promise((resolve, reject) => {
            var userId = req.params.userid;
            if ('' === userId || null === userId) {
                reject(API_ERROR.ERROR_USERID_NOT_EXISTS);
                return;
            }
            users.getUser(userId, (data) => {
                if (null === data) {
                    reject(API_ERROR.ERROR_USER_NOT_EXISTS);
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
    }).catch((ERR) => {
        var json = {
            "status": 0,
            "mgs": ERR.MSG,
            "code": ERR.CODE
        };
        res.status(403).json(json);
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
            users.getAppIdFromUsers(userId, (data) => {
                if(data !== null) {
                    resolve(data)
                } else {
                    reject('App ID document is empty')
                }
            })
        });
    })
    .then((data) => {
        // console.log(data);
        return new Promise((resolve,reject) => {
            apps.getAutoById(data[0], (snap) => {
                let id = snap;
                resolve(id)
            });
        })
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            let id = data
            let arr = [];
            id.map((item) => {
                autos.getAutoInfoById(item, snap => {
                    arr.push(snap);
                    if(arr.length === id.length) {
                        resolve(arr);
                    }
                });
            });
        });
    })
    .then((data) => {
        res.json({Data:data});
    })
    .catch((reason) => {
        res.json({message:reason});
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
            autos.post(dataObj, (data) => {
                let key = data;
                if(key !== null && key !== undefined) {
                    resolve(key);
                } else {
                    reject('no key return after post');
                }
            });
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            users.getAppIdFromUsers(userId, (snap) => {
                let hashArr = snap;
                if(hashArr !== null && hashArr !== undefined) {
                    var obj = {
                        hashArr: hashArr,
                        key: data
                    }
                    resolve(obj);
                } else {
                    reject('user does not have any app initialized');
                }
            });
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            let hashArr = data.hashArr;
            let key = data.key;
            console.log(hashArr);
            console.log(key);
            hashArr.map((item) => {
                // console.log(item);
                apps.updateKeyFromAutoreplies(item,key);
            });
            resolve();
        });
    })
    .then(() => {
        res.json({message:'Data Sent!'});
    })
    .catch((reason) => {
        console.log(reason);
    });
});

router.put('/autoreplies/:hashId', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var hashId = req.params.hashId;
    var dataObj = {
        hash: hashId,
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
            autos.update(dataObj,hashId,(data) => {
                resolve();
            });
        });
    })
    .then(() => {
        res.json({message:'Data Updated!'});
    })
    .catch((reason) => {
        res.json({message:reason});
    });
});

router.delete('/autoreplies/:userId/:hashId', (req, res, next) => {
    var userId = req.params.userId;
    var hashId = req.params.hashId;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
        return new Promise((resolve,reject) => {
            users.getAppIdFromUsers(userId, (data) => {
                if(data !== null) {
                    resolve(data)
                } else {
                    reject('App ID document is empty')
                }
            })
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            data.map((item) => {
                apps.removeAutoInAppsById(item,hashId,() => {
                    resolve();
                });
            });
        });
    })
    .then(() => {
        return new Promise((resolve,reject) => {
            autos.del(hashId, () => {
                resolve();
            })
        });
    })
    .then(() => {
        res.json({message:'Data Deleted!'});
    })
    .catch((reason) => {
        res.json({message:reason});
    });
});

module.exports = router;