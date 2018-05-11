window.googleCalendarHelper = (function() {
    var GOOGLE_CLIENT_NOT_SIGNEDIN = 'GOOGLE_CLIENT_NOT_SIGNEDIN';
    var mapRes = function(res) {
        if (res.status >= 300) {
            return Promise.reject(new Error(res.status + ' ' + res.statusText));
        }
        return res.result;
    };

    var googleCalendar = {
        findEvents: function(calendarId) {
            var gAuth = window.googleClientHelper.auth();
            if (!gAuth.isSignedIn.get()) {
                return Promise.reject(new Error(GOOGLE_CLIENT_NOT_SIGNEDIN));
            }

            calendarId = calendarId || 'primary';
            return window.gapi.client.calendar.events.list({
                calendarId: calendarId,
                showDeleted: false
            }).then(mapRes);
        },
        updateEvent: function(calendarId, eventId, event) {
            var gAuth = window.googleClientHelper.auth();
            if (!gAuth.isSignedIn.get()) {
                return Promise.reject(new Error(GOOGLE_CLIENT_NOT_SIGNEDIN));
            }

            return window.gapi.client.calendar.events.update({
                calendarId: calendarId,
                eventId: eventId,
                resource: event
            }).then(mapRes);
        },
        deleteEvent: function(calendarId, eventId) {
            var gAuth = window.googleClientHelper.auth();
            if (!gAuth.isSignedIn.get()) {
                return Promise.reject(new Error(GOOGLE_CLIENT_NOT_SIGNEDIN));
            }

            return window.gapi.client.calendar.events.delete({
                calendarId: calendarId,
                eventId: eventId
            }).then(mapRes);
        }
    };

    return googleCalendar;
})();
