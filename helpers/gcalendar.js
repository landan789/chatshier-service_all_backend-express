module.exports = (function() {
    const CHATSHIER_CFG = require('../config/chatshier.js');
    const google = require('googleapis').google;
    const OAuth2 = google.auth.OAuth2;
    const DEFAULT_ROLE = 'reader';
    const DEFAULT_SCOPE_TYPE = 'user';

    const NOT_FOUND = 404;
    const GONE = 410;

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
                        if (NOT_FOUND === err['code'] ||
                            GONE === err['code']) {
                            return resolve('');
                        }
                        return reject(err);
                    }
                    return resolve(res.data);
                });
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
         * @param {'default' | 'user' | 'group' | 'domain'} [scopeType=DEFAULT_SCOPE_TYPE]
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
         * @param {'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner'} [role=DEFAULT_ROLE]
         * @param {'default' | 'user' | 'group' | 'domain'} [scopeType=DEFAULT_SCOPE_TYPE]
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
         * @param {'default' | 'user' | 'group' | 'domain'} [scopeType=DEFAULT_SCOPE_TYPE]
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
                            if (NOT_FOUND === err['code'] ||
                                GONE === err['code']) {
                                return resolve('');
                            }
                            return reject(err);
                        }
                        return resolve(res.data);
                    });
                });
            });
        }

        /**
         * @param {string} targetId
         * @param {string} resourceId
         * @returns {Promise<string>}
         */
        stopChannel(targetId, resourceId) {
            return new Promise((resolve, reject) => {
                this.client.channels.stop({
                    requestBody: {
                        id: targetId,
                        resourceId: resourceId,
                        token: CHATSHIER_CFG.JWT.SECRET
                    }
                }, (err, res) => {
                    if (err) {
                        if (404 === err['code']) {
                            return resolve('');
                        }
                        return reject(err);
                    }
                    return resolve(res.data);
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
         * @param {string} eventId
         * @returns {Promise<Chatshier.GCalendar.EventResource>}
         */
        getEvent(calendarId, eventId) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty'));
                }

                if (!eventId) {
                    return reject(new Error('eventId is empty'));
                }

                this.client.events.get({
                    calendarId: calendarId,
                    eventId: eventId
                }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }

        /**
         * @typedef EventUpdateParams
         * @property {string} summary
         * @property {string} [description]
         * @property {Date} startDatetime
         * @property {Date} endDatetime
         * @property {any[]} attendees
         * @param {string} calendarId
         * @param {EventUpdateParams} params
         * @returns {Promise<Chatshier.GCalendar.EventResource>}
         */
        insertEvent(calendarId, params) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty'));
                }

                this.client.events.insert({
                    calendarId: calendarId,
                    sendNotifications: true,
                    requestBody: {
                        summary: params.summary || '',
                        description: params.description || '',
                        start: {
                            dateTime: params.startDatetime.toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: params.endDatetime.toISOString(),
                            timeZone: 'UTC'
                        },
                        attendees: params.attendees.map((attendee) => {
                            return {
                                displayName: attendee.name,
                                email: attendee.email,
                                optional: true // 可不參加
                            };
                        }),
                        guestsCanModify: false,
                        guestsCanInviteOthers: false,
                        guestsCanSeeOtherGuests: true
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
         * @param {string} calendarId
         * @param {string} eventId
         * @param {string} webhookUrl
         * @returns {Promise<Chatshier.GCalendar.WebhookChannel>}
         */
        watchEvent(calendarId, eventId, webhookUrl) {
            return new Promise((resolve, reject) => {
                this.client.events.watch({
                    calendarId: calendarId,
                    requestBody: {
                        id: eventId,
                        type: 'web_hook',
                        token: CHATSHIER_CFG.JWT.SECRET,
                        address: webhookUrl,
                        params: {
                            ttl: 63072000 // webhook 時效性 2 年
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

        /**
         * @param {string} calendarId
         * @param {string} eventId
         * @returns {Promise<string>}
         */
        deleteEvent(calendarId, eventId) {
            return new Promise((resolve, reject) => {
                if (!calendarId) {
                    return reject(new Error('calendarId is empty'));
                }

                if (!eventId) {
                    return reject(new Error('eventId is empty'));
                }

                this.client.events.delete({
                    calendarId: calendarId,
                    eventId: eventId
                }, (err, res) => {
                    if (err) {
                        if (NOT_FOUND === err['code'] ||
                            GONE === err['code']) {
                            return resolve('');
                        }
                        return reject(err);
                    }
                    return resolve(res.data);
                });
            });
        }
    }
    return new GoogleCalendarHelper();
})();
