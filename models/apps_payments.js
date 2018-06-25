module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsPaymentsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} [paymentId]
         * @param {(appsPayments: Chatshier.Models.AppsPayments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsPayments | null>}
         */
        find(appIds, paymentId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'payments.isDeleted': false
            };
            if (paymentId) {
                query['payments._id'] = this.Types.ObjectId(paymentId);
            }

            let aggregations = [
                {
                    $unwind: '$payments'
                }, {
                    $match: query
                }, {
                    $project: {
                        payments: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsPayments = {};
                if (0 === results.length) {
                    return appsPayments;
                }

                appsPayments = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { payments: {} };
                    Object.assign(output[app._id].payments, this.toObject(app.payments));
                    return output;
                }, {});
                return appsPayments;
            }).then((appsPayments) => {
                ('function' === typeof callback) && callback(appsPayments);
                return appsPayments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} merchantId
         * @param {(appsPayments: Chatshier.Models.AppsPayments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsPayments | null>}
         */
        findByMerchantId(merchantId, callback) {
            let query = {
                'isDeleted': false,
                'payments.merchantId': merchantId,
                'payments.isDeleted': false
            };

            let aggregations = [
                {
                    $unwind: '$payments'
                }, {
                    $match: query
                }, {
                    $project: {
                        payments: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsPayments = {};
                if (0 === results.length) {
                    return appsPayments;
                }

                appsPayments = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { payments: {} };
                    Object.assign(output[app._id].payments, this.toObject(app.payments));
                    return output;
                }, {});
                return appsPayments;
            }).then((appsPayments) => {
                ('function' === typeof callback) && callback(appsPayments);
                return appsPayments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} payment
         * @param {(appsPayments: Chatshier.Models.AppsPayments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsPayments | null>}
         */
        insert(appId, payment, callback) {
            payment = payment || {};

            let paymentId = this.Types.ObjectId();
            payment._id = paymentId;
            payment.createdTime = payment.updatedTime = Date.now();

            let query = {
                '_id': appId
            };

            let updateOper = {
                $push: {
                    payments: payment
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, paymentId.toHexString());
            }).then((appsPayments) => {
                ('function' === typeof callback) && callback(appsPayments);
                return appsPayments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} paymentId
         * @param {any} payment
         * @param {(appsPayments: Chatshier.Models.AppsPayments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsPayments | null>}
         */
        update(appId, paymentId, payment, callback) {
            payment = payment || {};
            payment.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'payments._id': paymentId
            };

            let updateOper = { $set: {} };
            for (let prop in payment) {
                updateOper.$set['payments.$.' + prop] = payment[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, paymentId);
            }).then((appsPayments) => {
                ('function' === typeof callback) && callback(appsPayments);
                return appsPayments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} paymentId
         * @param {(appsPayments: Chatshier.Models.AppsPayments | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsPayments | null>}
         */
        remove(appIds, paymentId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let payment = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'payments._id': this.Types.ObjectId(paymentId)
            };

            let updateOper = { $set: {} };
            for (let prop in payment) {
                updateOper.$set['payments.$.' + prop] = payment[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [
                    {
                        $unwind: '$payments'
                    }, {
                        $match: query
                    }, {
                        $project: {
                            payments: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsPayments = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsPayments = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { payments: {} };
                        Object.assign(output[app._id].payments, this.toObject(app.payments));
                        return output;
                    }, {});
                    return appsPayments;
                });
            }).then((appsPayments) => {
                ('function' === typeof callback) && callback(appsPayments);
                return appsPayments;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsPaymentsModel();
})();
