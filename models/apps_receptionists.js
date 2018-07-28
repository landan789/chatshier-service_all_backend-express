module.exports = (function() {
    const ModelCore = require('../cores/model');
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

            let query = {
                '_id': this.Types.ObjectId(appId)
            };

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
         * @param {string | string[]} appIds
         * @param {string} receptionistId
         * @param {(appsReceptionists: Chatshier.Models.AppsReceptionists | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsReceptionists | null>}
         */
        remove(appIds, receptionistId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let receptionist = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'receptionists._id': this.Types.ObjectId(receptionistId)
            };

            let updateOper = { $set: {} };
            for (let prop in receptionist) {
                updateOper.$set['receptionists.$.' + prop] = receptionist[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
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
