var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var calendarsEventsMdl = require('../models/calendars_events');
var userMdl = require('../models/users');
var calendarsEvents = {};

calendarsEvents.getAll = function(req, res, next) {
    let userId = req.params.userid;
    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.findCalendarEventsByUserId(userId, (data) => {
                var calendarsEvents = data;
                if (false === calendarsEvents || undefined === calendarsEvents || '' === calendarsEvents) {
                    reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_FIND);
                    return;
                }
                resolve(calendarsEvents);
            });
        });
    }).then((calendarsEvents) => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: calendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(403).json(json);
    });
}

calendarsEvents.postOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    let userId = req.params.userid;
    let calendarId = req.params.calendarid;
    let event = {
        title: undefined === req.body.title ? null : req.body.title,
        startTime: undefined === req.body.startTime ? null : req.body.startTime,
        endTime: undefined === req.body.endTime ? null : req.body.endTime,
        description: undefined === req.body.description ? null : req.body.description,
        isAllDay: undefined === req.body.isAllDay ? 0 : req.body.isAllDay,
        isDeleted: 0
    }
    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === calendarId || null === calendarId || undefined === calendarId) {
                reject(API_ERROR.CALENDARID_WAS_EMPTY);
                return;
            }

            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.insertCalendarEventByCalendarIdByUserId(calendarId, userId, event, (data) => {
                let calendarsEvents = data;
                if (null === calendarsEvents || undefined === calendarsEvents || '' === calendarsEvents) {
                    reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_INSERT);
                    return;
                }
                resolve(data);
            });
        });
    }).then((data) => {
        var CalendarsEvents = data;
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
            data: CalendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(403).json(json);
    });
}

calendarsEvents.putOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    let userId = req.params.userid;
    let eventId = req.params.eventid;
    let calendarId = req.params.calendarid;

    let event = {
        title: undefined === req.body.title ? null : req.body.title,
        startTime: undefined === req.body.startTime ? null : req.body.startTime,
        endTime: undefined === req.body.endTime ? null : req.body.endTime,
        description: undefined === req.body.description ? null : req.body.description,
        isAllDay: undefined === req.body.isAllDay ? 0 : req.body.isAllDay
    }

    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
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
            userMdl.findCalendarIdByUserId(userId, (data) => {
                let _calendarId = data;
                if (null === _calendarId || undefined === _calendarId || '' === _calendarId || calendarId !== _calendarId) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_CALENDAR);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.updateCalendarEventByCalendarIdByEventId(calendarId, eventId, event, (data) => {
                let calendarsEvents = data;
                resolve(calendarsEvents);
            });
        });
    }).then((calendarsEvents) => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
            data: calendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(403).json(json);
    });
}

calendarsEvents.deleteOne = (req, res, next) => {
    let userId = req.params.userid;
    let eventId = req.params.eventid;

    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            userMdl.findCalendarIdByUserId(userId, (data) => {
                var calendarId = data;
                if (false === calendarId || undefined === calendarId || '' === calendarId) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.removeCalendarEventByUserIdByEventId(userId, eventId, (result) => {
                if (undefined === result || '' === result || null === result) {

                    reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_REMOVE);
                }
                var calendarsEvents = result;
                resolve(calendarsEvents);
            });
        });
    }).then((calendarsEvents) => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
            data: calendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(403).json(json);
    });
}

module.exports = calendarsEvents;