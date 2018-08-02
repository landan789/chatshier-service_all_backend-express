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
         * @param {string | string[]} appIds
         * @param {string | string[]} [receptionistIds]
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        find(appIds, receptionistIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'receptionists.isDeleted': false
            };

            if (receptionistIds && !(receptionistIds instanceof Array)) {
                receptionistIds = [receptionistIds];
            }

            if (receptionistIds instanceof Array) {
                query['receptionists._id'] = {
                    $in: receptionistIds.map((receptionistId) => this.Types.ObjectId(receptionistId))
                };
            }

            let aggregations = [
                {
                    $unwind: '$receptionists'
                }, {
                    $match: query
                }, {
                    $project: {
                        receptionists: true
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
                    Object.assign(output[app._id].receptionists, this.toObject(app.receptionists));
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

            let query = {
                '_id': this.Types.ObjectId(appId),
                'isDeleted': false
            };

            // return this.AppsModel.findOne(query).then((result) => {
            //     /** @type {Chatshier.Models.App} */
            //     let app = result;
            //     let summary = '[' + _receptionist.name + '] ' + app.name + ' - ' + receptionistId.toHexString();
            //     let description = 'Created by ' + CHATSHIER_CFG.GAPI.USER;
            //     return gcalendarHlp.insertCalendar(summary, description);
            // }).then((gcalendar) => {
            //     _receptionist.gcalendarId = gcalendar.id;

            //     let updateOper = {
            //         $push: {
            //             receptionists: _receptionist
            //         }
            //     };
            //     return this.AppsModel.update(query, updateOper);

            let updateOper = {
                $push: {
                    receptionists: _receptionist
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, receptionistId.toHexString());
            }).then((appsReceptionists) => {
                ('function' === typeof callback) && callback(appsReceptionists);
                return appsReceptionists;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} receptionistId
         * @param {any} receptionist
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        update(appIds, receptionistId, receptionist, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            receptionist = receptionist || {};
            receptionist.updatedTime = Date.now();

            let query = {
                '_id': {
                    $in: appIds
                },
                'receptionists._id': receptionistId
            };

            let updateOper = { $set: {} };
            for (let prop in receptionist) {
                updateOper.$set['receptionists.$.' + prop] = receptionist[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appIds, receptionistId);
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

            let query = {
                '_id': this.Types.ObjectId(appId),
                'receptionists._id': this.Types.ObjectId(receptionistId)
            };

            let updateOper = { $set: {} };
            for (let prop in receptionist) {
                updateOper.$set['receptionists.$.' + prop] = receptionist[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [
                    {
                        $unwind: '$receptionists'
                    }, {
                        $match: query
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
