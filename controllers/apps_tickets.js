var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var usersMdl = require('../models/users');

var appsTicketsMdl = require('../models/apps_tickets');

var appsTickets = {};

appsTickets.getAllByUserid = (req, res, next) => {

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                var userId = req.params.userid;

                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }

                usersMdl.findUserByUserId(userId, (data) => {
                    var user = data;
                    if ('' === user || null === user || undefined === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((data) => {
            var user = data;
            var appIds = user.app_ids;

            return new Promise((resolve, reject) => {
                appsTicketsMdl.findAppTicketsByAppIds(appIds, (data) => {
                    var apps = data;
                    if (null === apps || '' === apps || undefined === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }

                    resolve(apps);
                });
            });

        }).then((apps) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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

appsTickets.getAllByAppIdByUserid = (req, res, next) => {

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    console.log('gett');

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                var userId = req.params.userid;
                var appId = req.params.appid;

                if ('' === userId || null === userId || undefined === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }


                if ('' === appId || null === appId || undefined === appId) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                }

                usersMdl.findUserByUserId(userId, (data) => {
                    var user = data;
                    if ('' === user || null === user || undefined === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((data) => {
            var user = data;
            var appIds = user.app_ids;
            var appId = req.params.appid;
            return new Promise((resolve, reject) => {
                if (!appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });

        }).then(() => {
            var appId = req.params.appid;

            return new Promise((resolve, reject) => {
                appsTicketsMdl.findAppTicketsByAppIds([appId], (data) => {
                    var apps = data;
                    if (null === apps || '' === apps || undefined === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }

                    resolve(apps);
                });
            });
        }).then((apps) => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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

appsTickets.getOne = (req, res, next) => {
    var appId = req.params.appid;
    var userId = req.params.userid;
    var ticketId = req.params.ticketid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {


            if ('' === appId || null === appId || undefined === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }

            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === ticketId || null === ticketId || undefined === ticketId) {
                reject(API_ERROR.TICKETID_WAS_EMPTY);
                return;
            }

            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findUserByUserId(userId, (data) => {
                var user = data;
                if ('' === user || null === user || undefined === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });

    }).then((data) => {
        var user = data;
        var appIds = user.app_ids;
        var appId = req.params.appid;
        return new Promise((resolve, reject) => {
            if (!appIds.includes(appId)) {
                reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                return;
            }
            resolve();
        });

    }).then(() => {
        var appId = req.params.appid;
        var ticketId = req.params.ticketid;

        return new Promise((resolve, reject) => {
            appsTicketsMdl.findAppTicketByAppIdByTicketId(appId, ticketId, (data) => {
                var apps = data;
                if (null === apps || '' === apps || undefined === apps || Object.getOwnPropertyNames(apps).length === 0) {
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                resolve(apps);
            });
        });
    }).then((data) => {
        var apps = data;
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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

appsTickets.postOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;

    var postTikeck = {
        ccEmails: req.body.ccEmails === undefined ? '' : req.body.ccEmails,
        createdTime: req.body.createdTime === undefined ? '' : req.body.createdTime,
        description: req.body.description === undefined ? '' : req.body.description,
        dueBy: req.body.dueBy === undefined ? '' : req.body.dueBy,
        frDueBy: req.body.frDueBy === undefined ? '' : req.body.frDueBy,
        frEscalated: req.body.frEscalated === undefined ? '' : req.body.frEscalated,
        fwdEmails: req.body.fwdEmails === undefined ? '' : req.body.fwdEmails,
        isEscalated: req.body.isEscalated === undefined ? '' : req.body.isEscalated,
        priority: req.body.priority === undefined ? '' : req.body.priority,
        replyCcEmails: req.body.replyCcEmails === undefined ? '' : req.body.replyCcEmails,
        requester: req.body.requester === undefined ? '' : req.body.requester,
        requesterId: req.body.requesterId === undefined ? '' : req.body.requesterId,
        source: req.body.source === undefined ? '' : req.body.source,
        spam: req.body.spam === undefined ? '' : req.body.spam,
        status: req.body.status === undefined ? '' : req.body.status,
        subject: req.body.subject === undefined ? '' : req.body.subject,
        toEmails: req.body.toEmails === undefined ? '' : req.body.toEmails,
        type: req.body.type === undefined ? '' : req.body.type,
        updatedTime: req.body.updatedTime === undefined ? '' : req.body.updatedTime
    };

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === appId || null === appId || undefined === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }

            resolve();
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsTicketsMdl.insertByAppid(appId, postTikeck, (result) => {
                if (false === result || null === result || undefined === result) {
                    reject(API_ERROR.APP_TICKET_FAILED_TO_INSERT);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG
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
appsTickets.putOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var ticketId = req.params.ticketid;

    var putTikcket = {
        ccEmails: req.body.ccEmails === undefined ? '' : req.body.ccEmails,
        createdTime: req.body.createdTime === undefined ? '' : req.body.createdTime,
        description: req.body.description === undefined ? '' : req.body.description,
        dueBy: req.body.dueBy === undefined ? '' : req.body.dueBy,
        frDueBy: req.body.frDueBy === undefined ? '' : req.body.frDueBy,
        frEscalated: req.body.frEscalated === undefined ? '' : req.body.frEscalated,
        fwdEmails: req.body.fwdEmails === undefined ? '' : req.body.fwdEmails,
        isEscalated: req.body.isEscalated === undefined ? '' : req.body.isEscalated,
        priority: req.body.priority === undefined ? '' : req.body.priority,
        replyCcEmails: req.body.replyCcEmails === undefined ? '' : req.body.replyCcEmails,
        requester: req.body.requester === undefined ? '' : req.body.requester,
        requesterId: req.body.requesterId === undefined ? '' : req.body.requesterId,
        source: req.body.source === undefined ? '' : req.body.source,
        spam: req.body.spam === undefined ? '' : req.body.spam,
        status: req.body.status === undefined ? '' : req.body.status,
        subject: req.body.subject === undefined ? '' : req.body.subject,
        toEmails: req.body.toEmails === undefined ? '' : req.body.toEmails,
        type: req.body.type === undefined ? '' : req.body.type,
        updatedTime: req.body.updatedTime === undefined ? '' : req.body.updatedTime
    };

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === appId || null === appId || undefined === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }

            resolve();
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findAppIdsByUserId(userId, (data) => {
                var appIds = data;
                if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsTicketsMdl.updateByAppIdByticketId(appId, ticketId, putTikcket, (result) => {
                if (false === result || null === result || undefined === result) {
                    reject(API_ERROR.APP_TICKET_FAILED_TO_UPDATE);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
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

appsTickets.deleteOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var ticketId = req.params.ticketid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === appId || null === appId || undefined === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }

            resolve();
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findAppIdsByUserId(userId, (data) => {
                var appIds = data;
                if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length) || !appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        return new Promise((resolve, reject) => {
            appsTicketsMdl.removeByAppIdByTicketId(appId, ticketId, (result) => {
                if (false === result || null === result || undefined === result) {
                    reject(API_ERROR.APP_TICKET_FAILED_TO_UPDATE);
                    return;
                }

                resolve();

            });
        });

    }).then(() => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG
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

module.exports = appsTickets;