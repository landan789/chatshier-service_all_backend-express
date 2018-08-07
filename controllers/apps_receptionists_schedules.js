module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsReceptionistsSchedulesMdl = require('../models/apps_receptionists_schedules');

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
                        return Promise.reject(API_ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsReceptionistsSchedules);
                });
            }).then((appsReceptionistsSchedules) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
                    return Promise.reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
                }

                return appsReceptionistsSchedulesMdl.update(appId, receptionistId, scheduleId, putSchdule).then((appsReceptionistsSchedules) => {
                    if (!appsReceptionistsSchedules) {
                        return Promise.reject(API_ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsReceptionistsSchedules);
                });
            }).then((appsReceptionistsSchedules) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
                        return Promise.reject(API_ERROR.APP_RECEPTIONIST_SCHEDULE_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsReceptionistsSchedules);
                });
            }).then((appsReceptionistsSchedules) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
