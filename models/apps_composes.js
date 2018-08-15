module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$composes' // 只針對 document 處理
    };

    const docOutput = {
        $project: {
            // 篩選需要的項目
            composes: true
        }
    };

    class AppsComposesModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} [composeId]
         * @param {(appComposes: Chatshier.Models.AppsComposes | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsComposes | null>}
         */
        find(appIds, composeId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false
            };
            if (composeId) {
                match['composes._id'] = this.Types.ObjectId(composeId);
                match['composes.isDeleted'] = false;
            }

            let aggregations = [
                docUnwind,
                {
                    $match: match
                },
                docOutput
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsComposes = {};
                if (0 === results.length) {
                    return appsComposes;
                }

                appsComposes = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { composes: {} };
                    Object.assign(output[app._id].composes, this.toObject(app.composes));
                    return output;
                }, {});
                return appsComposes;
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} compose
         * @param {(appComposes: Chatshier.Models.AppsComposes | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsComposes | null>}
         */
        insert(appId, compose, callback) {
            let composeId = this.Types.ObjectId();
            compose._id = composeId;
            compose.createdTime = compose.updatedTime = Date.now();

            let conditions = {
                '_id': appId
            };

            let doc = {
                $push: {
                    composes: compose
                }
            };

            return this.AppsModel.update(conditions, doc).then(() => {
                return this.find(appId, composeId.toHexString());
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} composeId
         * @param {any} compose
         * @param {(appComposes: Chatshier.Models.AppsComposes | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsComposes | null>}
         */
        update(appIds, composeId, compose, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            compose = compose || {};
            compose.updatedTime = Date.now();

            let conditions = {
                '_id': {
                    $in: appIds
                },
                'composes._id': composeId
            };

            let doc = { $set: {} };
            for (let prop in compose) {
                doc.$set['composes.$.' + prop] = compose[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                return this.find(appIds, composeId);
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} composeId
         * @param {(appComposes: Chatshier.Models.AppsComposes | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsComposes | null>}
         */
        remove(appIds, composeId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let compose = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let conditions = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'composes._id': this.Types.ObjectId(composeId)
            };

            let doc = { $set: {} };
            for (let prop in compose) {
                doc.$set['composes.$.' + prop] = compose[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                if (!(appIds instanceof Array)) {
                    appIds = [appIds];
                }

                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$composes'
                    }, {
                        $match: match
                    },
                    docOutput
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsComposes = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsComposes = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { composes: {} };
                        Object.assign(output[app._id].composes, this.toObject(app.composes));
                        return output;
                    }, {});
                    return appsComposes;
                });
            }).then((appsComposes) => {
                ('function' === typeof callback) && callback(appsComposes);
                return appsComposes;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsComposesModel();
})();
