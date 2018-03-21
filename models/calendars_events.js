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

calendarsEvents.find = (calendarId, callback) => {
    Promise.resolve().then(() => {
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

calendarsEvents.insert = (calendarId, event, callback) => {
    Promise.resolve().then(() => {
        if (!calendarId) {
            // 首次插入資料時不會有 calendarId
            // 因此須自行新增一個 calendarId
            return admin.database().ref('calendars').push().then((calendarsRef) => {
                calendarId = calendarsRef.key;
                return admin.database().ref('calendars/' + calendarId + '/events').push(event).once('value');
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

calendarsEvents.update = (calendarId, eventId, event, callback) => {
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

calendarsEvents.remove = (calendarId, eventId, callback) => {
    Promise.resolve().then(() => {
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