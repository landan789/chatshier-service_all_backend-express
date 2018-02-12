var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var usersMdl = require('../models/users');

var appsTicketsMdl = require('../models/apps_tickets');
const groupsMdl = require('../models/groups');
var appsTickets = {};

appsTickets.getAllByUserid = (req, res, next) => {
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            let userId = req.params.userid;

            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            usersMdl.findUser(userId, (data) => {
                var user = data;
                if ('' === user || null === user || undefined === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((userId) => {
        // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
        return new Promise((resolve, reject) => {
            var groupId = userId.group_ids;
            groupsMdl.findAppIds(groupId, (appIds) => {
                if (!appIds) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                }
                resolve(appIds);
            });
        });
    }).then((appIds) => {
        let appId = req.params.appid;

        return new Promise((resolve, reject) => {
            appsTicketsMdl.findAppTicketsByAppIds(appId || appIds, (data) => {
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
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: apps
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

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
            if (!userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            usersMdl.findUser(userId, (data) => {
                if (!data) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(data);
            });
        });
    }).then((userId) => {
        // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(userId.group_ids, (appIds) => {
                if (!appIds) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                } else if (-1 === appIds.indexOf(appId)) {
                    // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }
                resolve(appId);
            });
        });
    }).then((appId) => {
        return new Promise((resolve, reject) => {
            appsTicketsMdl.findAppTicketByAppIdByTicketId(appId, ticketId, (data) => {
                var apps = data;
                if (null === apps || '' === apps || undefined === apps) {
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                } else if (0 === Object.keys(apps).length) {
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                resolve(apps);
            });
        });
    }).then((data) => {
        var apps = data;
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: apps
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

appsTickets.postOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;

    var postTikeck = {
        createdTime: req.body.createdTime === undefined ? '' : req.body.createdTime,
        description: req.body.description === undefined ? '' : req.body.description,
        dueTime: req.body.dueTime === undefined ? '' : req.body.dueTime,
        priority: req.body.priority === undefined ? '' : req.body.priority,
        messagerId: req.body.messagerId === undefined ? '' : req.body.messagerId,
        status: req.body.status === undefined ? '' : req.body.status,
        updatedTime: req.body.updatedTime === undefined ? '' : req.body.updatedTime,
        isDeleted: 0
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
            if (!userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            usersMdl.findUser(userId, (data) => {
                if (!data) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(data);
            });
        });
    }).then((userId) => {
        // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(userId.group_ids, (appIds) => {
                if (!appIds) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                }
                resolve(appId);
            });
        });
    }).then((appId) => {
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
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

appsTickets.putOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var ticketId = req.params.ticketid;

    var putTikcket = {
        description: req.body.description || '',
        dueTime: req.body.dueTime ? req.body.dueTime : 0,
        priority: req.body.priority ? req.body.priority : 0,
        status: req.body.status ? req.body.status : 0,
        updatedTime: req.body.updatedTime ? req.body.updatedTime : 0
    };

    var proceed = Promise.resolve();

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
            if (!userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            usersMdl.findUser(userId, (data) => {
                if (!data) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(data);
            });
        });
    }).then((userId) => {
        // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(userId.group_ids, (appIds) => {
                if (!appIds) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                } else if (-1 === appIds.indexOf(appId)) {
                    // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }
                resolve(appId);
            });
        });
    }).then((appId) => {
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
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

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
            if (!userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            usersMdl.findUser(userId, (data) => {
                if (!data) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(data);
            });
        });
    }).then((userId) => {
        // 2. 再根據 appId 清單去 keywordreplies model 抓取清單
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(userId.group_ids, (appIds) => {
                if (!appIds) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                } else if (-1 === appIds.indexOf(appId)) {
                    // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }
                resolve(appId);
            });
        });
    }).then((appId) => {
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
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

module.exports = appsTickets;