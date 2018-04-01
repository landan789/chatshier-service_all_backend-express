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
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.find(appIds, null, (appsTickets) => {
                    if (!appsTickets) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }

                    resolve(appsTickets);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
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
                appsTicketsMdl.find(appId, ticketId, (appsTickets) => {
                    if (!appsTickets || (appsTickets && 0 === Object.keys(appsTickets).length)) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appsTickets);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.postOne = (req, res, next) => {
        let postTikeck = {
            description: req.body.description === undefined ? '' : req.body.description,
            dueTime: req.body.dueTime === undefined ? '' : req.body.dueTime,
            priority: req.body.priority === undefined ? '' : req.body.priority,
            platformUid: req.body.platformUid === undefined ? '' : req.body.platformUid,
            status: req.body.status === undefined ? '' : req.body.status,
            assigned_id: req.body.assigned_id === undefined ? '' : req.body.assigned_id
        };

        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.insert(appIds, postTikeck, (appsTickets) => {
                    if (!appsTickets) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_INSERT);
                        return;
                    }
                    resolve(appsTickets);
                });
            });
        }).then((data) => {
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.putOne = (req, res, next) => {
        let appId = '';
        let ticketId = req.params.ticketid;

        let putTikcket = {
            description: req.body.description || '',
            dueTime: req.body.dueTime ? req.body.dueTime : 0,
            priority: req.body.priority ? req.body.priority : 0,
            status: req.body.status ? req.body.status : 0,
            assigned_id: req.body.assigned_id || ''
        };
        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds;

            if (!ticketId) {
                return Promise.reject(API_ERROR.TICKETID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有tickets
                appsTicketsMdl.find(appId, null, (appTickets) => {
                    if (!appTickets) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appTickets);
                });
            });
        }).then((appTickets) => { // 判斷appId中是否有目前ticket
            let ticketIds = Object.keys(appTickets[appId].tickets);
            return new Promise((resolve, reject) => {
                if (false === ticketIds.includes(ticketId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_TICKET);
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
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: data
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.deleteOne = (req, res, next) => {
        let appId = '';
        let ticketId = req.params.ticketid;

        return AppsTicketsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds;

            if (!ticketId) {
                return Promise.reject(API_ERROR.TICKETID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有tickets
                appsTicketsMdl.find(appId, null, (appTickets) => {
                    if (!appTickets) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appTickets);
                });
            });
        }).then((appTickets) => { // 判斷appId中是否有目前ticket
            let ticketIds = Object.keys(appTickets[appId].tickets);
            return new Promise((resolve, reject) => {
                if (false === ticketIds.includes(ticketId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_TICKET);
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
            let json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            let json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AppsTicketsController();
})();
