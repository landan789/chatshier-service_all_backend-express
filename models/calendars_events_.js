module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CALENDARS = 'calendars';
    const CALENDAR_WAS_NOT_FOUND = 'CALENDAR_WAS_NOT_FOUND';

    class CalendarsEvents extends ModelCore {
        constructor() {
            super();
            this.CalendarsModel = this.model(CALENDARS, this.CalendarsSchema);
        }

        /**
         * @param {any|string[]} calendarIds
         * @param {any|string[]} eventIds
         * @param {(calendar: string|string[]|null) => any} [callback]
         * @returns {Promise<any>}
         */
        find(calendarIds, eventIds, callback) {
            if (!(calendarIds instanceof Array)) {
                calendarIds = [calendarIds];
            }
            return Promise.all(calendarIds.map((calendarId) => {
                return Promise.resolve().then(() => {
                    let aggregations = [
                        {
                            $unwind: '$events'
                        }, {
                            $project: {
                                events: 1
                            }
                        }
                    ];
                    if (!eventIds) {
                        aggregations.push({
                            $match: {
                                '_id': this.Types.ObjectId(calendarId),
                                'events.isDeleted': false
                            }
                        });
                        return this.CalendarsModel.aggregate(aggregations);
                    }
                    if (!(eventIds instanceof Array)) {
                        eventIds = [eventIds];
                    }
                    aggregations.push({
                        $match: {
                            '_id': this.Types.ObjectId(calendarId),
                            'events.isDeleted': false,
                            'events._id': {
                                $in: eventIds.map((eventId) => this.Types.ObjectId(eventId))
                            }
                        }
                    });
                    return this.CalendarsModel.aggregate(aggregations);
                }).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error(CALENDAR_WAS_NOT_FOUND));
                    }

                    let calendarEvents = results.reduce((output, calendar) => {
                        output[calendar._id] = output[calendar._id] || {events: {}};
                        Object.assign(output[calendar._id].events, this.toObject(calendar.events));
                        return output;
                    }, {});
                    return calendarEvents;
                });
            })).then((calendarEvents) => {
                let calendarsEvents = calendarEvents.reduce((output, curr) => {
                    Object.assign(output, this.toObject(curr));
                    return output;
                }, {});
                ('function' === typeof callback) && callback(calendarsEvents);
                return Promise.resolve(calendarsEvents);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }

        /**
         * @param {string} calendarId
         * @param {any} postEvent
         * @param {(calendar: string) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(calendarId, postEvent, callback) {
            let eventId = this.Types.ObjectId();
            postEvent._id = eventId;
            return Promise.resolve().then(() => {
                if (!calendarId) {
                    // 首次插入資料時不會有 calendarId
                    // 因此須自行新增一個 calendar
                    let newCalendar = new this.CalendarsModel();
                    newCalendar.events.push(postEvent);
                    return newCalendar.save().then((insertedCalendar) => {
                        let insertedCalendarId = insertedCalendar._id;
                        return this.find(insertedCalendarId, eventId);
                    });
                }
                return this.CalendarsModel.findById(calendarId).then((calendar) => {
                    calendar.events.push(postEvent);
                    return calendar.save();
                }).then(() => {
                    return this.find(calendarId, eventId);
                });
            }).then((calendars) => {
                ('function' === typeof callback) && callback(calendars);
                return Promise.resolve(calendars);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        };

        /**
         * @param {string} calendarId
         * @param {any} putEvent
         * @param {(calendar: string) => any} [callback]
         * @returns {Promise<any>}
         */
        update(calendarId, eventId, putEvent, callback) {
            let calendarQuery = {
                '_id': calendarId,
                'events._id': eventId
            };
            let setEvent = {
                $set: {
                    'events.$._id': eventId
                }
            };
            for (let prop in putEvent) {
                setEvent.$set['events.$.' + prop] = putEvent[prop];
            }

            return this.CalendarsModel.update(calendarQuery, setEvent).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(calendarId, eventId);
            }).then((calendar) => {
                ('function' === typeof callback) && callback(calendar);
                return Promise.resolve(calendar);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        };

        /**
         * @param {string} calendarId
         * @param {string} eventId
         * @param {(calendar: string) => any} [callback]
         * @returns {Promise<any>}
         */
        remove(calendarId, eventId, callback) {
            let calendarQuery = {
                '_id': calendarId,
                'events._id': eventId
            };
            let setEvent = {
                $set: {
                    'events.$.isDeleted': true
                }
            };
            return this.CalendarsModel.update(calendarQuery, setEvent).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let aggregations = [
                    {
                        $unwind: '$events'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(calendarId),
                            'events._id': this.Types.ObjectId(eventId)
                        }
                    }, {
                        $project: {
                            events: 1
                        }
                    }
                ];

                return this.CalendarsModel.aggregate(aggregations);
            }).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error(CALENDAR_WAS_NOT_FOUND));
                }

                let calendarEvents = results.reduce((output, calendar) => {
                    output[calendar._id] = output[calendar._id] || {events: {}};
                    Object.assign(output[calendar._id].events, this.toObject(calendar.events));
                    return output;
                }, {});
                return calendarEvents;
            }).then((calendarEvents) => {
                ('function' === typeof callback) && callback(calendarEvents);
                return calendarEvents;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };
    }
    return new CalendarsEvents();
})();