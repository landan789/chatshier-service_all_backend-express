module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CHATSHIER_CFG = require('../config/chatshier');
    const gcalendarHlp = require('../helpers/gcalendar');
    const APPS = 'apps';

    class AppsReceptionistsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @typedef ReceptionistQuery
         * @property {string | string[]} appIds
         * @property {string | string[]} [receptionistIds]
         * @property {boolean | null} [isDeleted]
         * @param {ReceptionistQuery} query
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        find({ appIds, receptionistIds, isDeleted }, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false
            };
            (null !== isDeleted) && (match['receptionists.isDeleted'] = !!isDeleted);

            if (receptionistIds && !(receptionistIds instanceof Array)) {
                receptionistIds = [receptionistIds];
            }

            if (receptionistIds instanceof Array) {
                match['receptionists._id'] = {
                    $in: receptionistIds.map((receptionistId) => this.Types.ObjectId(receptionistId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$receptionists'
                }, {
                    $match: match
                }, {
                    $project: {
                        receptionists: {
                            _id: '$receptionists._id',
                            gcalendarId: '$receptionists.gcalendarId',
                            isCalendarShared: '$receptionists.isCalendarShared',
                            name: '$receptionists.name',
                            photo: '$receptionists.photo',
                            email: '$receptionists.email',
                            phone: '$receptionists.phone',
                            timezoneOffset: '$receptionists.timezoneOffset',
                            maxNumberPerDay: '$receptionists.maxNumberPerDay',
                            interval: '$receptionists.interval',
                            timesOfAppointment: '$receptionists.timesOfAppointment',
                            schedules: {
                                $filter: {
                                    input: '$receptionists.schedules',
                                    as: 'schedule',
                                    cond: {
                                        $eq: [ '$$schedule.isDeleted', false ]
                                    }
                                }
                            }
                        }
                    }
                }, {
                    $sort: {
                        'receptionists.createdTime': -1 // 最晚建立的在最前頭
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsReceptionists = {};
                if (0 === results.length) {
                    return appsReceptionists;
                }

                appsReceptionists = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { receptionists: {} };
                    if (!output[app._id].receptionists[app.receptionists._id]) {
                        output[app._id].receptionists[app.receptionists._id] = { schedules: {} };
                    }

                    Object.assign(output[app._id].receptionists, this.toObject(app.receptionists));
                    let receptionists = output[app._id].receptionists;
                    receptionists[app.receptionists._id].schedules = this.toObject(app.receptionists.schedules);
                    return output;
                }, {});
                return appsReceptionists;
            }).then((appsReceptionists) => {
                ('function' === typeof callback) && callback(appsReceptionists);
                return appsReceptionists;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} [receptionist]
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        insert(appId, receptionist, callback) {
            let receptionistId = this.Types.ObjectId();
            let _receptionist = receptionist || {};
            _receptionist._id = receptionistId;
            _receptionist.createdTime = _receptionist.updatedTime = Date.now();

            if (!_receptionist.name) {
                ('function' === typeof callback) && callback(null);
                return Promise.resolve(null);
            }

            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false
            };

            return this.AppsModel.findOne(conditions).then((result) => {
                /** @type {Chatshier.Models.App} */
                let app = result;
                let summary = '[' + _receptionist.name + '][' + app.name + '] - ' + receptionistId.toHexString();
                let description = 'Created by ' + CHATSHIER_CFG.GMAIL.USER;
                return gcalendarHlp.insertCalendar(summary, description).then((gcalendar) => {
                    _receptionist.gcalendarId = gcalendar.id;
                });
            }).then(() => {
                let doc = {
                    $push: {
                        receptionists: _receptionist
                    }
                };
                return this.AppsModel.update(conditions, doc);
            }).then(() => {
                let query = {
                    appIds: appId,
                    receptionistIds: receptionistId.toHexString()
                };
                return this.find(query);
            }).then((appsReceptionists) => {
                ('function' === typeof callback) && callback(appsReceptionists);
                return appsReceptionists;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} receptionistId
         * @param {any} receptionist
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        update(appId, receptionistId, receptionist, callback) {
            receptionist = receptionist || {};
            receptionist.updatedTime = Date.now();

            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'receptionists._id': this.Types.ObjectId(receptionistId)
            };

            let doc = { $set: {} };
            for (let prop in receptionist) {
                doc.$set['receptionists.$.' + prop] = receptionist[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                let query = {
                    appIds: appId,
                    receptionistIds: receptionistId
                };
                return this.find(query);
            }).then((appsReceptionists) => {
                ('function' === typeof callback) && callback(appsReceptionists);
                return appsReceptionists;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} receptionistId
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        remove(appId, receptionistId, callback) {
            let receptionist = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'receptionists._id': this.Types.ObjectId(receptionistId)
            };

            let doc = { $set: {} };
            for (let prop in receptionist) {
                doc.$set['receptionists.$.' + prop] = receptionist[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$receptionists'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            receptionists: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsReceptionists = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsReceptionists = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { receptionists: {} };
                        Object.assign(output[app._id].receptionists, this.toObject(app.receptionists));
                        return output;
                    }, {});
                    return appsReceptionists;
                });
            }).then((appsReceptionists) => {
                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                if (!receptionist.gcalendarId) {
                    return appsReceptionists;
                }

                return gcalendarHlp.deleteCalendar(receptionist.gcalendarId).then(() => {
                    return appsReceptionists;
                });
            }).then((appsReceptionists) => {
                ('function' === typeof callback) && callback(appsReceptionists);
                return appsReceptionists;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsReceptionistsModel();
})();
