var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var express = require('express');
var bodyParser = require('body-parser');
var formData = require('express-form-data');

var users = require('../models/users');
var appsTemplatesMdl = require('../models/apps_templates');

var appsAutorepliesCtl = require('../controllers/apps_autoreplies');
var appsCtl = require('../controllers/apps');
var appsTicketsCtl = require('../controllers/apps_tickets');
var calendarsEventsCtl = require('../controllers/calendars_events');
var appsRichmenusCtl = require('../controllers/apps_richmenus');

// ===============
// 訊息相關 Ctrl (Create By Peace 2018/01/25)
var appsMessagersCtl = require('../controllers/apps_messagers');
var appsChatroomsMessagesCtl = require('../controllers/apps_chatrooms_messages');
// ===============

var appsKeywordrepliesCtl = require('../controllers/apps_keywordreplies');

var router = express.Router();

// HTTP body 允許 json 格式
// HTTP body form-data parser
router.use(
    bodyParser.json(),
    formData.parse({ autoFiles: true }),
    formData.format(),
    formData.stream(),
    formData.union()
);

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

// ===============
// 取得聊天室訊息API (Create By Peace 2018/01/25)
router.get('/apps-messagers/users/:userid', appsMessagersCtl.getAll);
router.get('/apps-messagers/apps/:appid/users/:userid', appsMessagersCtl.getAllByAppId);
router.get('/apps-chatrooms-messages/users/:userid', appsChatroomsMessagesCtl.getAll);
router.get('/apps-chatrooms-messages/apps/:appid/users/:userid', appsChatroomsMessagesCtl.getAllByAppId);
// ===============

// 圖文選單
router.get('/apps-richmenus/users/:userid', appsRichmenusCtl.getByUserId);
router.get('/apps-richmenus/apps/:appid/users/:userid', appsRichmenusCtl.getByAppIdByuserId);
router.get('/apps-richmenus/richmenus/:richmenuid/apps/:appid/users/:userid', appsRichmenusCtl.getOne);
router.post('/apps-richmenus/apps/:appid/users/:userid', appsRichmenusCtl.postOne);
router.put('/apps-richmenus/richmenus/:richmenuid/apps/:appid/users/:userid', appsRichmenusCtl.putOne);
router.delete('/apps-richmenus/richmenus/:richmenuid/apps/:appid/users/:userid', appsRichmenusCtl.deleteOne);

// 自動回覆
router.get('/apps-autoreplies/users/:userid', appsAutorepliesCtl.getAll);
router.get('/apps-autoreplies/apps/:appid/autoreplies/:autoreplyid/users/:userid', appsAutorepliesCtl.getOne);
router.post('/apps-autoreplies/apps/:appid/users/:userid', appsAutorepliesCtl.postOne);
router.put('/apps-autoreplies/apps/:appid/autoreplies/:autoreplyid/users/:userid', appsAutorepliesCtl.putOne);
router.delete('/apps-autoreplies/apps/:appid/autoreplies/:autoreplyid/users/:userid', appsAutorepliesCtl.deleteOne);

router.get('/apps-templates/users/:userid', (req, res, next) => {
    var userId = req.params.userid;
    var proceed = Promise.resolve();
    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }
            users.findAppIdsByUserId(userId, (data) => {
                if (null === data) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                } else {
                    resolve(data);
                }
            });
        });
    }).then((data) => {
        return new Promise((resolve, reject) => {
            let appid = data[0];
            appsTemplatesMdl.findByAppId(appid, (info) => {
                if (null === info) {
                    reject();
                } else {
                    resolve(info);
                }
            });
        });
    }).then((info) => {
        let result = info !== undefined ? info : {};
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: result
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(403).json(json);
    });
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
    };
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
                        reject(API_ERROR.USER_FAILED_TO_FIND);
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

router.get('/calendars-events/users/:userid', calendarsEventsCtl.getAll);
router.post('/calendars-events/users/:userid', calendarsEventsCtl.postOne);
router.put('/calendars-events/calendars/:calendarid/events/:eventid/users/:userid', calendarsEventsCtl.putOne);
router.delete('/calendars-events/calendars/:calendarid/events/:eventid/users/:userid', calendarsEventsCtl.deleteOne);

// ==========
// 關鍵字回覆
router.get('/apps/keywordreplies/users/:userid', appsKeywordrepliesCtl.getAll);
router.get('/apps/keywordreplies/apps/:appid/keywordreplies/:keywordreplyid/users/:userid', appsKeywordrepliesCtl.getOne);
router.post('/apps/keywordreplies/apps/:appid/users/:userid', appsKeywordrepliesCtl.postOne);
router.put('/apps/keywordreplies/apps/:appid/keywordreplies/:keywordreplyid/users/:userid', appsKeywordrepliesCtl.postOne);
router.delete('/apps/keywordreplies/apps/:appid/keywordreplies/:keywordreplyid/users/:userid', appsKeywordrepliesCtl.deleteOne);
// ==========

module.exports = router;
