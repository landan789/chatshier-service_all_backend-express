module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CALENDARS = 'calendars';

    class CalendarsEvents extends ModelCore {
        constructor() {
            super();
            this.CalendarsModel = this.model(CALENDARS, this.CalendarsSchema);
        }

        /**
         * @param {string | string[]} calendarIds
         * @param {string | string[]} eventIds
         * @param {(calendars: Chatshier.Models.Calendars | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Calendars | null>}
         */
        find(calendarIds, eventIds, callback) {
            if (!(calendarIds instanceof Array)) {
                calendarIds = [calendarIds];
            }

            let match = {
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

                match['events._id'] = {
                    $in: eventIds.map((eventId) => this.Types.ObjectId(eventId))
                };
            }

            let aggregations = [{
                $unwind: '$events'
            }, {
                $match: match
            }, {
                $project: {
                    events: 1
                }
            }, {
                $sort: {
                    'events.createdTime': -1 // 最晚建立的在最前頭
                }
            }];

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
            }).then((calendarsEvents) => {
                ('function' === typeof callback) && callback(calendarsEvents);
                return calendarsEvents;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} calendarIds
         * @param {any} postEvent
         * @param {(calendars: Chatshier.Models.Calendars | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Calendars | null>}
         */
        insert(calendarIds, postEvent, callback) {
            let eventId = this.Types.ObjectId();
            postEvent._id = eventId;
            postEvent.createdTime = postEvent.updatedTime = Date.now();

            return Promise.resolve().then(() => {
                if (calendarIds && !(calendarIds instanceof Array)) {
                    calendarIds = [calendarIds];
                }

                if (!calendarIds || (calendarIds && 0 === calendarIds.length)) {
                    // 首次插入資料時不會有 calendarId
                    // 因此須自行新增一個 calendarId
                    let calendar = new this.CalendarsModel();
                    calendar.createdTime = calendar.updatedTime = Date.now();
                    calendar.events.push(postEvent);
                    return calendar.save().then((insertedCalendar) => {
                        let calendarId = insertedCalendar._id;
                        return this.find(calendarId, eventId.toHexString());
                    });
                }

                let conditions = {};
                if (calendarIds instanceof Array) {
                    conditions._id = {
                        $in: calendarIds.map((calendarId) => this.Types.ObjectId(calendarId))
                    };
                } else {
                    conditions._id = this.Types.ObjectId(calendarIds);
                }

                let doc = {
                    $push: {
                        events: postEvent
                    }
                };

                return this.CalendarsModel.update(conditions, doc).then((result) => {
                    if (!result.ok) {
                        return Promise.reject(new Error());
                    }
                    return this.find(calendarIds, eventId.toHexString());
                });
            }).then((calendars) => {
                ('function' === typeof callback) && callback(calendars);
                return calendars;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * @param {string} calendarId
         * @param {any} putEvent
         * @param {(calendars: Chatshier.Models.Calendars | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Calendars | null>}
         */
        update(calendarId, eventId, putEvent, callback) {
            putEvent = putEvent || {};
            putEvent.updatedTime = Date.now();

            let conditions = {
                '_id': this.Types.ObjectId(calendarId),
                'events._id': this.Types.ObjectId(eventId)
            };

            let doc = {
                $set: {
                    'events.$._id': eventId
                }
            };

            for (let prop in putEvent) {
                if (null === putEvent[prop] || undefined === putEvent[prop]) {
                    continue;
                }
                doc.$set['events.$.' + prop] = putEvent[prop];
            }

            return this.CalendarsModel.update(conditions, doc).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(calendarId, eventId);
            }).then((calendar) => {
                ('function' === typeof callback) && callback(calendar);
                return calendar;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * @param {string} calendarId
         * @param {string} eventId
         * @param {(calendars: Chatshier.Models.Calendars | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Calendars | null>}
         */
        remove(calendarId, eventId, callback) {
            let conditions = {
                '_id': this.Types.ObjectId(calendarId),
                'events._id': this.Types.ObjectId(eventId)
            };

            let doc = {
                $set: {
                    'events.$.isDeleted': true,
                    'events.$.updatedTime': Date.now()
                }
            };

            return this.CalendarsModel.update(conditions, doc).then(() => {
                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$events'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            events: 1
                        }
                    }
                ];

                return this.CalendarsModel.aggregate(aggregations).then((results) => {
                    let calendarEvents = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    calendarEvents = results.reduce((output, calendar) => {
                        output[calendar._id] = output[calendar._id] || {events: {}};
                        Object.assign(output[calendar._id].events, this.toObject(calendar.events));
                        return output;
                    }, {});
                    return calendarEvents;
                });
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
