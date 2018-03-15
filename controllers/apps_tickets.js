module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsTicketsMdl = require('../models/apps_tickets');

    function AppsTicketsController() {};

    util.inherits(AppsTicketsController, controllerCre.constructor);

    AppsTicketsController.prototype.getAllByUserid = (req, res, next) => {
        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appId = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.findAppTickets(appId || appIds, (data) => {
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
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.getOne = (req, res, next) => {
        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appId = checkedAppIds;
            let ticketId = req.params.ticketid;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.findAppTicket(appId, ticketId, (data) => {
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
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.postOne = (req, res, next) => {
        var postTikeck = {
            description: req.body.description === undefined ? '' : req.body.description,
            dueTime: req.body.dueTime === undefined ? '' : req.body.dueTime,
            priority: req.body.priority === undefined ? '' : req.body.priority,
            messager_id: req.body.messager_id === undefined ? '' : req.body.messager_id,
            status: req.body.status === undefined ? '' : req.body.status,
            isDeleted: 0
        };
        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appId = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.insert(appId, postTikeck, (appsTickets) => {
                    if (false === appsTickets || null === appsTickets || undefined === appsTickets) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_INSERT);
                        return;
                    }

                    resolve(appsTickets);
                });
            });
        }).then((data) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.putOne = (req, res, next) => {
        var appId = '';
        var ticketId = req.params.ticketid;

        var putTikcket = {
            description: req.body.description || '',
            dueTime: req.body.dueTime ? req.body.dueTime : 0,
            priority: req.body.priority ? req.body.priority : 0,
            status: req.body.status ? req.body.status : 0
        };
        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds;

            if (!ticketId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有tickets
                appsTicketsMdl.findTickets(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    let ticketIds = Object.keys(data);
                    resolve(ticketIds);
                });
            });
        }).then((ticketIds) => { // 判斷appId中是否有目前ticket
            return new Promise((resolve, reject) => {
                if (false === ticketIds.includes(ticketId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsTicketsMdl.update(appId, ticketId, putTikcket, (appsTickets) => {
                    if (false === appsTickets || null === appsTickets || undefined === appsTickets) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_UPDATE);
                        return;
                    }

                    resolve(appsTickets);
                });
            });
        }).then((data) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.deleteOne = (req, res, next) => {
        var appId = '';
        var ticketId = req.params.ticketid;

        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds;

            if (!ticketId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有tickets
                appsTicketsMdl.findTickets(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    let ticketIds = Object.keys(data);
                    resolve(ticketIds);
                });
            });
        }).then((ticketIds) => { // 判斷appId中是否有目前ticket
            return new Promise((resolve, reject) => {
                if (false === ticketIds.includes(ticketId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsTicketsMdl.remove(appId, ticketId, (result) => {
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
            res.status(500).json(json);
        });
    };

    return new AppsTicketsController();
})();
