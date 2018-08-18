module.exports = (function() {
    const ModelCore = require('../cores/model');
    const USERS = 'users';

    class UsersOneSignalsModel extends ModelCore {
        constructor() {
            super();
            this.UsersModel = this.model(USERS, this.UsersSchema);
        }

        /**
         * @typedef OneSignalQuery
         * @property {string | string[]} userIds
         * @property {string | string[]} [oneSignalIds]
         * @property {boolean | null} [isDeleted]
         * @property {string} [oneSignalUserId]
         * @param {OneSignalQuery} query
         * @param {(appComposes: Chatshier.Models.UsersOneSignals | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.UsersOneSignals | null>}
         */
        find({ userIds, oneSignalIds, isDeleted, oneSignalUserId }, callback) {
            if (!(userIds instanceof Array)) {
                userIds = [userIds];
            }

            if (oneSignalIds && !(oneSignalIds instanceof Array)) {
                oneSignalIds = [oneSignalIds];
            }

            // 尋找符合的欄位
            let match = {
                '_id': {
                    $in: userIds.map((userId) => this.Types.ObjectId(userId))
                },
                'isDeleted': false
            };
            (null !== isDeleted) && (match['oneSignals.isDeleted'] = !!isDeleted);
            ('string' === typeof oneSignalUserId) && (match['oneSignals.oneSignalUserId'] = oneSignalUserId);

            if (oneSignalIds instanceof Array) {
                match['oneSignals._id'] = {
                    $in: oneSignalIds.map((oneSignalId) => this.Types.ObjectId(oneSignalId))
                };
            }

            let aggregations = [{
                $unwind: '$oneSignals'
            }, {
                $match: match
            }, {
                $project: {
                    _id: true,
                    oneSignals: true
                }
            }];

            return this.UsersModel.aggregate(aggregations).then((results) => {
                let usersOneSignals = {};
                if (0 === results.length) {
                    return usersOneSignals;
                }

                usersOneSignals = results.reduce((output, user) => {
                    output[user._id] = output[user._id] || { oneSignals: {} };
                    Object.assign(output[user._id].oneSignals, this.toObject(user.oneSignals));
                    return output;
                }, {});
                return usersOneSignals;
            }).then((usersOneSignals) => {
                ('function' === typeof callback) && callback(usersOneSignals);
                return usersOneSignals;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} userId
         * @param {any} oneSignal
         * @param {(appComposes: Chatshier.Models.UsersOneSignals | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.UsersOneSignals | null>}
         */
        insert(userId, oneSignal, callback) {
            let oneSignalId = this.Types.ObjectId();
            oneSignal._id = oneSignalId;
            oneSignal.createdTime = oneSignal.updatedTime = Date.now();

            let conditions = {
                '_id': userId
            };

            let doc = {
                $push: {
                    oneSignals: oneSignal
                }
            };

            return this.UsersModel.update(conditions, doc).then(() => {
                let query = {
                    userIds: userId,
                    oneSignalIds: oneSignalId.toHexString()
                };
                return this.find(query);
            }).then((usersOneSignals) => {
                ('function' === typeof callback) && callback(usersOneSignals);
                return usersOneSignals;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} userId
         * @param {string} oneSignalId
         * @param {any} putOneSignal
         * @param {(appComposes: Chatshier.Models.UsersOneSignals | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.UsersOneSignals | null>}
         */
        update(userId, oneSignalId, putOneSignal, callback) {
            putOneSignal = putOneSignal || {};
            putOneSignal.updatedTime = Date.now();

            let conditions = {
                '_id': this.Types.ObjectId(userId),
                'oneSignals._id': this.Types.ObjectId(oneSignalId)
            };

            let doc = { $set: {} };
            for (let prop in putOneSignal) {
                doc.$set['oneSignals.$.' + prop] = putOneSignal[prop];
            }

            return this.UsersModel.update(conditions, doc).then(() => {
                let query = {
                    userIds: userId,
                    oneSignalIds: oneSignalId
                };
                return this.find(query);
            }).then((usersOneSignals) => {
                ('function' === typeof callback) && callback(usersOneSignals);
                return usersOneSignals;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} userId
         * @param {string} oneSignalId
         * @param {(appComposes: Chatshier.Models.UsersOneSignals | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.UsersOneSignals | null>}
         */
        remove(userId, oneSignalId, callback) {
            let oneSignal = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let conditions = {
                '_id': this.Types.ObjectId(userId),
                'oneSignals._id': this.Types.ObjectId(oneSignalId)
            };

            let doc = { $set: {} };
            for (let prop in oneSignal) {
                doc.$set['oneSignals.$.' + prop] = oneSignal[prop];
            }

            return this.UsersModel.update(conditions, doc).then(() => {
                let match = Object.assign({}, conditions);
                let aggregations = [ {
                    $unwind: '$oneSignals'
                }, {
                    $match: match
                }, {
                    $project: {
                        _id: true,
                        oneSignals: true
                    }
                }];

                return this.UsersModel.aggregate(aggregations).then((results) => {
                    let usersOneSignals = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    usersOneSignals = results.reduce((output, user) => {
                        output[user._id] = output[user._id] || { oneSignals: {} };
                        Object.assign(output[user._id].oneSignals, this.toObject(user.oneSignals));
                        return output;
                    }, {});
                    return usersOneSignals;
                });
            }).then((usersOneSignals) => {
                ('function' === typeof callback) && callback(usersOneSignals);
                return usersOneSignals;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new UsersOneSignalsModel();
})();
