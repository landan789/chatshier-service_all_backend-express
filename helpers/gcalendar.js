module.exports = (function() {
    const request = require('request');

    const rrule = require('rrule');
    const RRule = rrule.RRule;
    const RRuleSet = rrule.RRuleSet;
    const rrulestr = rrule.rrulestr;

    const CHATSHIER_CFG = require('../config/chatshier.js');
    const google = require('googleapis').google;
    const OAuth2 = google.auth.OAuth2;
    const DEFAULT_ROLE = 'reader';
    const DEFAULT_SCOPE_TYPE = 'user';

    const NOT_FOUND = 404;
    const GONE = 410;

    class GoogleCalendarHelper {
        constructor() {
            const oauth2Client = new OAuth2(CHATSHIER_CFG.GMAIL.CLIENT_ID, CHATSHIER_CFG.GMAIL.CLIENT_SECRET);
            oauth2Client.setCredentials({
                refresh_token: CHATSHIER_CFG.GMAIL.REFRESH_TOKEN
            });

            this.client = google.calendar({
                version: 'v3',
                auth: oauth2Client
            });
        }

        /**
         * @param {string} gmail
         * @returns {Promise<boolean>}
         */
        isAvailableGmail(gmail) {
            return new Promise((resolve, reject) => {
                if (!gmail) {
                    return resolve(false);
                }

                let options = {
                    url: 'https://mail.google.com/mail/gxlu?email=' + encodeURIComponent(gmail) + '&zx=' + Date.now(),
                    method: 'GET'
                };
                request(options, (error, res) => {
                    if (error || res.statusCode >= 300) {
                        return reject(res.statusCode);
                    }
                    return resolve(!!(res.headers['set-cookie'] || res.headers['Set-Cookie']));
                });
            });
        }

        /**
         * @param {Chatshier.GCalendar.EventResource | Chatshier.Models.Schedule} event
         * @param {Date} [dtstart]
         * @param {number} [maxDates]
         * @returns {Date[]}
         */
        getEventDates(event, dtstart, maxDates = 30) {
            let recurrence = event.recurrence || [];
            let _dtstart = dtstart || new Date(event.start.dateTime);
            _dtstart.setMinutes(0, 0, 0);

            let rruleSet = new RRuleSet();
            if (!recurrence[0]) {
                let endDateTime = new Date(event.end.dateTime);
                rruleSet.rrule(new RRule({
                    freq: RRule.DAILY,
                    dtstart: _dtstart,
                    wkst: RRule.SU,
                    until: endDateTime
                }));
                return rruleSet.all((d, len) => len <= maxDates);
            }

            for (let i in recurrence) {
                let _rrule = rrulestr(recurrence[i]);
                /** @type {any} */
                let options = Object.assign({}, _rrule.options);
                if (null === options.freq) {
                    continue;
                }

                options.wkst = RRule.SU;
                options.byhour = options.byminute = options.bysecond = null;
                options.dtstart = _dtstart;

                let rrule = new RRule(options);
                rruleSet.rrule(rrule);
            }
            return rruleSet.all((d, len) => len <= maxDates);
        }

        /**
         * @returns {Promise<Chatshier.GCalendar.CalendarList>}
         */
        getCalendarList() {
            return new Promise((resolve, reject) => {
                return this.client.calendarList.list({
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
            if (!summary) {
                return Promise.reject(new Error('summary is empty.'));
            }

            return new Promise((resolve, reject) => {
                return this.client.calendars.insert({
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
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty.'));
            }

            return new Promise((resolve, reject) => {
                let requestBody = {};
                ('string' === typeof summary) && (requestBody.summary = summary);
                ('string' === typeof description) && (requestBody.description = description);
                ('string' === typeof timeZone) && (requestBody.timeZone = timeZone);
                ('string' === typeof location) && (requestBody.location = location);

                return this.client.calendars.update({
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
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty.'));
            }

            return new Promise((resolve, reject) => {
                return this.client.calendars.clear({
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
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty.'));
            }

            return this.getCalendarACL(calendarId).then((accessControllList) => {
                // 移除行事曆之前先把此行事曆的所有取消分享者，再移除行事曆
                let items = accessControllList.items;
                return Promise.all(items.map((accessControllResource) => {
                    return new Promise((resolve, reject) => {
                        this.client.acl.delete({
                            calendarId: calendarId,
                            ruleId: accessControllResource.id
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
                }));
            }).then(() => {
                return new Promise((resolve, reject) => {
                    return this.client.calendars.delete({
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
            });
        }

        /**
         * @param {string} calendarId - Calendar identifier
         * @returns {Promise<Chatshier.GCalendar.AccessControllList>}
         */
        getCalendarACL(calendarId) {
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty.'));
            }

            return new Promise((resolve, reject) => {
                return this.client.acl.list({
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
         * @param {string} ruleId
         * @returns {Promise<Chatshier.GCalendar.AccessControllResource>}
         */
        getCalendarACR(calendarId, ruleId) {
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty.'));
            }

            if (!ruleId) {
                return Promise.reject(new Error('ruleId is empty.'));
            }

            return new Promise((resolve, reject) => {
                return this.client.acl.get({
                    calendarId: calendarId,
                    ruleId: ruleId
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
        shareCalendar(calendarId, email, role = DEFAULT_ROLE, scopeType = DEFAULT_SCOPE_TYPE) {
            let ruleId = scopeType + ':' + email;

            return this.getCalendarACR(calendarId, ruleId).then((acr) => {
                if (acr) {
                    return acr;
                }

                return new Promise((resolve, reject) => {
                    return this.client.acl.insert({
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
            let ruleId = scopeType + ':' + email;

            return this.getCalendarACR(calendarId, ruleId).then((acr) => {
                if (!acr) {
                    return '';
                }

                return new Promise((resolve, reject) => {
                    return this.client.acl.delete({
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
                return this.client.channels.stop({
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
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty'));
            }

            return new Promise((resolve, reject) => {
                return this.client.events.list({
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
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty'));
            }

            if (!eventId) {
                return Promise.reject(new Error('eventId is empty'));
            }

            return new Promise((resolve, reject) => {
                return this.client.events.get({
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
         * @property {string} [summary]
         * @property {string} [description]
         * @property {Date} [startDateTime]
         * @property {Date} [endDateTime]
         * @property {any[]} [attendees]
         * @property {string[]} [recurrence]
         * @param {string} calendarId
         * @param {EventUpdateParams} params
         * @returns {Promise<Chatshier.GCalendar.EventResource>}
         */
        insertEvent(calendarId, params) {
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty'));
            }

            return new Promise((resolve, reject) => {
                return this.client.events.insert({
                    calendarId: calendarId,
                    sendNotifications: true,
                    requestBody: {
                        summary: params.summary || '',
                        description: params.description || '',
                        start: {
                            dateTime: params.startDateTime.toISOString(),
                            timeZone: 'UTC'
                        },
                        end: {
                            dateTime: params.endDateTime.toISOString(),
                            timeZone: 'UTC'
                        },
                        attendees: params.attendees ? params.attendees.map((attendee) => {
                            return {
                                displayName: attendee.name,
                                email: attendee.email,
                                optional: true // 可不參加
                            };
                        }) : [],
                        recurrence: (params.recurrence || []).filter((recu) => !!recu),
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
         * @param {EventUpdateParams} params
         * @returns {Promise<Chatshier.GCalendar.EventResource>}
         */
        updateEvent(calendarId, eventId, params) {
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty'));
            }

            if (!eventId) {
                return Promise.reject(new Error('eventId is empty'));
            }

            return new Promise((resolve, reject) => {
                let requestBody = {};
                params.summary && (requestBody.summary = params.summary);
                params.description && (requestBody.description = params.description);
                params.startDateTime && (requestBody.start = {
                    dateTime: params.startDateTime.toISOString(),
                    timeZone: 'UTC'
                });
                params.endDateTime && (requestBody.end = {
                    dateTime: params.endDateTime.toISOString(),
                    timeZone: 'UTC'
                });
                params.recurrence && (requestBody.recurrence = params.recurrence.filter((recu) => !!recu));

                return this.client.events.update({
                    calendarId: calendarId,
                    eventId: eventId,
                    sendNotifications: false,
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
         * @param {string} calendarId
         * @param {string} eventId
         * @param {string} webhookUrl
         * @returns {Promise<Chatshier.GCalendar.WebhookChannel>}
         */
        watchEvent(calendarId, eventId, webhookUrl) {
            return new Promise((resolve, reject) => {
                return this.client.events.watch({
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
            if (!calendarId) {
                return Promise.reject(new Error('calendarId is empty'));
            }

            if (!eventId) {
                return Promise.reject(new Error('eventId is empty'));
            }

            return new Promise((resolve, reject) => {
                return this.client.events.delete({
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
