window.googleCalendarHelper = (function() {
    var googleCalendar = {
        configJsonUrl: 'json/google_calendar.json',
        getCalendarEvents: function(calendarId) {
            var gAuth = window.googleClientHelper.auth();
            if (!gAuth.isSignedIn.get()) {
                return Promise.reject(new Error('GOOGLE_CLIENT_NOT_SIGNEDIN'));
            }

            calendarId = calendarId || 'primary';
            return window.gapi.client.calendar.events.list({
                calendarId: calendarId,
                showDeleted: false
            }).then(function(res) {
                if (200 !== res.status) {
                    return Promise.reject(new Error(res.status + ' ' + res.statusText));
                }
                return res.result;
            });
        }
    };

    return googleCalendar;
})();
