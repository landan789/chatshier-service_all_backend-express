var admin = require('firebase-admin'); // firebase admin SDK
var calendarsEvents = {};
calendarsEvents._schema = (callback) => {
    var json = {
        isAllDay: 0,
        isDeleted: 0,
        description: '',
        createdTime: Date.now(),
        updatedTime: Date.now(),
        endedTime: 0,
        startedTime: 0,
        title: ''
    };
    callback(json);
};

calendarsEvents.findCalendarId = (userId, callback) => {
    admin.database().ref('users/' + userId + '/calendar_id').once('value', (snap) => {
        let calendarId = snap.val();
        if (null === calendarId || undefined === calendarId || '' === calendarId) {
            callback();
            return;
        }
        callback(calendarId);
    });
};

calendarsEvents.findCalendarEventsByUserId = (userId, callback) => {
    Promise.resolve().then(() => {
        return admin.database().ref('users/' + userId + '/calendar_id').once('value').then((snap) => {
            let calendarId = snap.val() || '';
            return calendarId;
        });
    }).then((calendarId) => {
        if (!calendarId) {
            return {};
        }

        let calendarsEvents = {};
        return admin.database().ref('calendars/' + calendarId + '/events').once('value').then((snap) => {
            let events = snap.val() || {};
            calendarsEvents[calendarId] = {
                events: events
            };
            return calendarsEvents;
        });
    }).then((data) => {
        callback(data);
    }).catch(() => {
        callback(null);
    });
};

calendarsEvents.findCalendarEventByCalendarIByEventId = (userId, calendarId, eventId, callback) => {

    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId + '/calendar_id').once('value', (snap) => {
                let calendarId = snap.val();
                if (null === calendarId || undefined === calendarId || '' === calendarId) {
                    reject(new Error());
                    return;
                }
                resolve(calendarId);
            });
        });
    }).then((data) => {
        let calendarId = data;
        return new Promise((resolve, reject) => {
            admin.database().ref('calendars/' + calendarId + '/events/' + eventId).once('value', (snap) => {
                let event = snap.val();
                if (null === event || undefined === event || '' === event) {
                    reject(new Error());
                    return;
                }
                resolve(event);
            });
        });

    }).then((event) => {
        callback(event);
    }).catch(() => {
        callback(null);
    });
};

calendarsEvents.insertCalendarEventByUserId = (userId, event, callback) => {
    Promise.resolve().then(() => {
        return admin.database().ref('users/' + userId).once('value').then((snap) => {
            let user = snap.val();
            if (!user) {
                return Promise.reject(new Error());
            }
            return user;
        });
    }).then((user) => {
        let calendarId = user.calendar_id;
        if (!calendarId) {
            // 首次插入資料時不會有 calendarId
            // 因此須自行新增一個 calendarId
            let calendarsRef = admin.database().ref('calendars').push();
            calendarId = calendarsRef.key;

            return calendarsRef.then(() => {
                let userCalendarId = {
                    calendar_id: calendarId
                };

                // 插入事件至指定的行事曆並同時更新使用者的 calendar_id 欄位
                return Promise.all([
                    admin.database().ref('calendars/' + calendarId + '/events').push(event).once('value'),
                    admin.database().ref('users/' + userId).update(userCalendarId)
                ]);
            }).then((result) => {
                return result[0];
            });
        }

        return admin.database().ref('calendars/' + calendarId + '/events').push(event).once('value');
    }).then((snap) => {
        var event = snap.val();
        var calendarId = snap.ref.parent.parent.key;
        var eventId = snap.key;
        var calendarsEvents = {
            [calendarId]: {
                events: {
                    [eventId]: event
                }
            }
        };
        callback(calendarsEvents);
    }).catch(() => {
        callback(null);
    });
};

calendarsEvents.updateCalendarEventByCalendarIdByEventId = (calendarId, eventId, event, callback) => {
    Promise.resolve().then(() => {
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId).once('value');
    }).then((snap) => {
        var event = snap.val();
        if (1 === event.isDeleted) {
            return Promise.reject(new Error());
        }
        return Promise.resolve();
    }).then(() => {
        event.isDeleted = 0;
        return Promise.all([admin.database().ref('calendars/' + calendarId + '/events/' + eventId).set(event), calendarId, eventId]);
    }).then((result) => {
        calendarId = result[1];
        var eventId = result[2];
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId).once('value');
    }).then((snap) => {
        var event = snap.val();
        calendarId = snap.ref.parent.parent.key;
        var eventId = snap.key;
        var calendarsEvents = {};
        var _events = {};
        _events[eventId] = event;
        calendarsEvents[calendarId] = {
            events: _events
        };
        callback(calendarsEvents);
    }).catch(() => {
        callback(null);
    });
};

calendarsEvents.removeCalendarEventByUserIdByEventId = (userId, eventId, callback) => {
    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            calendarsEvents.findCalendarId(userId, (data) => {
                let calendarId = data;
                if (null === calendarId || undefined === calendarId || '' === calendarId) {
                    reject(new Error());
                    return;
                }
                resolve(calendarId);

            });
        });
    }).then((data) => {
        var calendarId = data;
        var event = {
            isDeleted: 1
        };
        return Promise.all([admin.database().ref('calendars/' + calendarId + '/events/' + eventId).update(event), calendarId, eventId]);
    }).then((result) => {
        var calendarId = result[1];
        var eventId = result[2];
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId).once('value');
    }).then((snap) => {
        var event = snap.val();
        var calendarId = snap.ref.parent.parent.key;
        var eventId = snap.key;
        var calendarsEvents = {};
        var _events = {};
        _events[eventId] = event;
        calendarsEvents[calendarId] = {
            events: _events
        };
        callback(calendarsEvents);
    }).catch(() => {
        callback(null);
    });
};

module.exports = calendarsEvents;