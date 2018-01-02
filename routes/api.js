var API_ERROR = require('../config/apiError');
var express = require('express');
var admin = require('firebase-admin');
var users = require('../models/users');
var apps = require('../models/apps');
var autoreplies = require('../models/autoreplies');
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
router.get('/autoreplies/:autosUserId', (req, res, next) => {
    var autosUserId = req.params.autosUserId;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
        return new Promise((resolve,reject) => {
            if ('' === autosUserId || null === autosUserId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.getAppIdFromUsers(autosUserId, (data) => {
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
            if(data) {
                apps.getAutoById(data[0], (snap) => {
                    let id = snap;
                    if(snap !== null) {
                        resolve(id);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        })
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            if(data !== undefined) {
                let id = data
                let arr = [];
                id.map((item) => {
                    autoreplies.getAutoInfoById(item, snap => {
                        if(snap !== null) {
                            arr.push(snap);
                            if(arr.length === id.length) {
                                resolve(arr);
                            }
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                resolve();
            }
        });
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

router.post('/autoreplies/:autosUserId', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var autosUserId = req.params.autosUserId;
    var dataObj = {
        autosUserId: autosUserId,
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
            autoreplies.post(dataObj, (data) => {
                let autosKey = data;
                if(autosKey !== null && autosKey !== undefined) {
                    resolve(autosKey);
                } else {
                    reject();
                }
            });
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            if ('' === autosUserId || null === autosUserId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.getAppIdFromUsers(autosUserId, (snap) => {
                let hashArr = snap;
                if(hashArr !== null && hashArr !== undefined) {
                    var obj = {
                        hashArr: hashArr,
                        key: data
                    }
                    resolve(obj);
                } else {
                    reject(API_ERROR.USER_NOT_EXISTS);
                }
            });
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            let hashArr = data.hashArr;
            let key = data.key;
            hashArr.map((item) => {
                apps.updateKeyFromAutoreplies(item,key);
            });
            resolve();
        });
    })
    .then(() => {
        var json = {
            "status": 1,
            "data": 'Data Created!'
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

router.put('/autoreplies/:autosHashId', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var autosHashId = req.params.autosHashId;
    var dataObj = {
        autosHashId: autosHashId,
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
            autoreplies.update(dataObj,autosHashId,() => {
                resolve();
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

router.delete('/autoreplies/:autosUserId/:autosHashId', (req, res, next) => {
    var autosUserId = req.params.autosUserId;
    var autosHashId = req.params.autosHashId;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
    .then(() => {
        return new Promise((resolve,reject) => {
            if ('' === autosUserId || null === autosUserId) {
                reject(API_ERROR.USERID_NOT_EXISTS);
                return;
            }
            users.getAppIdFromUsers(autosUserId, (data) => {
                if(data !== null) {
                    resolve(data)
                } else {
                    reject(API_ERROR.USER_NOT_EXISTS);
                }
            })
        });
    })
    .then((data) => {
        return new Promise((resolve,reject) => {
            data.map((item) => {
                apps.removeAutoInAppsById(item,autosHashId,() => {
                    resolve();
                });
            });
        });
    })
    .then(() => {
        return new Promise((resolve,reject) => {
            autoreplies.del(autosHashId, () => {
                resolve();
            })
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