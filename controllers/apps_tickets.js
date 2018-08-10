module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');

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
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsTickets);
                });
            }).then((appsTickets) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTickets
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let ticketId = req.params.ticketid;

            return this.appsRequestVerify(req).then(() => {
                return appsTicketsMdl.find(appId, ticketId).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsTickets);
                });
            }).then((appsTickets) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTickets
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
                        return Promise.reject(ERROR.APP_TICKET_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsTickets);
                });
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let ticketId = req.params.ticketid;

            let putTikcket = {};
            ('string' === typeof req.body.description) && (putTikcket.description = req.body.description);
            ('number' === typeof req.body.dueTime) && (putTikcket.dueTime = req.body.dueTime);
            ('number' === typeof req.body.priority) && (putTikcket.priority = req.body.priority);
            ('number' === typeof req.body.status) && (putTikcket.status = req.body.status);
            ('string' === typeof req.body.platformUid) && (putTikcket.platformUid = req.body.platformUid);
            ('string' === typeof req.body.assigned_id) && (putTikcket.assigned_id = req.body.assigned_id);

            return this.appsRequestVerify(req).then(() => {
                if (!ticketId) {
                    return Promise.reject(ERROR.TICKETID_WAS_EMPTY);
                }
                return appsTicketsMdl.find(appId);
            }).then((appTickets) => {
                if (!(appTickets && appTickets[appId])) {
                    return Promise.reject(ERROR.APP_TICKET_FAILED_TO_FIND);
                }

                // 判斷 tickets 中是否有目前 ticketId
                let tickets = appTickets[appId].tickets;
                if (!tickets[ticketId]) {
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_TICKET);
                }

                return appsTicketsMdl.update(appId, ticketId, putTikcket).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(ERROR.APP_TICKET_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsTickets);
                });
            }).then((appsTickets) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsTickets
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let ticketId = req.params.ticketid;

            return this.appsRequestVerify(req).then(() => {
                if (!ticketId) {
                    return Promise.reject(ERROR.TICKETID_WAS_EMPTY);
                }
                // 取得目前 appId 下所有 tickets
                return appsTicketsMdl.find(appId);
            }).then((appTickets) => {
                if (!(appTickets && appTickets[appId])) {
                    return Promise.reject(ERROR.APP_TICKET_FAILED_TO_FIND);
                }

                // 判斷 tickets 中是否有目前 ticketId
                let tickets = appTickets[appId].tickets;
                if (!tickets[ticketId]) {
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_TICKET);
                }

                return appsTicketsMdl.remove(appId, ticketId).then((appsTickets) => {
                    if (!(appsTickets && appsTickets[appId])) {
                        return Promise.reject(ERROR.APP_TICKET_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsTickets);
                });
            }).then((appsTickets) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsTickets
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsTicketsController();
})();
