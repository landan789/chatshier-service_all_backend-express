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
                var events = data;
                if (false === events || undefined === events || '' === events) {
                    resolve();
                    return;
                }
                resolve(events);
            });
        });
    }).then((data) => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            "data": data
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            "status": 0,
            "msg": ERR.MSG,
            "code": ERR.CODE
        };
        res.status(403).json(json);
    });
}

calendarsEvents.postOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    let userId = req.params.userid;
    let dataObj = {
        title: req.body.title,
        start: req.body.start,
        end: req.body.end,
        description: req.body.description,
        allDay: req.body.allDay,
        delete: 0
    };
    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.insertCalendarEventByUserId(userId, dataObj, (data) => {
                let obj = data;
                resolve(obj);
            });
        });
    }).then((data) => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
            "obj": data
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            "status": 0,
            "msg": ERR.MSG,
            "code": ERR.CODE
        };
        res.status(403).json(json);
    });
}

calendarsEvents.putOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    let userId = req.params.userid;
    let eventId = req.params.eventid;
    let dataObj = {
        title: req.body.title,
        start: req.body.start,
        end: req.body.end,
        description: req.body.description,
        allDay: req.body.allDay
    }

    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            userMdl.findCalendarIdsByUserId(userId, (data) => {
                let calendarId = data;
                if (false === calendarId || undefined === calendarId || '' === calendarId) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.updateCalendarEventByUserIdByEventId(userId, eventId, dataObj, (data) => {
                let obj = data;
                resolve(obj);
            });
        });
    }).then((data) => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
            "data": data
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            "status": 0,
            "msg": ERR.MSG,
            "code": ERR.CODE
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
            userMdl.findCalendarIdsByUserId(userId, (data) => {
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
            calendarsEventsMdl.removeCalendarEventByUserIdByEventId(userId, eventId, () => {
                resolve();
            });
        });
    }).then(() => {
        var json = {
            "status": 1,
            "msg": API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            "status": 0,
            "msg": ERR.MSG,
            "code": ERR.CODE
        };
        res.status(403).json(json);
    });
}

module.exports = calendarsEvents;