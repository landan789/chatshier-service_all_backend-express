module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsAppointmentsMembersModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }
        /**
         * 輸入全部的 appId, appointmentId 取得該 Appointment 所有預約資料
         *
         * @param {string|string[]} appIds
         * @param {string|string[]} appointmentIds
         * @param {string|string[]} memberIds
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        find(appIds, appointmentIds, memberIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            if (!(appointmentIds instanceof Array)) {
                appointmentIds = [appointmentIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'appointments._id': {
                    $in: appointmentIds.map((appointmentId) => this.Types.ObjectId(appointmentId))
                },
                'appointments.isDeleted': false
            };

            if (memberIds) {
                if (!(memberIds instanceof Array)) {
                    memberIds = [memberIds];
                }

                query['appointments.members._id'] = {
                    $in: memberIds.map((memberId) => this.Types.ObjectId(memberId))
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
                        appointments: {
                            _id: '$appointments._id',
                            isDeleted: '$appointments.isDeleted',
                            members: 1
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsAppointmentsMembers = {};
                if (0 === results.length) {
                    return appsAppointmentsMembers;
                }

                appsAppointmentsMembers = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { appointments: {} };
                    Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                    return output;
                }, {});
                return appsAppointmentsMembers;
            }).then((appsAppointmentsMembers) => {
                ('function' === typeof callback) && callback(appsAppointmentsMembers);
                return appsAppointmentsMembers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 找到 成員未刪除的資料包，不含 apps 結構
         *
         * @param {string|string[]} appIds
         * @param {(appsAppointments: Chatshier.Models.Appointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.Appointments | null>}
         */
        findMembers(appIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'appointments.members.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$appointments' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    $project: {
                        // 篩選項目
                        appointments: {
                            members: 1
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let members = {};
                if (0 === results.length) {
                    return members;
                }

                members = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { appointments: {} };
                    Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                    return output;
                }, {});
                return members;
            }).then((members) => {
                ('function' === typeof callback) && callback(members);
                return members;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 新增一筆成員的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {any} postMember
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        insert(appId, appointmentId, postMember, callback) {
            let memberId = this.Types.ObjectId();
            postMember._id = memberId;
            postMember.createdTime = postMember.updatedTime = Date.now();

            return this.AppsModel.findById(appId).then((app) => {
                app.appointments[appointmentId].members.push(postMember);
                return app.save();
            }).then(() => {
                return this.find(appId, appointmentId, memberId);
            }).then((appsAppointmentsMembers) => {
                ('function' === typeof callback) && callback(appsAppointmentsMembers);
                return appsAppointmentsMembers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 修改一筆成員的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {string} memberId
         * @param {any} putMember
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        update(appId, appointmentId, memberId, putMember, callback) {
            putMember.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'appointments._id': appointmentId,
                'appointments.members._id': memberId
            };

            let updateOper = { $set: {} };
            for (let prop in putMember) {
                updateOper.$set['appointments.$.members.' + prop] = putMember[prop];
            }

            return this.AppsModel.findOneAndUpdate(query, updateOper).then(() => {
                return this.find(appId, appointmentId, memberId);
            }).then((appsAppointmentsMembers) => {
                ('function' === typeof callback) && callback(appsAppointmentsMembers);
                return appsAppointmentsMembers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 刪除一筆成員的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {string} memberId
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        remove(appId, appointmentId, memberId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId),
                'appointments._id': this.Types.ObjectId(appointmentId),
                'appointments.members._id': this.Types.ObjectId(memberId)
            };

            let operate = {
                $set: {
                    'appointments.$.members.isDeleted': true,
                    'appointments.$.members.updatedTime': Date.now()
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
                            'appointments._id': this.Types.ObjectId(appointmentId),
                            'appointments.members._id': this.Types.ObjectId(memberId)
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
                    let appsAppointmentsMembers = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { appointments: {} };
                        Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                        return output;
                    }, {});
                    return appsAppointmentsMembers;
                });
            }).then((appsAppointmentsMembers) => {
                ('function' === typeof callback) && callback(appsAppointmentsMembers);
                return appsAppointmentsMembers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new AppsAppointmentsMembersModel();
})();
