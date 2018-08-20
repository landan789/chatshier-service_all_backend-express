module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    const CHATSHIER_CFG = require('../config/chatshier');

    const appsMdl = require('../models/apps');
    const appsAppointmentsMdl = require('../models/apps_appointments');
    const appsReceptionistsMdl = require('../models/apps_receptionists');
    const appsReceptionistsSchedulesMdl = require('../models/apps_receptionists_schedules');
    const appsProductMdl = require('../models/apps_products');
    const consumersMdl = require('../models/consumers');
    const gcalendarHlp = require('../helpers/gcalendar');
    const botSvc = require('../services/bot');

    // https://developers.google.com/calendar/v3/push
    const GOOGLE_RESOURCE_STATE = Object.freeze({
        SYNC: 'sync',
        EXISTS: 'exists',
        NOT_EXISTS: 'not_exists'
    });

    class GCalendarController extends ControllerCore {
        constructor() {
            super();
            this.postAppointment = this.postAppointment.bind(this);
            this.postSchedules = this.postSchedules.bind(this);
        }

        getGoogleParams(headers = {}) {
            return {
                eventId: headers['x-goog-channel-id'],
                channelToken: headers['x-goog-channel-token'],
                resourceState: headers['x-goog-resource-state'],
                resourceId: headers['x-goog-resource-id'],
                resourceUri: headers['x-goog-resource-uri']
            };
        }

        postAppointment(req, res) {
            let appId = req.query.appid;
            let params = this.getGoogleParams(req.headers);

            if (CHATSHIER_CFG.JWT.SECRET !== params.channelToken) {
                return !res.headersSent && res.sendStatus(400);
            }

            // 當 webhook channel 被建立時，會收到資源 sync 狀態，此時不做任何處理
            if (GOOGLE_RESOURCE_STATE.SYNC === params.resourceState) {
                return !res.headersSent && res.sendStatus(200);
            }

            // 資料不齊全時，停止此 google api webhook 資源
            if (!appId) {
                !res.headersSent && res.sendStatus(200);
                return gcalendarHlp.stopChannel(params.eventId, params.resourceId).catch(() => void 0);
            }

            let query = {
                appIds: appId,
                eventId: params.eventId
            };

            if (GOOGLE_RESOURCE_STATE.NOT_EXISTS === params.resourceState) {
                return appsAppointmentsMdl.find(query).then((appsAppointments) => {
                    if (!(appsAppointments && appsAppointments[appId])) {
                        return null;
                    }
                    let appointmentId = Object.keys(appsAppointments[appId].appointments).shift() || '';
                    return appsAppointmentsMdl.remove(appId, appointmentId);
                }).catch(() => {
                    return Promise.resolve(void 0);
                }).then(() => {
                    return gcalendarHlp.stopChannel(params.eventId, params.resourceId);
                });
            }

            let RESOURCE_SHOULD_BE_RELEASE = new Error('RESOURCE_SHOULD_BE_RELEASE');
            return appsAppointmentsMdl.find(query).then((appsAppointments) => {
                if (!(appsAppointments && appsAppointments[appId])) {
                    return Promise.reject(RESOURCE_SHOULD_BE_RELEASE);
                }

                let appointmentId = Object.keys(appsAppointments[appId].appointments).shift() || '';
                if (!appointmentId) {
                    return Promise.reject(RESOURCE_SHOULD_BE_RELEASE);
                }

                let appointment = appsAppointments[appId].appointments[appointmentId];
                if (appointment.isAccepted) {
                    // 此服務人員已經接受預約了，無需繼續監聽此資源
                    return Promise.reject(RESOURCE_SHOULD_BE_RELEASE);
                }

                let receptionistId = appointment.receptionist_id;
                let platformUid = appointment.platformUid;
                let productId = appointment.product_id;

                return Promise.all([
                    this._getAppGCalendarId(appId),
                    appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }),
                    appsProductMdl.find({ appIds: appId, productIds: productId, type: 'APPOINTMENT' }),
                    consumersMdl.find(platformUid)
                ]).then(([ gcalendarId, appsReceptionists, appsProducts, consumers ]) => {
                    if (!(appsReceptionists && appsReceptionists[appId]) ||
                        !(appsProducts && appsProducts[appId]) ||
                        !(consumers && consumers[platformUid])) {
                        return Promise.reject(RESOURCE_SHOULD_BE_RELEASE);
                    }

                    return Promise.all([
                        gcalendarHlp.getEvent(gcalendarId, params.eventId),
                        appsProducts[appId].products[productId],
                        appsReceptionists[appId].receptionists[receptionistId],
                        consumers[platformUid]
                    ]);
                }).then(([ gcEvent, product, receptionist, consumer ]) => {
                    let attendees = gcEvent.attendees || [];
                    return Promise.all(attendees.map((attendee) => {
                        if (attendee.email !== receptionist.email) {
                            return Promise.resolve(void 0);
                        }

                        if (!appointment.isAccepted && 'accepted' === attendee.responseStatus) {
                            let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                            let startedDate = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                            let endedDate = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);

                            let startTime = startedDate.toISOString();
                            startTime = startTime.split('T').pop() || '';
                            startTime = startTime.substring(0, 5);

                            let endTime = endedDate.toISOString();
                            endTime = endTime.split('T').pop() || '';
                            endTime = endTime.substring(0, 5);

                            let acceptedMessage = {
                                type: 'text',
                                text: (
                                    receptionist.name + ' 已接受了 ' + consumer.name + ' 您在\n\n' +
                                    '【' + startedDate.toISOString().split('T').shift() + '】\n' +
                                    '【' + startTime + ' ~ ' + endTime + '】\n' +
                                    (product ? '【' + product.name + '】\n\n' : '\n') +
                                    '的預約'
                                )
                            };

                            return Promise.all([
                                botSvc.pushMessage(platformUid, acceptedMessage, void 0, appId),
                                appsAppointmentsMdl.update(appId, appointmentId, { isAccepted: true }),
                                gcalendarHlp.stopChannel(params.eventId, params.resourceId)
                            ]);
                        }
                        return Promise.resolve(void 0);
                    }));
                }).then(() => void 0);
            }).then(() => {
                !res.headersSent && res.sendStatus(200);
            }).catch((err) => {
                if (err === RESOURCE_SHOULD_BE_RELEASE) {
                    !res.headersSent && res.sendStatus(200);
                    return gcalendarHlp.stopChannel(params.eventId, params.resourceId).catch(() => void 0);
                }
                return this.errorJson(req, res, err);
            });
        }

        postSchedules(req, res) {
            let appId = req.query.appid;
            let receptionistId = req.query.receptionistid;
            let scheduleId = req.query.scheduleid;
            let params = this.getGoogleParams(req.headers);

            if (CHATSHIER_CFG.JWT.SECRET !== params.channelToken) {
                !res.headersSent && res.sendStatus(400);
                return Promise.resolve();
            }

            // 當 webhook channel 被建立時，會收到資源 sync 狀態，此時不做任何處理
            if (GOOGLE_RESOURCE_STATE.SYNC === params.resourceState) {
                !res.headersSent && res.sendStatus(200);
                return Promise.resolve();
            }

            // 資料不齊全時，停止此 google api webhook 資源
            if (!appId || !receptionistId || !scheduleId) {
                !res.headersSent && res.sendStatus(200);
                return gcalendarHlp.stopChannel(params.eventId, params.resourceId).catch(() => void 0);
            }

            return appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    return null;
                }

                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let gcalendarId = receptionist.gcalendarId;
                return gcalendarHlp.getEvent(gcalendarId, params.eventId).then((gcEvent) => {
                    let putSchedule = {
                        summary: gcEvent.summary,
                        description: gcEvent.description,
                        start: gcEvent.start,
                        end: gcEvent.end,
                        recurrence: gcEvent.recurrence
                    };
                    return appsReceptionistsSchedulesMdl.update(appId, receptionistId, scheduleId, putSchedule);
                }).catch(() => {
                    return null;
                });
            }).then((appsReceptionistsSchedules) => {
                if (!(appsReceptionistsSchedules && appsReceptionistsSchedules[appId])) {
                    // 更新服務人員行程失敗時，停止此 google api webhook 資源
                    return gcalendarHlp.stopChannel(params.eventId, params.resourceId);
                }
                return Promise.resolve(void 0);
            }).then(() => {
                !res.headersSent && res.sendStatus(200);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

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

    return new GCalendarController();
})();
