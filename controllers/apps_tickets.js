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
        }

        getOne(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
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
                    if (!appsTickets) {
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
            let appId;
            let ticketId = req.params.ticketid;

            let putTikcket = {
                description: req.body.description || '',
                dueTime: req.body.dueTime ? req.body.dueTime : 0,
                priority: req.body.priority ? req.body.priority : 0,
                status: req.body.status ? req.body.status : 0,
                assigned_id: req.body.assigned_id || ''
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
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
        }

        deleteOne(req, res, next) {
            let appId;
            let ticketId = req.params.ticketid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
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
                    appsTicketsMdl.remove(appId, ticketId, (appsTickets) => {
                        if (!appsTickets) {
                            reject(API_ERROR.APP_TICKET_FAILED_TO_REMOVE);
                            return;
                        }
                        resolve(appsTickets);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
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
    }

    return new AppsTicketsController();
})();
