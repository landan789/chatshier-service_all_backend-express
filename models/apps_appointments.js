module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsAppointmentsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }
        /**
         * 輸入全部的 appId 取得該 App 所有預約資料
         *
         * @param {string|string[]} appIds
         * @param {string|string[]} [appointmentIds]
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        find(appIds, appointmentIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'appointments.isDeleted': false
            };

            if (appointmentIds) {
                if (!(appointmentIds instanceof Array)) appointmentIds = [appointmentIds];
                query['appointments._id'] = {
                    $in: appointmentIds.map((appointmentId) => this.Types.ObjectId(appointmentId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$appointments' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        appointments: 1
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
         * 找到 預約未刪除的資料包，不含 apps 結構
         *
         * @param {string|string[]} appIds
         * @param {(appsAppointments: Chatshier.Models.Appointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.Appointments | null>}
         */
        findAppointments(appIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'appointments.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$appointments' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        appointments: 1
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appointments = {};
                if (0 === results.length) {
                    return appointments;
                }

                appointments = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.appointments));
                    return output;
                }, {});
                return appointments;
            }).then((appointments) => {
                ('function' === typeof callback) && callback(appointments);
                return appointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 新增一筆預約的資料
         *
         * @param {string} appId
         * @param {any} postAppointment
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        insert(appId, postAppointment, callback) {
            let appointmentId = this.Types.ObjectId();
            postAppointment._id = appointmentId;
            postAppointment.createdTime = postAppointment.updatedTime = Date.now();

            return this.AppsModel.findById(appId).then((app) => {
                app.appointments.push(postAppointment);
                return app.save();
            }).then(() => {
                return this.find(appId, appointmentId.toHexString());
            }).then((appsAppointments) => {
                ('function' === typeof callback) && callback(appsAppointments);
                return appsAppointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 修改一筆預約的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {any} putAppointment
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        update(appId, appointmentId, putAppointment, callback) {
            putAppointment.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'appointments._id': appointmentId
            };

            let updateOper = { $set: {} };
            for (let prop in putAppointment) {
                updateOper.$set['appointments.$.' + prop] = putAppointment[prop];
            }

            return this.AppsModel.findOneAndUpdate(query, updateOper).then(() => {
                return this.find(appId, appointmentId);
            }).then((appsAppointments) => {
                ('function' === typeof callback) && callback(appsAppointments);
                return appsAppointments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 刪除一筆預約的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        remove(appId, appointmentId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId),
                'appointments._id': this.Types.ObjectId(appointmentId)
            };

            let operate = {
                $set: {
                    'appointments.$.isDeleted': true,
                    'appointments.$.updatedTime': Date.now()
                }
            };

            return this.AppsModel.update(query, operate).then((updateResult) => {
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
