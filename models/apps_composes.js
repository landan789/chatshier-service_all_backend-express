module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$composes' // 只針對 document 處理
    };

    const docOutput = {
        $project: {
            // 篩選需要的項目
            composes: 1
        }
    };

    class AppsComposesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string|string[]} appIds
         * @param {any|null} composeId
         * @param {(appComposes: any) => any} [callback]
         */
        find(appIds, composeId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false
            };
            if (composeId) {
                query['composes._id'] = this.Types.ObjectId(composeId);
                query['composes.isDeleted'] = false;
            }

            let aggregations = [
                docUnwind,
                {
                    $match: query
                },
                docOutput
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsComposes = {};
                if (0 === results.length) {
                    return appsComposes;
                }

                appsComposes = results.reduce((output, curr) => {
                    output[curr._id] = output[curr._id] || { composes: {} };
                    Object.assign(output[curr._id].composes, this.toObject(curr.composes));
                    return output;
                }, {});
                return appsComposes;
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        }

        /**
         * @param {string} appId
         * @param {any} compose
         * @param {(appTickets: any) => any} [callback]
         */
        insert(appId, compose, callback) {
            let composeId = this.Types.ObjectId();
            compose._id = composeId;
            compose.createdTime = compose.updatedTime = Date.now();

            let query = {
                '_id': appId
            };

            let updateOper = {
                $push: {
                    composes: compose
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, composeId);
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        }

        /**
         * @param {string} appId
         * @param {string} composeId
         * @param {any} compose
         * @param {(appComposes: any) => any} [callback]
         */
        update(appId, composeId, compose, callback) {
            compose._id = composeId;
            compose.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'composes._id': composeId
            };

            let updateOper = { $set: {} };
            for (let prop in compose) {
                updateOper.$set['composes.$.' + prop] = compose[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, composeId);
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        }

        /**
         * @param {string} appId
         * @param {string} composeId
         * @param {(appComposes: any) => any} [callback]
         */
        remove(appId, composeId, callback) {
            let compose = {
                _id: composeId,
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': appId,
                'composes._id': composeId
            };

            let updateOper = { $set: {} };
            for (let prop in compose) {
                updateOper.$set['composes.$.' + prop] = compose[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [
                    {
                        $unwind: '$composes'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(appId),
                            'composes._id': this.Types.ObjectId(composeId)
                        }
                    }, {
                        $project: {
                            composes: 1
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations);
            }).then((results) => {
                let appsComposes = {};
                if (0 === results.length) {
                    return appsComposes;
                }

                appsComposes = results.reduce((output, curr) => {
                    output[curr._id] = output[curr._id] || { composes: {} };
                    Object.assign(output[curr._id].composes, this.toObject(curr.composes));
                    return output;
                }, {});
                return appsComposes;
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        }
    }

    return new AppsComposesModel();
})();
