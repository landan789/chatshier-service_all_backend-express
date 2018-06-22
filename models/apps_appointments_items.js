module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsAppointmentsItemsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }
        /**
         * 輸入全部的 appId, appointmentId 取得該 Appointment 所有預約資料
         *
         * @param {string|string[]} appIds
         * @param {string|string[]} appointmentIds
         * @param {string|string[]} itemIds
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        find(appIds, appointmentIds, itemIds, callback) {
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

            if (itemIds) {
                if (!(itemIds instanceof Array)) {
                    itemIds = [itemIds];
                }

                query['appointments.items._id'] = {
                    $in: itemIds.map((itemId) => this.Types.ObjectId(itemId))
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
                            items: 1
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsAppointmentsItems = {};
                if (0 === results.length) {
                    return appsAppointmentsItems;
                }

                appsAppointmentsItems = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { appointments: {} };
                    Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                    return output;
                }, {});
                return appsAppointmentsItems;
            }).then((appsAppointmentsItems) => {
                ('function' === typeof callback) && callback(appsAppointmentsItems);
                return appsAppointmentsItems;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 找到 預約產品未刪除的資料包，不含 apps 結構
         *
         * @param {string|string[]} appIds
         * @param {(appsAppointments: Chatshier.Models.Appointments | null) => any} [callback]
         * @return {Promise<Chatshier.Models.Appointments | null>}
         */
        findItems(appIds, callback) {
            if ('string' === typeof appIds) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'appointments.items.isDeleted': false
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
                            items: 1
                        }
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let items = {};
                if (0 === results.length) {
                    return items;
                }

                items = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { appointments: {} };
                    Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                    return output;
                }, {});
                return items;
            }).then((items) => {
                ('function' === typeof callback) && callback(items);
                return items;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 新增一筆預約產品的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {any} postItem
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        insert(appId, appointmentId, postItem, callback) {
            let itemId = this.Types.ObjectId();
            postItem._id = itemId;
            postItem.createdTime = postItem.updatedTime = Date.now();

            return this.AppsModel.findById(appId).then((app) => {
                app.appointments[appointmentId].items.push(postItem);
                return app.save();
            }).then(() => {
                return this.find(appId, appointmentId, itemId);
            }).then((appsAppointmentsItems) => {
                ('function' === typeof callback) && callback(appsAppointmentsItems);
                return appsAppointmentsItems;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 修改一筆預約產品的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {string} itemId
         * @param {any} putItem
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        update(appId, appointmentId, itemId, putItem, callback) {
            putItem.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'appointments._id': appointmentId,
                'appointments.items._id': itemId
            };

            let updateOper = { $set: {} };
            for (let prop in putItem) {
                updateOper.$set['appointments.$.items.' + prop] = putItem[prop];
            }

            return this.AppsModel.findOneAndUpdate(query, updateOper).then(() => {
                return this.find(appId, appointmentId, itemId);
            }).then((appsAppointmentsItems) => {
                ('function' === typeof callback) && callback(appsAppointmentsItems);
                return appsAppointmentsItems;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
        /**
         * 輸入指定的 appId 刪除一筆預約產品的資料
         *
         * @param {string} appId
         * @param {string} appointmentId
         * @param {string} itemId
         * @param {(appsAppointments: Chatshier.Models.AppsAppointments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsAppointments | null>}
         */
        remove(appId, appointmentId, itemId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId),
                'appointments._id': this.Types.ObjectId(appointmentId),
                'appointments.items._id': this.Types.ObjectId(itemId)
            };

            let operate = {
                $set: {
                    'appointments.$.items.isDeleted': true,
                    'appointments.$.items.updatedTime': Date.now()
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
                            'appointments.items._id': this.Types.ObjectId(itemId)
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
                    let appsAppointmentsItems = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { appointments: {} };
                        Object.assign(output[app._id].appointments, this.toObject(app.appointments));
                        return output;
                    }, {});
                    return appsAppointmentsItems;
                });
            }).then((appsAppointmentsItems) => {
                ('function' === typeof callback) && callback(appsAppointmentsItems);
                return appsAppointmentsItems;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new AppsAppointmentsItemsModel();
})();
