module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let calendarsEventsMdl = require('../models/calendars_events');
    let userMdl = require('../models/users');

    class CalendarsEventsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            let userId = req.params.userid;
            let eventId = undefined === req.params.eventid ? null : req.params.eventid;

            return userMdl.findCalendarId(userId).then((calendarIds) => {
                if (!calendarIds) {
                    return {};
                }

                return new Promise((resolve, reject) => {
                    calendarsEventsMdl.find(calendarIds, eventId, (calendars) => {
                        if (!calendars) {
                            reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_FIND);
                            return;
                        }
                        resolve(calendars);
                    });
                });
            }).then((calendarsEvents) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: calendarsEvents
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res, next) {
            let userId = req.params.userid;
            let event = {
                title: undefined === req.body.title ? null : req.body.title,
                startedTime: undefined === req.body.startedTime ? null : req.body.startedTime,
                endedTime: undefined === req.body.endedTime ? null : req.body.endedTime,
                description: undefined === req.body.description ? null : req.body.description,
                isAllDay: undefined === req.body.isAllDay ? 0 : req.body.isAllDay
            };

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId || undefined === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    userMdl.findCalendarId(userId, (calendarIds) => {
                        if (!calendarIds) {
                            reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_INSERT);
                            return;
                        };
                        // 首次插入資料時不會有 calendarIds
                        resolve(calendarIds);
                    });
                });
            }).then((calendarIds) => {
                return new Promise((resolve, reject) => {
                    calendarsEventsMdl.insert(calendarIds, event, (calendarsEvents) => {
                        if (!calendarsEvents) {
                            reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_INSERT);
                            return;
                        }

                        if (!calendarIds || (calendarIds && 0 === calendarIds.length)) {
                            // 插入事件至指定的行事曆並同時更新使用者的 calendar_id 欄位
                            let user = {
                                calendar_ids: Object.keys(calendarsEvents)
                            };
                            userMdl.update(userId, user, (users) => {
                                if (!users || (users && 0 === Object.keys(users).length)) {
                                    reject(API_ERROR.USER_FAILED_TO_UPDATE);
                                    return;
                                }
                                resolve(calendarsEvents);
                            });
                            return;
                        }
                        resolve(calendarsEvents);
                    });
                });
            }).then((data) => {
                let calendarsEvents = data;
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: calendarsEvents
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let userId = req.params.userid;
            let eventId = req.params.eventid;
            let calendarId = req.params.calendarid;

            let event = {
                title: undefined === req.body.title ? null : req.body.title,
                startedTime: undefined === req.body.startedTime ? null : req.body.startedTime,
                endedTime: undefined === req.body.endedTime ? null : req.body.endedTime,
                description: undefined === req.body.description ? null : req.body.description,
                isAllDay: undefined === req.body.isAllDay ? 0 : req.body.isAllDay
            };

            Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    if ('' === userId || null === userId || undefined === userId) {
                        reject(API_ERROR.USERID_WAS_EMPTY);
                        return;
                    }

                    if ('' === calendarId || null === calendarId || undefined === calendarId) {
                        reject(API_ERROR.CALENDARID_WAS_EMPTY);
                        return;
                    }

                    if ('' === eventId || null === eventId || undefined === eventId) {
                        reject(API_ERROR.EVENTID_WAS_EMPTY);
                        return;
                    }

                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    userMdl.findCalendarId(userId, (userCalendarId) => {
                        if (userCalendarId && !(userCalendarId instanceof Array)) {
                            userCalendarId = [userCalendarId];
                        };
                        let calendarIds = userCalendarId || [];
                        if (!calendarIds.includes(calendarId)) {
                            reject(API_ERROR.USER_DID_NOT_HAVE_THIS_CALENDAR);
                            return;
                        }
                        resolve();
                    });
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    calendarsEventsMdl.update(calendarId, eventId, event, (calendarsEvents) => {
                        resolve(calendarsEvents);
                    });
                });
            }).then((calendarsEvents) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: calendarsEvents
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res, next) {
            let userId = req.params.userid;
            let eventId = req.params.eventid;
            let calendarId = req.params.calendarid;

            let proceed = Promise.resolve();

            proceed.then(() => {
                return new Promise((resolve, reject) => {
                    userMdl.findCalendarId(userId, (userCalendarId) => {
                        if (userCalendarId && !(userCalendarId instanceof Array)) {
                            userCalendarId = [userCalendarId];
                        };
                        let calendarIds = userCalendarId || [];
                        if (!calendarIds.includes(calendarId)) {
                            reject(API_ERROR.USER_DID_NOT_HAVE_THIS_CALENDAR);
                            return;
                        }
                        resolve();
                    });
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    calendarsEventsMdl.remove(calendarId, eventId, (result) => {
                        if (!result) {
                            reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_REMOVE);
                            return;
                        }
                        let calendarsEvents = result;
                        resolve(calendarsEvents);
                    });
                });
            }).then((calendarsEvents) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: calendarsEvents
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new CalendarsEventsController();
})();
