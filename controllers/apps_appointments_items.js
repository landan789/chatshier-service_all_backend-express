module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const appsAppointmentsItemsMdl = require('../models/apps_appointments_items');

    class AppsAppointmentsItemsController extends ControllerCore {
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
                return appsAppointmentsItemsMdl.find(appIds).then((appsAppointmentsItems) => {
                    if (!appsAppointmentsItems) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointmentsItems);
                });
            }).then((appsAppointmentsItems) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointmentsItems
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let itemId = req.params.itemid;

            return this.appsRequestVerify(req).then(() => {
                return appsAppointmentsItemsMdl.find(appId, appointmentId, itemId).then((appsAppointmentsItems) => {
                    if (!(appsAppointmentsItems && appsAppointmentsItems[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointmentsItems);
                });
            }).then((appsAppointmentsItems) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointmentsItems
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let appointment = {
                name: req.body.name || '',
                items: [],
                members: []
            };

            return this.appsRequestVerify(req).then(() => {
                return appsAppointmentsItemsMdl.insert(appId, appointmentId, appointment).then((appsAppointmentsItems) => {
                    if (!appsAppointmentsItems) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsAppointmentsItems);
                });
            }).then((appsAppointmentsItems) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsAppointmentsItems
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let itemId = req.params.itemid;
            let appointment = {
                name: req.body.name || '',
            };

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_APPOINTMENTID_WAS_EMPTY);
                };

                if ('' === appointment.name) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_NAME_WAS_EMPTY);
                };

                return appsAppointmentsItemsMdl.findItems(appId);
            }).then((appointments) => {
                if (!appointments) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                }

                if (!appointments[appointmentId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsItemsMdl.update(appId, appointmentId, itemId, appointment).then((appsAppointmentsItems) => {
                    if (!(appsAppointmentsItems && appsAppointmentsItems[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsAppointmentsItems);
                });
            }).then((appsAppointmentsItems) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAppointmentsItems
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let itemId = req.params.itemid;

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_APPOINTMENTID_WAS_EMPTY);
                }
                return appsAppointmentsItemsMdl.findItems(appId);
            }).then((appointments) => {
                if (!appointments) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                }

                if (!appointments[appointmentId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsItemsMdl.remove(appId, appointmentId, itemId).then((appsAppointmentsItems) => {
                    if (!appsAppointmentsItems) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsAppointmentsItems);
                });
            }).then((appsAppointmentsItems) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAppointmentsItems
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }
    return new AppsAppointmentsItemsController();
})();
