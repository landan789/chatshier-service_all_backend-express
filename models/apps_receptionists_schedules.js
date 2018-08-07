module.exports = (function() {
    const ModelCore = require('../cores/model');
    const gcalendarHlp = require('../helpers/gcalendar');
    const APPS = 'apps';

    class AppsChatroomsMessagersModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string} appId
         * @param {string} receptionistId
         * @param {string} scheduleId
         * @param {(appsReceptionistsSchedules: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        find(appId, receptionistId, scheduleId, callback) {
            // 尋找符合的欄位
            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false,
                'receptionists._id': this.Types.ObjectId(receptionistId),
                'receptionists.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$receptionists'
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選需要的項目
                        receptionists: {
                            _id: '$receptionists._id',
                            gcalendarId: '$receptionists.gcalendarId',
                            schedules: {
                                $filter: {
                                    input: '$receptionists.schedules',
                                    as: 'schedule',
                                    cond: {
                                        $and: [{
                                            $eq: [ '$$schedule.isDeleted', false ]
                                        }, {
                                            $eq: [ '$$schedule._id', this.Types.ObjectId(scheduleId) ]
                                        }]
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsReceptionistsSchedules = {};
                if (0 === results.length) {
                    return appsReceptionistsSchedules;
                }

                appsReceptionistsSchedules = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = { receptionists: {} };
                    }
                    if (!output[app._id].receptionists[app.receptionists._id]) {
                        output[app._id].receptionists[app.receptionists._id] = { schedules: {} };
                    }

                    Object.assign(output[app._id].receptionists, this.toObject(app.receptionists));
                    let receptionists = output[app._id].receptionists;
                    receptionists[app.receptionists._id].schedules = this.toObject(app.receptionists.schedules);
                    return output;
                }, {});
                return appsReceptionistsSchedules;
            }).then((appsReceptionistsSchedules) => {
                ('function' === typeof callback) && callback(appsReceptionistsSchedules);
                return appsReceptionistsSchedules;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} receptionistId
         * @param {any} schedule
         * @param {(appsReceptionistsSchedules: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        insert(appId, receptionistId, schedule, callback) {
            let scheduleId = this.Types.ObjectId();
            schedule = schedule || {};
            schedule._id = scheduleId;
            schedule.createdTime = schedule.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'receptionists._id': this.Types.ObjectId(receptionistId)
            };

            let doc = {
                $push: {
                    'receptionists.$[receptionist].schedules': schedule
                }
            };

            let options = {
                arrayFilters: [{
                    'receptionist._id': this.Types.ObjectId(receptionistId)
                }]
            };

            let _scheduleId = scheduleId.toHexString();
            return this.AppsModel.update(query, doc, options).then(() => {
                return this.find(appId, receptionistId, _scheduleId);
            }).then((appsReceptionistsSchedules) => {
                if (!(appsReceptionistsSchedules && appsReceptionistsSchedules[appId])) {
                    return Promise.reject(new Error('NULL'));
                }

                let receptionist = appsReceptionistsSchedules[appId].receptionists[receptionistId];
                let gcalendarId = receptionist.gcalendarId;
                let _schedule = receptionist.schedules[_scheduleId];
                return gcalendarHlp.insertEvent(gcalendarId, {
                    summary: _schedule.summary,
                    description: _schedule.description,
                    startDateTime: new Date(_schedule.start.dateTime),
                    endDateTime: new Date(_schedule.end.dateTime),
                    recurrence: _schedule.recurrence
                }).then((gcEvent) => {
                    return this.update(appId, receptionistId, _scheduleId, { eventId: gcEvent.id });
                });
            }).then((appsReceptionistsSchedules) => {
                ('function' === typeof callback) && callback(appsReceptionistsSchedules);
                return appsReceptionistsSchedules;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} receptionistId
         * @param {string} scheduleId
         * @param {any} schedule
         * @param {(appsReceptionistsSchedules: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        update(appId, receptionistId, scheduleId, schedule, callback) {
            schedule = schedule || {};
            schedule.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'receptionists._id': this.Types.ObjectId(receptionistId)
            };

            let doc = { $set: {} };
            for (let prop in schedule) {
                doc.$set['receptionists.$[receptionist].schedules.$[schedule].' + prop] = schedule[prop];
            }

            let options = {
                arrayFilters: [{
                    'receptionist._id': this.Types.ObjectId(receptionistId)
                }, {
                    'schedule._id': this.Types.ObjectId(scheduleId)
                }]
            };

            return this.AppsModel.update(query, doc, options).then(() => {
                return this.find(appId, receptionistId, scheduleId);
            }).then((appsReceptionistsSchedules) => {
                if (!(appsReceptionistsSchedules && appsReceptionistsSchedules[appId])) {
                    return Promise.reject(new Error('NULL'));
                }

                let receptionist = appsReceptionistsSchedules[appId].receptionists[receptionistId];
                let gcalendarId = receptionist.gcalendarId;
                let _schedule = receptionist.schedules[scheduleId];
                let eventId = _schedule.eventId;
                return gcalendarHlp.updateEvent(gcalendarId, eventId, {
                    summary: _schedule.summary,
                    description: _schedule.description,
                    startDateTime: new Date(_schedule.start.dateTime),
                    endDateTime: new Date(_schedule.end.dateTime),
                    recurrence: _schedule.recurrence
                }).then(() => {
                    return appsReceptionistsSchedules;
                });
            }).then((appsReceptionistsSchedules) => {
                ('function' === typeof callback) && callback(appsReceptionistsSchedules);
                return appsReceptionistsSchedules;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} receptionistId
         * @param {string} scheduleId
         * @param {(appsReceptionistsSchedules: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        remove(appId, receptionistId, scheduleId, callback) {
            let schedule = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId),
                'receptionists._id': this.Types.ObjectId(receptionistId),
                'receptionists.schedules._id': this.Types.ObjectId(scheduleId)
            };

            let options = {
                arrayFilters: [{
                    'receptionist._id': query['receptionists._id']
                }, {
                    'schedule._id': query['receptionists.schedules._id']
                }]
            };

            let updateOper = { $set: {} };
            for (let prop in schedule) {
                updateOper.$set['receptionists.$[receptionist].schedules.$[schedule].' + prop] = schedule[prop];
            }

            return this.AppsModel.update(query, updateOper, options).then((result) => {
                if (!result.ok) {
                    return Promise.reject(result);
                }

                let aggregations = [
                    {
                        $unwind: '$receptionists'
                    }, {
                        $match: query
                    }, {
                        $project: {
                            // 篩選需要的項目
                            receptionists: {
                                _id: '$receptionists._id',
                                gcalendarId: '$receptionists.gcalendarId',
                                schedules: {
                                    $filter: {
                                        input: '$receptionists.schedules',
                                        as: 'schedule',
                                        cond: {
                                            $and: [{
                                                $eq: [ '$$schedule._id', query['receptionists.schedules._id'] ]
                                            }, {
                                                $eq: [ '$$schedule.isDeleted', true ]
                                            }]
                                        }
                                    }
                                }
                            }
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsReceptionistsSchedules = {};
                    if (0 === results.length) {
                        return appsReceptionistsSchedules;
                    }

                    appsReceptionistsSchedules = results.reduce((output, app) => {
                        if (!output[app._id]) {
                            output[app._id] = { receptionists: {} };
                        }

                        if (!output[app._id].receptionists[app.receptionists._id]) {
                            output[app._id].receptionists[app.receptionists._id] = { schedules: {} };
                        }

                        Object.assign(output[app._id].receptionists, this.toObject(app.receptionists));
                        let receptionists = output[app._id].receptionists;
                        receptionists[app.receptionists._id].schedules = this.toObject(app.receptionists.schedules);
                        return output;
                    }, {});
                    return appsReceptionistsSchedules;
                }).then((appsReceptionistsSchedules) => {
                    if (!(appsReceptionistsSchedules && appsReceptionistsSchedules[appId])) {
                        return Promise.reject(new Error('NULL'));
                    }

                    let receptionist = appsReceptionistsSchedules[appId].receptionists[receptionistId];
                    let schedule = receptionist.schedules[scheduleId];
                    let eventId = schedule.eventId;
                    if (!eventId) {
                        return appsReceptionistsSchedules;
                    }

                    let gcalendarId = receptionist.gcalendarId;
                    return gcalendarHlp.deleteEvent(gcalendarId, eventId).then(() => {
                        return appsReceptionistsSchedules;
                    });
                });
            }).then((appsReceptionistsSchedules) => {
                ('function' === typeof callback) && callback(appsReceptionistsSchedules);
                return appsReceptionistsSchedules;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsChatroomsMessagersModel();
})();
