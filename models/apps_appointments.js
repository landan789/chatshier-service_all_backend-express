module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsAppointmentsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @typedef AppointmentQuery
         * @property {string | string[]} appIds
         * @property {string | string[]} [appointmentIds]
         * @property {boolean | null} [isDeleted]
         * @property {string} [eventId]
         * @property {string} [platformUid]
         * @property {Date | number} [endedTime]
         * @param {AppointmentQuery} query
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        find({ appIds, appointmentIds, isDeleted, eventId, platformUid, endedTime }, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false
            };
            (null !== isDeleted) && (match['appointments.isDeleted'] = !!isDeleted);
            eventId && (match['appointments.eventId'] = eventId);
            platformUid && (match['appointments.platformUid'] = platformUid);
            endedTime && (match['appointments.endedTime'] = { $gte: new Date(endedTime) });

            if (appointmentIds) {
                !(appointmentIds instanceof Array) && (appointmentIds = [appointmentIds]);
                match['appointments._id'] = {
                    $in: appointmentIds.map((appointmentId) => this.Types.ObjectId(appointmentId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$appointments'
                }, {
                    $match: match
                }, {
                    $project: {
                        appointments: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsAppointments = {};
                if (0 === results.length) {
                    return appsAppointments;
                }

                appsAppointments = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { appointments: {} };
                    Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                    return output;
                }, {});
                return appsAppointments;
            }).then((appsAppointments) => {
                ('function' === typeof callback) && callback(appsAppointments);
                return appsAppointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} [postAppointment]
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        insert(appId, postAppointment, callback) {
            postAppointment = postAppointment || {};

            let appointmentId = postAppointment._id ? this.Types.ObjectId(postAppointment._id) : this.Types.ObjectId();
            postAppointment._id = appointmentId;
            postAppointment.createdTime = postAppointment.updatedTime = Date.now();

            // 新增一筆預約項目時，服務人員與產品為必填
            if (!(postAppointment.receptionist_id && postAppointment.product_id)) {
                ('function' === typeof callback) && callback(null);
                return Promise.resolve(null);
            }

            return this.AppsModel.findById(appId).then((app) => {
                app.appointments.push(postAppointment);
                return app.save();
            }).then(() => {
                let receptionistId = postAppointment.receptionist_id;
                let aggregations = [
                    {
                        $unwind: '$receptionists'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(appId),
                            'isDeleted': false,
                            'receptionists.isDeleted': false,
                            'receptionists._id': this.Types.ObjectId(receptionistId)
                        }
                    }, {
                        $project: {
                            receptionists: true
                        }
                    }
                ];
                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return;
                    }

                    let conditions = {
                        '_id': this.Types.ObjectId(appId),
                        'receptionists._id': this.Types.ObjectId(receptionistId)
                    };

                    let receptionists = this.toObject(results.shift().receptionists);
                    /** @type {Chatshier.Models.Receptionist} */
                    let receptionist = receptionists[receptionistId];
                    let doc = {
                        $set: {
                            'receptionists.$.updatedTime': Date.now(),
                            'receptionists.$.timesOfAppointment': receptionist.timesOfAppointment + 1
                        }
                    };
                    return this.AppsModel.update(conditions, doc);
                });
            }).then(() => {
                return this.find({ appIds: appId, appointmentIds: appointmentId.toHexString() });
            }).then((appsAppointments) => {
                ('function' === typeof callback) && callback(appsAppointments);
                return appsAppointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} appointmentId
         * @param {any} putAppointment
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        update(appId, appointmentId, putAppointment, callback) {
            putAppointment.updatedTime = Date.now();

            let conditions = {
                '_id': appId,
                'appointments._id': appointmentId
            };

            let doc = { $set: {} };
            for (let prop in putAppointment) {
                doc.$set['appointments.$.' + prop] = putAppointment[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                return this.find({ appIds: appId, appointmentIds: appointmentId });
            }).then((appsAppointments) => {
                ('function' === typeof callback) && callback(appsAppointments);
                return appsAppointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} appointmentId
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        remove(appId, appointmentId, callback) {
            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'appointments._id': this.Types.ObjectId(appointmentId)
            };

            let operate = {
                $set: {
                    'appointments.$.isDeleted': true,
                    'appointments.$.updatedTime': Date.now()
                }
            };

            return this.AppsModel.update(conditions, operate).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let aggregations = [
                    {
                        $unwind: '$appointments'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(appId),
                            'appointments._id': this.Types.ObjectId(appointmentId)
                        }
                    }, {
                        $project: {
                            appointments: 1
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }
                    let appsAppointments = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { appointments: {} };
                        Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                        return output;
                    }, {});
                    return appsAppointments;
                });
            }).then((appsAppointments) => {
                ('function' === typeof callback) && callback(appsAppointments);
                return appsAppointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new AppsAppointmentsModel();
})();
