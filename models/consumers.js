module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CONSUMERS = 'consumers';

    class ConsumersModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(CONSUMERS, this.ConsumersSchema);
        }

        /**
         * 查找時必須使用各平台的 platformUid 而不是 consumerId
         *
         * @param {string|string[]} [platformUids]
         * @param {(consumers: Chatshier.Models.Consumers | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Consumers | null>}
         */
        find(platformUids, callback) {
            if (platformUids && !(platformUids instanceof Array)) {
                platformUids = [platformUids];
            }

            let conditions = {
                'isDeleted': false
            };

            if (platformUids instanceof Array) {
                conditions['platformUid'] = {
                    $in: platformUids
                };
            }

            return this.Model.find(conditions).sort({ createdTime: -1 }).lean().then((consumers) => {
                return this.toObject(consumers, 'platformUid');
            }).then((consumers) => {
                ('function' === typeof callback) && callback(consumers);
                return consumers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} consumerId
         * @param {(consumers: Chatshier.Models.Consumers | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Consumers | null>}
         */
        findById(consumerId, callback) {
            let conditions = {
                '_id': this.Types.ObjectId(consumerId),
                'isDeleted': false
            };

            return this.Model.find(conditions).sort({ createdTime: -1 }).lean().then((consumers) => {
                return this.toObject(consumers);
            }).then((consumers) => {
                ('function' === typeof callback) && callback(consumers);
                return consumers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} platformUid
         * @param {any} consumer
         * @param {(consumers: Chatshier.Models.Consumers | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Consumers | null>}
         */
        replace(platformUid, consumer, callback) {
            consumer = consumer || {};
            consumer.platformUid = platformUid;
            consumer.updatedTime = Date.now();

            let conditions = {
                platformUid: platformUid
            };

            let doc = { $set: {} };
            for (let prop in consumer) {
                doc.$set[prop] = consumer[prop];
            }

            let optons = {
                upsert: true,
                setDefaultsOnInsert: true
            };

            return this.Model.update(conditions, doc, optons).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(platformUid);
            }).then((consumers) => {
                ('function' === typeof callback) && callback(consumers);
                return consumers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} platformUid
         * @param {(consumers: Chatshier.Models.Consumers | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Consumers | null>}
         */
        remove(platformUid, callback) {
            let consumer = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let conditions = {
                platformUid: platformUid
            };

            let doc = { $set: {} };
            for (let prop in consumer) {
                doc.$set[prop] = consumer[prop];
            }

            return this.Model.update(conditions, doc).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }

                return this.Model.findOne(conditions).lean().then((consumer) => {
                    return this.toObject(consumer);
                });
            }).then((consumers) => {
                ('function' === typeof callback) && callback(consumers);
                return consumers;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new ConsumersModel();
})();
