var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var express = require('express');
var users = require('../models/users');
var appsTemplatesMdl = require('../models/apps_templates');
var appsAutorepliesCtl = require('../controllers/apps_autoreplies');
var appsCtl = require('../controllers/apps');
var appsTicketsCtl = require('../controllers/apps_tickets');
var calendarCtl = require('../controllers/calendars_events');
var appsRichmenusCtl = require('../controllers/apps_richmenus');

var router = express.Router();

router.get('/apps/users/:userid', appsCtl.getAll);
router.get('/apps/apps/:appid/users/:userid', appsCtl.getOne);
router.post('/apps/users/:userid', appsCtl.postOne);
router.put('/apps/apps/:appid/users/:userid', appsCtl.putOne);
router.delete('/apps/apps/:appid/users/:userid', appsCtl.deleteOne);

router.get('/apps-tickets/users/:userid', appsTicketsCtl.getAllByUserid);
router.get('/apps-tickets/apps/:appid/users/:userid', appsTicketsCtl.getAllByAppIdByUserid);
router.get('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.getOne);
router.post('/apps-tickets/apps/:appid/users/:userid', appsTicketsCtl.postOne);
router.put('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.putOne);
router.delete('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.deleteOne);

//圖文選單
router.get('/apps-richmenus/users/:userid', appsRichmenusCtl.getByUserId);
router.get('/apps-richmenus/apps/:appid/users/:userid', appsRichmenusCtl.getByAppIdByuserId);
router.get('/apps-richmenus/richmenus/:richmenuid/apps/:appid/users/:userid', appsRichmenusCtl.getOne);
router.post('/apps-richmenus/apps/:appid/users/:userid', appsRichmenusCtl.postOne);
router.put('/apps-richmenus/richmenus/:richmenuid/apps/:appid/users/:userid', appsRichmenusCtl.putOne);
router.delete('/apps-richmenus/richmenus/:richmenuid/apps/:appid/users/:userid', appsRichmenusCtl.deleteOne);

// 自動回覆
router.get('/apps-autoreplies/users/:userid', appsAutorepliesCtl.getAll);
router.get('/apps-autoreplies/autoreplies/:autoreplyid/apps/:appid/users/:userid', appsAutorepliesCtl.getOne);
router.post('/apps-autoreplies/apps/:appid/users/:userid', appsAutorepliesCtl.postOne);
router.put('/apps-autoreplies/autoreplies/:autoreplyid/apps/:appid/users/:userid', appsAutorepliesCtl.putOne);
router.delete('/apps-autoreplies/autoreplies/:autoreplyid/apps/:appid/users/:userid', appsAutorepliesCtl.deleteOne);

router.get('/apps-templates/users/:userid', (req, res, next) => {
    var userId = req.params.userid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {

            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_WAS_EMPTY)
                    } else
                        resolve(data);
                });
            });

        })
        .then((data) => {
            return new Promise((resolve, reject) => {
                let appid = data[0];
                appsTemplatesMdl.findByAppId(appid, (info) => {
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
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
router.post('/apps-templates/apps/:appid/users/:userid', (req, res, next) => {
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
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                    } else
                        resolve(data);
                });
            });
        }).then((data) => {
            return new Promise((resolve, reject) => {
                appsTemplatesMdl.insertByAppId(data[0], dataObj, () => {
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG
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

router.put('/apps-templates/apps/:appid/templates/:templateid/users/:userid', (req, res, next) => {
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
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (Data) => {
                    if (Data === null) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                    } else {
                        resolve(Data);
                    }
                })
            });
        }).then((Data) => {
            return new Promise((resolve, reject) => {
                let appIds = Data;
                appIds.map((appId) => {
                    appsTemplatesMdl.updateByAppIdByTemplateId(appId, templateId, dataObj, () => {
                        resolve();
                    })
                });



            });

        }).then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
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
router.delete('/apps-templates/apps/:appid/templates/:templateid/users/:userid', (req, res, next) => {

    var userId = req.params.userid;
    var templateId = req.params.templateid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed.then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                users.findAppIdsByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                    } else
                        resolve(data);
                })
            });
        }).then((data) => {
            return new Promise((resolve, reject) => {
                var appIds = data;
                appIds.map((appId) => {
                    appsTemplatesMdl.removeByAppIdByTemplateId(appId, templateId, () => {
                        resolve();
                    });
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG

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
router.get('/users/users/:userid', (req, res, next) => {
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                users.findUserByUserId(userId, (data) => {
                    if (data === null) {
                        reject(API_ERROR.USER_DID_NOT_EXIST);
                    } else {
                        resolve(data);
                    }
                })
            });
        })
        .then((data) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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

router.put('/users/users/:userid', (req, res, next) => {
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
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                users.updateUserByUserId(userId, userObj);
                resolve();
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG
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

router.get('/calendars/users/:userid', calendarCtl.getAll);

router.post('/calendars-events/users/:userid', calendarCtl.postOne);
router.put('/calendars-events/calendars/events/:eventid/users/:userid', calendarCtl.putOne);
router.delete('/calendars-events/calendars/events/:eventid/users/:userid', calendarCtl.deleteOne);


module.exports = router;
