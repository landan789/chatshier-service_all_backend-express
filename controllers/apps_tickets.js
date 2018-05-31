module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const appsTicketsMdl = require('../models/apps_tickets');

    class AppsTicketsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsTicketsMdl.find(appIds).then((appsTickets) => {
                    if (!appsTickets) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return appsTickets;
                });
            }).then((appsTickets) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTickets
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
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let ticketId = req.params.ticketid;

            return this.appsRequestVerify(req).then(() => {
                return appsTicketsMdl.find(appId, ticketId).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return appsTickets;
                });
            }).then((appsTickets) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTickets
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
        }

        postOne(req, res, next) {
            let appId = req.params.appid;
            let postTikeck = {
                description: req.body.description === undefined ? '' : req.body.description,
                dueTime: req.body.dueTime === undefined ? '' : req.body.dueTime,
                priority: req.body.priority === undefined ? '' : req.body.priority,
                platformUid: req.body.platformUid === undefined ? '' : req.body.platformUid,
                status: req.body.status === undefined ? '' : req.body.status,
                assigned_id: req.body.assigned_id === undefined ? '' : req.body.assigned_id
            };

            return this.appsRequestVerify(req).then(() => {
                return appsTicketsMdl.insert(appId, postTikeck).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(API_ERROR.APP_TICKET_FAILED_TO_INSERT);
                    }
                    return appsTickets;
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
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let ticketId = req.params.ticketid;

            let putTikcket = {
                description: req.body.description || '',
                dueTime: req.body.dueTime ? req.body.dueTime : 0,
                priority: req.body.priority ? req.body.priority : 0,
                status: req.body.status ? req.body.status : 0,
                assigned_id: req.body.assigned_id || ''
            };

            return this.appsRequestVerify(req).then(() => {
                if (!ticketId) {
                    return Promise.reject(API_ERROR.TICKETID_WAS_EMPTY);
                }
                return appsTicketsMdl.find(appId);
            }).then((appTickets) => {
                if (!(appTickets && appTickets[appId])) {
                    return Promise.reject(API_ERROR.APP_TICKET_FAILED_TO_FIND);
                }

                // 判斷 tickets 中是否有目前 ticketId
                let tickets = appTickets[appId].tickets;
                if (!tickets[ticketId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_TICKET);
                }

                return appsTicketsMdl.update(appId, ticketId, putTikcket).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(API_ERROR.APP_TICKET_FAILED_TO_UPDATE);
                    }
                    return appsTickets;
                });
            }).then((appsTickets) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsTickets
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
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let ticketId = req.params.ticketid;

            return this.appsRequestVerify(req).then(() => {
                if (!ticketId) {
                    return Promise.reject(API_ERROR.TICKETID_WAS_EMPTY);
                }
                // 取得目前 appId 下所有 tickets
                return appsTicketsMdl.find(appId);
            }).then((appTickets) => {
                if (!(appTickets && appTickets[appId])) {
                    return Promise.reject(API_ERROR.APP_TICKET_FAILED_TO_FIND);
                }

                // 判斷 tickets 中是否有目前 ticketId
                let tickets = appTickets[appId].tickets;
                if (!tickets[ticketId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_TICKET);
                }

                return appsTicketsMdl.remove(appId, ticketId).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(API_ERROR.APP_TICKET_FAILED_TO_REMOVE);
                    }
                    return appsTickets;
                });
            }).then((appsTickets) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsTickets
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
        }
    }

    return new AppsTicketsController();
})();
