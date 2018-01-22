var admin = require('firebase-admin'); // firebase admin SDK
var calendarsEvents = {};

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
            calendarsEvents.findCalendarIdByUserId(userId, (data) => {
                if (null === data || undefined === data || '' === data) {
                    reject(null);
                    return;
                }
                resolve(data);
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

calendarsEvents.insertCalendarEventByUserId = (userId, obj, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            calendarsEvents.findCalendarIdByUserId(userId, (data) => {
                let result = data;
                resolve(result);
            });
        });
    }).then((data) => {
        let result = data;
        return new Promise((resolve, reject) => {
            if (false !== result && undefined !== result) {
                let calendarId = result;
                let eventId = admin.database().ref('calendars/' + calendarId + '/events').push().key;
                obj.keyId = eventId;
                admin.database().ref('calendars/' + calendarId + '/events/' + eventId).set(obj).then(() => {
                    callback(obj);
                });
            } else {
                let calendarId = admin.database().ref('calendars').push().key;
                let eventId = admin.database().ref('calendars/' + calendarId + '/events').push().key;
                obj.keyId = eventId;
                admin.database().ref('calendars/' + calendarId + '/events/' + eventId).set(obj).then(() => {
                    admin.database().ref('users/' + userId + '/calendar_id').set(calendarId).then(() => {
                        callback(obj);
                    });
                });
            }
        });
    }).catch(() => {
        callback(false);
    });
};

calendarsEvents.updateCalendarEventByUserIdByEventId = (userId, eventId, calendarObj, callback) => {
    let proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            calendarsEvents.findCalendarIdByUserId(userId, (data) => {
                let calendarId = data;
                if (null !== calendarId || undefined !== calendarId || '' !== calendarId) {
                    resolve(calendarId);
                }
            });
        });
    }).then((data) => {
        let calendarId = data;
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId).set(calendarObj);
    }).then(() => {
        callback(calendarObj);
    }).catch(() => {
        callback(false);
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
                if (null !== calendarId || undefined !== calendarId || '' !== calendarId) {
                    reject();
                    return;
                }
                resolve(calendarId);

            });
        });
    }).then((data) => {
        let calendarId = data;
        var event = { delete: 1 };
        return admin.database().ref('calendars/' + calendarId + '/events/' + eventId).update(event);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

module.exports = calendarsEvents;