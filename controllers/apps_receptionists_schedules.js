module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

    const gcalendarHlp = require('../helpers/gcalendar');
    let appsReceptionistsMdl = require('../models/apps_receptionists');
    let appsReceptionistsSchedulesMdl = require('../models/apps_receptionists_schedules');

    const WEBHOOK_PATH = '/webhook-google/calendar/receptionists/schedules';

    class AppsChatroomsMessagersController extends ControllerCore {
        constructor() {
            super();
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let receptionistId = req.params.receptionistid;

            let postSchdule = {
                summary: ('string' === typeof req.body.summary) ? req.body.summary : '',
                description: ('string' === typeof req.body.description) ? req.body.description : '',
                start: ('object' === typeof req.body.start) ? req.body.start : {},
                end: ('object' === typeof req.body.end) ? req.body.end : {},
                recurrence: (req.body.recurrence instanceof Array) ? req.body.recurrence : []
            };

            return this.appsRequestVerify(req).then(() => {
                return appsReceptionistsSchedulesMdl.insert(appId, receptionistId, postSchdule).then((appsReceptionistsSchedules) => {
                    if (!(appsReceptionistsSchedules && appsReceptionistsSchedules[appId])) {
                        return Promise.reject(ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_INSERT);
                    }

                    let schedules = appsReceptionistsSchedules[appId].receptionists[receptionistId].schedules;
                    let scheduleId = Object.keys(schedules).shift() || '';
                    let schedule = schedules[scheduleId];

                    return appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }).then((appsReceptionists) => {
                        if (!(appsReceptionists && appsReceptionists[appId])) {
                            return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_FIND);
                        }

                        let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                        let gcalendarId = receptionist.gcalendarId;
                        let hostname = 'https://' + req.hostname;
                        let webhookUrl = hostname + WEBHOOK_PATH + '?appid=' + appId + '&receptionistid=' + receptionistId + '&scheduleid=' + scheduleId;
                        return gcalendarHlp.watchEvent(gcalendarId, schedule.eventId, webhookUrl);
                    }).then((channel) => {
                        return appsReceptionistsSchedulesMdl.update(appId, receptionistId, scheduleId, { eventChannelId: channel.resourceId }).then((appsReceptionistsSchedules) => {
                            if (!appsReceptionistsSchedules) {
                                return Promise.reject(ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_UPDATE);
                            }
                            return Promise.resolve(appsReceptionistsSchedules);
                        });
                    });
                });
            }).then((appsReceptionistsSchedules) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionistsSchedules
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let receptionistId = req.params.receptionistid;
            let scheduleId = req.params.scheduleid;

            let putSchdule = {};
            ('string' === typeof req.body.summary) && (putSchdule.summary = req.body.summary);
            ('string' === typeof req.body.description) && (putSchdule.description = req.body.description);
            ('object' === typeof req.body.start) && (putSchdule.start = req.body.start);
            ('object' === typeof req.body.end) && (putSchdule.end = req.body.end);
            (req.body.recurrence instanceof Array) && (putSchdule.recurrence = req.body.recurrence);

            return this.appsRequestVerify(req).then(() => {
                if (0 === Object.keys(putSchdule).length) {
                    return Promise.reject(ERROR.INVALID_REQUEST_BODY_DATA);
                }

                return appsReceptionistsSchedulesMdl.update(appId, receptionistId, scheduleId, putSchdule).then((appsReceptionistsSchedules) => {
                    if (!appsReceptionistsSchedules) {
                        return Promise.reject(ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsReceptionistsSchedules);
                });
            }).then((appsReceptionistsSchedules) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionistsSchedules
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let receptionistId = req.params.receptionistid;
            let scheduleId = req.params.scheduleid;

            return this.appsRequestVerify(req).then(() => {
                return appsReceptionistsSchedulesMdl.remove(appId, receptionistId, scheduleId).then((appsReceptionistsSchedules) => {
                    if (!appsReceptionistsSchedules) {
                        return Promise.reject(ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_REMOVE);
                    }

                    let schedule = appsReceptionistsSchedules[appId].receptionists[receptionistId].schedules[scheduleId];
                    return Promise.all([
                        Promise.resolve(appsReceptionistsSchedules),
                        schedule.eventId && schedule.eventChannelId && gcalendarHlp.stopChannel(schedule.eventId, schedule.eventChannelId)
                    ]);
                });
            }).then(([ appsReceptionistsSchedules ]) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionistsSchedules
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsChatroomsMessagersController();
})();
