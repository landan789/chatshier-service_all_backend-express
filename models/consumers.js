module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CONSUMERS = 'consumers';

    class ConsumersModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(CONSUMERS, this.ConsumersSchema);
            this.project = {
                platformUid: true,
                age: true,
                email: true,
                isDeleted: true,
                updatedTime: true,
                createdTime: true,
                gender: true,
                name: true,
                photo: true,
                remark: true,
                custom_fields: true,
                type: true
            };
        }

        /**
         * 查找時必須使用各平台的 platformUid 而不是 consumerId
         *
         * @param {string|string[]|null} platformUids
         * @param {(consumers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        find(platformUids, callback) {
            if (platformUids && !(platformUids instanceof Array)) {
                platformUids = [platformUids];
            }

            let query = {
                'isDeleted': false
            };

            if (platformUids instanceof Array) {
                query['platformUid'] = {
                    $in: platformUids
                };
            }

            return this.Model.find(query, this.project).then((consumers) => {
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
         * @param {string} platformUid
         * @param {any} consumer
         * @param {(consumers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        replace(platformUid, consumer, callback) {
            consumer = consumer || {};
            consumer.platformUid = platformUid;
            consumer.updatedTime = Date.now();

            let query = {
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

            return this.Model.update(query, doc, optons).then((result) => {
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
         * @param {(consumers: any) => any} [callback]
         * @returns {Promise<any>}
         */
        remove(platformUid, callback) {
            let consumer = {
                isDeleted: true,
                platformUid: platformUid,
                updatedTime: Date.now()
            };

            let query = {
                platformUid: platformUid
            };

            let doc = { $set: {} };
            for (let prop in consumer) {
                doc.$set[prop] = consumer[prop];
            }

            return this.Model.update(query, doc).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }

                let query = {
                    'platformUid': platformUid,
                    'isDeleted': true
                };
                return this.Model.findOne(query, this.project).then((consumer) => {
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
