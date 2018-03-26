module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CALENDARS = 'calendars';

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

            let query = {
                '_id': {
                    $in: calendarIds.map((calendarId) => this.Types.ObjectId(calendarId))
                },
                'isDeleted': false,
                'events.isDeleted': false
            };

            if (eventIds) {
                if (!(eventIds instanceof Array)) {
                    eventIds = [eventIds];
                }

                query['events._id'] = {
                    $in: eventIds.map((eventId) => this.Types.ObjectId(eventId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$events'
                }, {
                    $match: query
                }, {
                    $project: {
                        events: 1
                    }
                }
            ];

            return this.CalendarsModel.aggregate(aggregations).then((results) => {
                let calendarEvents = {};
                if (0 === results.length) {
                    return calendarEvents;
                }

                calendarEvents = results.reduce((output, calendar) => {
                    output[calendar._id] = output[calendar._id] || {events: {}};
                    Object.assign(output[calendar._id].events, this.toObject(calendar.events));
                    return output;
                }, {});
                return calendarEvents;
            }).then((calendarEvents) => {
                let calendarsEvents = calendarEvents.reduce((output, curr) => {
                    Object.assign(output, this.toObject(curr));
                    return output;
                }, {});

                ('function' === typeof callback) && callback(calendarsEvents);
                return calendarsEvents;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        }

        /**
         * @param {string} calendarId
         * @param {any} postEvent
         * @param {(calendar: string|null) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(calendarId, postEvent, callback) {
            let eventId = this.Types.ObjectId();
            postEvent._id = eventId;
            return Promise.resolve().then(() => {
                if (!calendarId) {
                    // 首次插入資料時不會有 calendarId
                    // 因此須自行新增一個 calendarId
                    let calendar = new this.CalendarsModel();
                    calendar.events.push(postEvent);
                    return calendar.save().then((insertedCalendar) => {
                        let calendarId = insertedCalendar._id;
                        return this.find(calendarId, eventId);
                    });
                }

                let query = {
                    '_id': calendarId
                };
                let calendar = {
                    '_id': calendarId,
                    $push: {
                        events: postEvent
                    }
                };
                return this.CalendarsModel.update(query, calendar).then((result) => {
                    if (!result.ok) {
                        return Promise.reject(new Error());
                    }
                    return this.find(calendarId, eventId);
                });
            }).then((calendars) => {
                ('function' === typeof callback) && callback(calendars);
                return calendars;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        };

        /**
         * @param {string} calendarId
         * @param {any} putEvent
         * @param {(calendar: string|null) => any} [callback]
         * @returns {Promise<any>}
         */
        update(calendarId, eventId, putEvent, callback) {
            putEvent.updatedTime = undefined === putEvent.updatedTime ? Date.now() : putEvent.updatedTime;
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
                if (null === putEvent[prop]) {
                    continue;
                }
                setEvent.$set['events.$.' + prop] = putEvent[prop];
            }

            return this.CalendarsModel.update(calendarQuery, setEvent).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(calendarId, eventId);
            }).then((calendar) => {
                ('function' === typeof callback) && callback(calendar);
                return calendar;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        };

        /**
         * @param {string} calendarId
         * @param {string} eventId
         * @param {(calendar: string|null) => any} [callback]
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

            return this.CalendarsModel.update(calendarQuery, setEvent).then(() => {
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
                let calendarEvents = {};
                if (0 === results.length) {
                    return calendarEvents;
                }

                calendarEvents = results.reduce((output, calendar) => {
                    output[calendar._id] = output[calendar._id] || {events: {}};
                    Object.assign(output[calendar._id].events, this.toObject(calendar.events));
                    return output;
                }, {});
                return calendarEvents;
            }).then((calendarEvents) => {
                ('function' === typeof callback) && callback(calendarEvents);
                return calendarEvents;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        };
    }
    return new CalendarsEvents();
})();
