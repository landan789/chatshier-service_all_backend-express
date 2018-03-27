const API_ERROR = require('../config/api_error');
const API_SUCCESS = require('../config/api_success');
const calendarsEventsMdl = require('../models/calendars_events');
const userMdl = require('../models/users');
let calendarsEvents = {};

calendarsEvents.getAll = function(req, res, next) {
    let userId = req.params.userid;
    let eventId = undefined === req.params.eventid ? null : req.params.eventid;

    return userMdl.findCalendarId(userId).then((calendarId) => {
        if (!calendarId) {
            return {};
        }

        return new Promise((resolve, reject) => {
            calendarsEventsMdl.find(calendarId, eventId, (calendarsEvents) => {
                if (!calendarsEvents) {
                    reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_FIND);
                    return;
                }
                resolve(calendarsEvents);
            });
        });
    }).then((calendarsEvents) => {
        let json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: calendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        let json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(500).json(json);
    });
};

calendarsEvents.postOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    let userId = req.params.userid;
    let event = {
        title: undefined === req.body.title ? null : req.body.title,
        startedTime: undefined === req.body.startedTime ? null : req.body.startedTime,
        endedTime: undefined === req.body.endedTime ? null : req.body.endedTime,
        description: undefined === req.body.description ? null : req.body.description,
        isAllDay: undefined === req.body.isAllDay ? 0 : req.body.isAllDay
    };
    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            userMdl.findCalendarId(userId, (userCalendarId) => {
                if (!(userCalendarId instanceof Array)) {
                    userCalendarId = [userCalendarId];
                };
                var calendarId = 0 === userCalendarId.length ? '' : userCalendarId;
                // 首次插入資料時不會有 calendarId
                resolve(calendarId);
            });
        });
    }).then((calendarId) => {
        return new Promise((resolve, reject) => {
            calendarsEventsMdl.insert(calendarId, event, (calendarsEvents) => {
                if (null === calendarsEvents || undefined === calendarsEvents || '' === calendarsEvents) {
                    reject(API_ERROR.CALENDAR_EVENT_FAILED_TO_INSERT);
                    return;
                }
                if (!calendarId) {
                    // 插入事件至指定的行事曆並同時更新使用者的 calendar_id 欄位
                    let userCalendarId = {
                        calendar_id: Object.keys(calendarsEvents)[0]
                    };
                    userMdl.update(userId, userCalendarId, (user) => {
                        if (!user) {
                            reject(API_ERROR.USER_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve();
                    });
                }
                resolve(calendarsEvents);
            });
        });
    }).then((data) => {
        var calendarsEvents = data;
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
            data: calendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        var json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(500).json(json);
    });
};

calendarsEvents.putOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
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
            userMdl.findCalendarId(userId, (userCalendarId) => {
                if (!(userCalendarId instanceof Array)) {
                    userCalendarId = [userCalendarId];
                };
                let calendarIds = userCalendarId;
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
        res.status(500).json(json);
    });
};

calendarsEvents.deleteOne = (req, res, next) => {
    let userId = req.params.userid;
    let eventId = req.params.eventid;
    let calendarId = req.params.calendarid;

    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            userMdl.findCalendarId(userId, (userCalendarId) => {
                if (!(userCalendarId instanceof Array)) {
                    userCalendarId = [userCalendarId];
                };
                var calendarIds = userCalendarId;
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
        let json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
            data: calendarsEvents
        };
        res.status(200).json(json);
    }).catch((ERR) => {
        let json = {
            status: 0,
            msg: ERR.MSG,
            code: ERR.CODE
        };
        res.status(500).json(json);
    });
};

module.exports = calendarsEvents;
