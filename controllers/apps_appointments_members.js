module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const appsAppointmentsMembersMdl = require('../models/apps_appointments_members');

    class AppsAppointmentsMembersController extends ControllerCore {
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
                return appsAppointmentsMembersMdl.find(appIds).then((appsAppointmentsMembers) => {
                    if (!appsAppointmentsMembers) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointmentsMembers);
                });
            }).then((appsAppointmentsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointmentsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let memberId = req.params.memberid;

            return this.appsRequestVerify(req).then(() => {
                return appsAppointmentsMembersMdl.find(appId, appointmentId, memberId).then((appsAppointmentsMembers) => {
                    if (!(appsAppointmentsMembers && appsAppointmentsMembers[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointmentsMembers);
                });
            }).then((appsAppointmentsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointmentsMembers
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
                return appsAppointmentsMembersMdl.insert(appId, appointmentId, appointment).then((appsAppointmentsMembers) => {
                    if (!appsAppointmentsMembers) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsAppointmentsMembers);
                });
            }).then((appsAppointmentsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsAppointmentsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let memberId = req.params.memberid;
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

                return appsAppointmentsMembersMdl.findMembers(appId);
            }).then((appointments) => {
                if (!appointments) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                }

                if (!appointments[appointmentId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsMembersMdl.update(appId, appointmentId, memberId, appointment).then((appsAppointmentsMembers) => {
                    if (!(appsAppointmentsMembers && appsAppointmentsMembers[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsAppointmentsMembers);
                });
            }).then((appsAppointmentsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAppointmentsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let memberId = req.params.memberid;

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_APPOINTMENTID_WAS_EMPTY);
                }
                return appsAppointmentsMembersMdl.findMembers(appId);
            }).then((appointments) => {
                if (!appointments) {
                    return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_FIND);
                }

                if (!appointments[appointmentId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsMembersMdl.remove(appId, appointmentId, memberId).then((appsAppointmentsMembers) => {
                    if (!appsAppointmentsMembers) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_ITEM_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsAppointmentsMembers);
                });
            }).then((appsAppointmentsMembers) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAppointmentsMembers
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }
    return new AppsAppointmentsMembersController();
})();
