module.exports = (function() {
    const CHATSHIER_CFG = require('../config/chatshier.js');
    const google = require('googleapis').google;
    const OAuth2 = google.auth.OAuth2;
    const DEFAULT_ROLE = 'reader';
    const DEFAULT_SCOPE_TYPE = 'user';

    class GoogleCalendarHelper {
        constructor() {
            const oauth2Client = new OAuth2(CHATSHIER_CFG.GAPI.CLIENT_ID, CHATSHIER_CFG.GAPI.CLIENT_SECRET);
            oauth2Client.setCredentials({
                refresh_token: CHATSHIER_CFG.GAPI.REFRESH_TOKEN
            });

            this.client = google.calendar({
                version: 'v3',
                auth: oauth2Client
            });
        }

        /**
         * @returns {Promise<Chatshier.GCalendar.CalendarList>}
         */
        getCalendarList() {
            return new Promise((resolve, reject) => {
                this.client.calendarList.list({
                    // 只抓取是本身擁有的日曆
                    minAccessRole: 'owner'
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} summary - Title of the calendar.
         * @param {string} [description=''] - Description of the calendar.
         * @returns {Promise<Chatshier.GCalendar.CalendarResource>}
         */
        insertCalendar(summary, description = '') {
            return new Promise((resolve, reject) => {
                if (!summary) {
                    return reject(new Error('summary is empty.'));
                }

                this.client.calendars.insert({
                    requestBody: {
                        summary: summary,
                        description: description
                    }
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @param {string} [summary] - Title of the calendar
         * @param {string} [description] - Title of the calendar
         * @param {string} [timeZone] - The time zone of the calendar
         * @param {string} [location] - Geographic location of the calendar as free-form text
         * @returns {Promise<Chatshier.GCalendar.CalendarResource>}
         */
        updateCalendar(calendarId, summary, description, timeZone, location) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty.'));
                }

                let requestBody = {};
                ('string' === typeof summary) && (requestBody.summary = summary);
                ('string' === typeof description) && (requestBody.description = description);
                ('string' === typeof timeZone) && (requestBody.timeZone = timeZone);
                ('string' === typeof location) && (requestBody.location = location);

                this.client.calendars.update({
                    calendarId: calendarId,
                    requestBody: requestBody
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @returns {Promise<string>}
         */
        clearCalendar(calendarId) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty.'));
                }

                this.client.calendars.clear({
                    calendarId: calendarId
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @returns {Promise<string>}
         */
        deleteCalendar(calendarId) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty.'));
                }

                this.client.calendars.delete({
                    calendarId: calendarId
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @returns {Promise<string[]>}
         */
        deleteAllCalendars() {
            return this.getCalendarList().then((gcalendarList) => {
                return Promise.all(gcalendarList.items.map((gcalendar) => {
                    if (CHATSHIER_CFG.GAPI.USER === gcalendar.id) {
                        return Promise.resolve('');
                    }
                    return this.deleteCalendar(gcalendar.id);
                }));
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @returns {Promise<Chatshier.GCalendar.AccessControllList>}
         */
        getCalendarACL(calendarId) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty.'));
                }

                this.client.acl.list({
                    calendarId: calendarId
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @param {string} email
         * @param {string} [scopeType=DEFAULT_SCOPE_TYPE]
         * @returns {Promise<Chatshier.GCalendar.AccessControllResource>}
         */
        getCalendarACR(calendarId, email, scopeType = DEFAULT_SCOPE_TYPE) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty.'));
                }

                if (!email) {
                    return reject(new Error('email is empty.'));
                }

                this.client.acl.get({
                    calendarId: calendarId,
                    ruleId: scopeType + ':' + email
                }, (err, res) => {
                    if (err) {
                        if (404 === err['code']) {
                            return resolve(void 0);
                        }
                        return reject(err);
                    }

                    if ('none' === res.data.role) {
                        return resolve(void 0);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @param {string} email - gmail of share target
         * @param {string} [role=DEFAULT_ROLE]
         * @param {string} [scopeType=DEFAULT_SCOPE_TYPE]
         * @returns {Promise<Chatshier.GCalendar.AccessControllResource>}
         */
        sharingCalendar(calendarId, email, role = DEFAULT_ROLE, scopeType = DEFAULT_SCOPE_TYPE) {
            return this.getCalendarACR(calendarId, email, scopeType).then((acr) => {
                if (acr) {
                    return acr;
                }

                return new Promise((resolve, reject) => {
                    this.client.acl.insert({
                        calendarId: calendarId,
                        requestBody: {
                            role: role,
                            scope: {
                                type: scopeType,
                                value: email
                            }
                        }
                    }, (err, res) => {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(res.data);
                    });
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @param {string} email
         * @param {string} [scopeType=DEFAULT_SCOPE_TYPE]
         * @returns {Promise<string>}
         */
        cancelCalendarSharing(calendarId, email, scopeType = DEFAULT_SCOPE_TYPE) {
            return this.getCalendarACR(calendarId, email, scopeType).then((acr) => {
                if (!acr) {
                    return '';
                }

                return new Promise((resolve, reject) => {
                    this.client.acl.delete({
                        calendarId: calendarId,
                        ruleId: scopeType + ':' + email
                    }, (err, res) => {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(res.data);
                    });
                });
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @returns {Promise<Chatshier.GCalendar.EventList>}
         */
        getEventList(calendarId) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty'));
                }

                this.client.events.list({
                    calendarId: calendarId
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @param {string} calendarId
         * @param {string} summary
         * @param {string} description
         * @param {Date} startDatetime
         * @param {Date} endDatetime
         * @returns {Promise<Chatshier.GCalendar.EventResource>}
         */
        insertEvent(calendarId, summary, description, startDatetime, endDatetime) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty'));
                }

                this.client.events.insert({
                    calendarId: calendarId,
                    requestBody: {
                        summary: summary,
                        description: description,
                        start: {
                            dateTime: startDatetime.toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: endDatetime.toISOString(),
                            timeZone: 'UTC'
                        }
                    }
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }
    }
    return new GoogleCalendarHelper();
})();
