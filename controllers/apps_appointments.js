module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');
    const CHATSHIER_CFG = require('../config/chatshier');

    const appsMdl = require('../models/apps');
    const appsAppointmentsMdl = require('../models/apps_appointments');
    const appsProductsMdl = require('../models/apps_products');
    const appsReceptionistsMdl = require('../models/apps_receptionists');
    const consumersMdl = require('../models/consumers');
    const gcalendarHlp = require('../helpers/gcalendar');
    const botSvc = require('../services/bot');

    class AppsAppointmentsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsAppointmentsMdl.find({ appIds: appIds }).then((appsAppointments) => {
                    if (!appsAppointments) {
                        return Promise.reject(ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;

            return this.appsRequestVerify(req).then(() => {
                let query = {
                    appIds: appId,
                    appointmentIds: appointmentId
                };
                return appsAppointmentsMdl.find(query).then((appsAppointments) => {
                    if (!(appsAppointments && appsAppointments[appId])) {
                        return Promise.reject(ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;
            let putAppointment = {};
            ('string' === typeof req.body.name) && (putAppointment.name = req.body.name);

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(ERROR.APP_APPOINTMENT_APPOINTMENTID_WAS_EMPTY);
                }

                if ('string' === typeof putAppointment.name && !putAppointment.name) {
                    return Promise.reject(ERROR.NAME_WAS_EMPTY);
                }
                return appsAppointmentsMdl.find({ appIds: appId });
            }).then((appsAppointments) => {
                if (!(appsAppointments && appsAppointments[appId])) {
                    return Promise.reject(ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                }

                let appointment = appsAppointments[appId].appointments[appointmentId];
                if (!appointment) {
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                return appsAppointmentsMdl.update(appId, appointmentId, putAppointment).then((appsAppointments) => {
                    if (!(appsAppointments && appsAppointments[appId])) {
                        return Promise.reject(ERROR.APP_APPOINTMENT_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsAppointments);
                });
            }).then((appsAppointments) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let appointmentId = req.params.appointmentid;

            return this.appsRequestVerify(req).then(() => {
                if (!appointmentId) {
                    return Promise.reject(ERROR.APP_APPOINTMENT_APPOINTMENTID_WAS_EMPTY);
                }
                return appsAppointmentsMdl.find({ appIds: appId });
            }).then((appsAppointments) => {
                if (!(appsAppointments && appsAppointments[appId])) {
                    return Promise.reject(ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                }

                let appointment = appsAppointments[appId].appointments[appointmentId];
                if (!appointment) {
                    return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_APPOINTMENT);
                }

                let eventId = appointment.eventId;
                let resourceId = appointment.eventChannelId;
                let receptionistId = appointment.receptionist_id;
                let productId = appointment.product_id;
                let platformUid = appointment.platformUid;

                return Promise.all([
                    this._getAppGCalendarId(appId),
                    eventId && resourceId && gcalendarHlp.stopChannel(eventId, resourceId)
                ]).then(([ gcalendarId ]) => {
                    return Promise.all([
                        appsAppointmentsMdl.remove(appId, appointmentId),
                        appsProductsMdl.find({ appIds: appId, productIds: productId, isDeleted: null }),
                        appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId, isDeleted: null }),
                        consumersMdl.find(platformUid),
                        gcalendarId && eventId && gcalendarHlp.deleteEvent(gcalendarId, eventId)
                    ]);
                }).then(([ appsAppointments, appsProducts, appsReceptionists, consumers ]) => {
                    if (!(appsAppointments && appsAppointments[appId])) {
                        return Promise.reject(ERROR.APP_APPOINTMENT_FAILED_TO_REMOVE);
                    }

                    if (!(appsProducts && appsProducts[appId])) {
                        return Promise.reject(ERROR.APP_PRODUCT_FAILED_TO_FIND);
                    }

                    if (!(appsReceptionists && appsReceptionists[appId])) {
                        return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_FIND);
                    }

                    if (!(consumers && consumers[platformUid])) {
                        return Promise.reject(ERROR.CONSUMER_FAILED_TO_FIND);
                    }

                    let product = appsProducts[appId].products[productId];
                    let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                    let consumer = consumers[platformUid];

                    let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                    let startedDate = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                    let endedDate = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);

                    let startTime = startedDate.toISOString();
                    startTime = startTime.split('T').pop() || '';
                    startTime = startTime.substring(0, 5);

                    let endTime = endedDate.toISOString();
                    endTime = endTime.split('T').pop() || '';
                    endTime = endTime.substring(0, 5);

                    let notifyMessage = {
                        type: 'text',
                        text: (
                            consumer.name + ' 您好！您在\n\n' +
                            '【' + product.name + '】\n' +
                            '【' + receptionist.name + '】\n' +
                            '【' + startedDate.toISOString().split('T').shift() + '】\n' +
                            '【' + startTime + ' ~ ' + endTime + '】\n\n' +
                            '的預約已經被取消了。'
                        )
                    };
                    let shouldSend = new Date(appointment.endedTime).getTime() > Date.now();

                    return Promise.all([
                        Promise.resolve(appsAppointments),
                        shouldSend && botSvc.pushMessage(platformUid, notifyMessage, void 0, appId).catch(() => void 0)
                    ]);
                });
            }).then(([ appsAppointments ]) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAppointments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        _getAppGCalendarId(appId) {
            return appsMdl.find(appId).then((apps) => {
                if (!(apps && apps[appId])) {
                    return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                }

                let app = apps[appId];
                let gcalendarId = app.gcalendarId;
                if (gcalendarId) {
                    return gcalendarId;
                }

                let summary = '[' + app.name + '] - ' + appId;
                let description = 'Created by ' + CHATSHIER_CFG.GMAIL.USER;
                return gcalendarHlp.insertCalendar(summary, description).then((gcalendar) => {
                    gcalendarId = gcalendar.id;
                    let _app = { gcalendarId: gcalendarId };
                    return appsMdl.update(appId, _app);
                }).then(() => {
                    return gcalendarId;
                });
            });
        }
    }

    return new AppsAppointmentsController();
})();
