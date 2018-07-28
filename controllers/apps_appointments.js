module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const appsAppointmentsMdl = require('../models/apps_appointments');

    class AppsAppointmentsController extends ControllerCore {
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
                return appsAppointmentsMdl.find(appIds).then((appsAppointments) => {
                    if (!appsAppointments) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;

            return this.appsRequestVerify(req).then(() => {
                return appsAppointmentsMdl.find(appId, appointmentId).then((appsAppointments) => {
                    if (!(appsAppointments && appsAppointments[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let putAppointment = {};
            ('string' === typeof req.body.name) && (putAppointment.name = req.body.name);

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_APPOINTMENTID_WAS_EMPTY);
                }

                if ('string' === typeof putAppointment.name && !putAppointment.name) {
                    return Promise.reject(API_ERROR.NAME_WAS_EMPTY);
                }
                return appsAppointmentsMdl.findAppointments(appId);
            }).then((appointments) => {
                if (!appointments) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                }

                if (!appointments[appointmentId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsMdl.update(appId, appointmentId, putAppointment).then((appsAppointments) => {
                    if (!(appsAppointments && appsAppointments[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_APPOINTMENTID_WAS_EMPTY);
                }
                return appsAppointmentsMdl.findAppointments(appId);
            }).then((appointments) => {
                if (!appointments) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                }

                if (!appointments[appointmentId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsMdl.remove(appId, appointmentId).then((appsAppointments) => {
                    if (!appsAppointments) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }

    return new AppsAppointmentsController();
})();
