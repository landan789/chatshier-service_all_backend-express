var admin = require('firebase-admin'); // firebase admin SDK
var calendarsEvents = {};
calendarsEvents._schema = (callback) => {
    var json = {
        isAllDay: 0,
        isDeleted: 0,
        description: null,
        endTime: 0,
        startTime: 0,
        title: null
    };
    callback(json);
}

calendarsEvents.findCalendarIdByUserId = (userId, callback) => {
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
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId + '/calendar_id').once('value', (snap) => {
                let calendarId = snap.val();
                if (null === calendarId || undefined === calendarId || '' === calendarId) {
                    reject();
                    return;
                }
                resolve(calendarId);
            });
        });
    }).then((data) => {
        let calendarId = data;
        admin.database().ref('calendars/' + calendarId + '/events').once('value', (snap) => {
            let events = snap.val();
            if (null === events || undefined === events || '' === events) {
                events = {};
            }
            var calendarsEvents = {};
            calendarsEvents[calendarId] = {
                events: events
            };
            callback(calendarsEvents);
        });
    }).catch(() => {
        callback(false);
    });
};

calendarsEvents.findCalendarEventByCalendarIByEventId = (userId, calendarId, eventId, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId + '/calendar_id').once('value', (snap) => {
                let calendarId = snap.val();
                if (null === calendarId || undefined === calendarId || '' === calendarId) {
                    reject();
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
                    reject(null);
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

calendarsEvents.insertCalendarEventByCalendarIdByUserId = (calendarId, userId, event, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref('users/' + userId).once('value', (snap) => {
                let user = snap.val();
                if (null === user || undefined === user || '' === user) {
                    reject(null);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        let calendarId = user.calendar_id;
        if (false === calendarId || undefined === calendarId || '' === calendarId) {

            return admin.database().ref('calendars').push().then((ref) => {
                var calendarId = ref.key;
                return admin.database().ref('calendars/' + calendarId + '/events').push(event);
            }).then((ref) => {
                var calendarId = ref.parent.parent.key;
                var eventId = ref.parent.key;
                user = {
                    calendar_id: calendarId
                }
                return Promise.all([admin.database().ref('users/' + userId).update(user), calendarId, eventId]);
            }).then((result) => {
                var calendarId = result[1];
                var eventId = result[2];
                return admin.database().ref('calendars/' + calendarId + '/events');
            });

        }

        return admin.database().ref('calendars/' + calendarId + '/events').push(event);

    }).then((ref) => {
        return ref.once('value');
    }).then((snap) => {
        var event = snap.val();
        var eventId = snap.key;
        var calendarId = snap.ref.parent.parent.key;
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

calendarsEvents.updateCalendarEventByCalendarIdByEventId = (calendarId, eventId, event, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId).once('value');
    }).then((snap) => {
        var event = snap.val();
        if (1 === event.isDeleted) {
            return Promise.reject();
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
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            calendarsEvents.findCalendarIdByUserId(userId, (data) => {
                let calendarId = data;
                if (null === calendarId || undefined === calendarId || '' === calendarId) {
                    reject();
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
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId);
    }).then((ref) => {
        return ref.once('value');
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