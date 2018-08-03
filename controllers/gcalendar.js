module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    const CHATSHIER_CFG = require('../config/chatshier');

    const appsMdl = require('../models/apps');
    const appsAppointmentsMdl = require('../models/apps_appointments');
    const appsReceptionistsMdl = require('../models/apps_receptionists');
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
            this.postEvent = this.postEvent.bind(this);
        }

        postEvent(req, res) {
            let appId = req.params.appid;
            let eventId = req.headers['x-goog-channel-id'];
            let channelToken = req.headers['x-goog-channel-token'];
            let resourceState = req.headers['x-goog-resource-state'];
            // let resourceId = req.headers['x-goog-resource-id'];
            // let resourceUri = req.headers['x-goog-resource-uri'];

            if (CHATSHIER_CFG.JWT.SECRET !== channelToken) {
                return !res.headersSent && res.sendStatus(400);
            }

            // 當 webhook channel 被建立時，會收到資源 sync 狀態，此時不做任何處理
            if (GOOGLE_RESOURCE_STATE.SYNC === resourceState) {
                return !res.headersSent && res.sendStatus(200);
            }

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
                }

                return Promise.all([
                    appsMdl.find(appId),
                    appsAppointmentsMdl.find(appId, void 0, { 'appointments.eventId': eventId })
                ]).then(([ apps, appsAppointments ]) => {
                    if (!(apps && apps[appId])) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }

                    if (!(appsAppointments && appsAppointments[appId])) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                    }

                    let app = apps[appId];
                    let appointmentId = Object.keys(appsAppointments[appId].appointments).shift() || '';
                    if (!appointmentId) {
                        return Promise.reject(API_ERROR.APP_APPOINTMENT_FAILED_TO_FIND);
                    }

                    let appointment = appsAppointments[appId].appointments[appointmentId];
                    let receptionistId = appointment.receptionist_id;
                    let platformUid = appointment.platformUid;
                    let productId = appointment.product_id;

                    return Promise.all([
                        appsReceptionistsMdl.find(appId, receptionistId),
                        appsProductMdl.find(appId, productId, { 'products.type': 'APPOINTMENT' }),
                        consumersMdl.find(platformUid)
                    ]).then(([ appsReceptionists, appsProducts, consumers ]) => {
                        if (!(appsReceptionists && appsReceptionists[appId])) {
                            return Promise.reject(API_ERROR.APP_RECEPTIONIST_FAILED_TO_FIND);
                        }

                        if (!(appsProducts && appsProducts[appId])) {
                            return Promise.reject(API_ERROR.APP_PRODUCT_FAILED_TO_FIND);
                        }

                        if (!(consumers && consumers[platformUid])) {
                            return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_FIND);
                        }

                        let product = appsProducts[appId].products[productId];
                        let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                        let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                        let startedDate = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                        let endedDate = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);
                        let consumer = consumers[platformUid];
                        let gcalendarId = app.gcalendarId;

                        return gcalendarHlp.getEvent(gcalendarId, eventId).then((gcEvent) => {
                            let attendees = gcEvent.attendees || [];
                            return Promise.all(attendees.map((attendee) => {
                                if (attendee.email !== receptionist.email) {
                                    return Promise.resolve(void 0);
                                }

                                if (!appointment.isAccepted && 'accepted' === attendee.responseStatus) {
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
                                            '【' + startTime + ' ~ ' + endTime + '】\n\n' +
                                            (product ? '對 ' + product.name + ' ' : '') + '的預約'
                                        )
                                    };

                                    return Promise.all([
                                        botSvc.pushMessage(platformUid, acceptedMessage, void 0, appId),
                                        appsAppointmentsMdl.update(appId, appointmentId, { isAccepted: true }),
                                        gcalendarHlp.stopChannel(eventId, appointment.eventChannelId)
                                    ]);
                                }
                                return Promise.resolve(void 0);
                            }));
                        });
                    });
                });
            }).then(() => {
                !res.headersSent && res.sendStatus(200);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new GCalendarController();
})();
