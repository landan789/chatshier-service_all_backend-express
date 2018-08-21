module.exports = (function() {
    const redis = require('redis');
    const CHATSHIER_CFG = require('../config/chatshier');
    const REDIS_API_CHANNEL = 'REDIS_API_CHANNEL';
    const REDIS_SOCKET_CHANNEL = 'REDIS_SOCKET_CHANNEL';
    const UPDATE_FUSE_USERS = 'UPDATE_FUSE_USERS';

    // http://redis.js.org/#api-rediscreateclient
    let redisClientOpts = {
        host: CHATSHIER_CFG.REDIS.HOST,
        port: CHATSHIER_CFG.REDIS.PORT,
        password: CHATSHIER_CFG.REDIS.PASSWORD, // "chatshier" MD5 hash
        connect_timeout: 30000,
        retry_strategy: (options) => {
            // // redis server 已經失去連線則不進行重新嘗試
            // if (options.error && 'ECONNREFUSED' === options.error.code) {
            //     return new Error('The server refused the connection');
            // }

            // // 總重新嘗試時間超過 10 分鐘，停止嘗試
            // if (options.total_retry_time > 10 * 60 * 1000) {
            //     return new Error('Retry time exhausted');
            // }

            // 重新嘗試連線超過次數，停止嘗試
            if (options.attempt > 5) {
                return new Error('Too many retry times');
            }

            // 重新嘗試連線間隔 = 次數 * 1000 (最長 3s)
            return Math.min(options.attempt * 1000, 3000);
        }
    };

    class RedisHelper {
        constructor() {
            this.CHANNELS = {
                REDIS_API_CHANNEL: REDIS_API_CHANNEL,
                REDIS_SOCKET_CHANNEL: REDIS_SOCKET_CHANNEL
            };

            this.EVENTS = {
                UPDATE_FUSE_USERS: UPDATE_FUSE_USERS
            };

            this.isRedisConnected = false;
            this.publisher = redis.createClient(redisClientOpts);
            this.subscriber = redis.createClient(redisClientOpts);
            this._ready = this._initRedisClient();
        }

        get ready() {
            return this._ready;
        }

        publish(channel, redisReqBody) {
            return new Promise((resolve) => {
                if (!this.isRedisConnected) {
                    return resolve();
                }
                this.publisher.publish(channel, redisReqBody, resolve);
            });
        }

        /**
         * https://redis.io/commands/lrange
         * @param {string} key
         * @returns {Promise<string[]>}
         */
        getArrayValues(key) {
            return new Promise((resolve, reject) => {
                if (!this.isRedisConnected) {
                    return resolve([]);
                }

                this.publisher.lrange(key, 0, -1, (err, values) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(values);
                });
            });
        }

        /**
         * https://redis.io/commands/lpush
         * @param {string} key
         * @param {string} value
         */
        pushArrayValue(key, value) {
            return new Promise((resolve, reject) => {
                if (!this.isRedisConnected) {
                    return resolve(-1);
                }

                this.publisher.lpush(key, value, (err, idx) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(idx);
                });
            });
        }

        /**
         * https://redis.io/commands/lrem
         * @param {string} key
         * @param {string} value
         */
        removeArrayValue(key, value) {
            return new Promise((resolve, reject) => {
                if (!this.isRedisConnected) {
                    return resolve();
                }

                this.publisher.lrem(key, 0, value, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            });
        }

        _initRedisClient() {
            let publisherReadyResolve;
            let publisherReadyPromise = new Promise((resolve) => {
                publisherReadyResolve = resolve;
            });

            let subscriberReadyResolve;
            let subscriberReadyPromise = new Promise((resolve) => {
                subscriberReadyResolve = resolve;
            });

            /** @type {Promise<[void, void]>} */
            let redisReady = Promise.all([
                publisherReadyPromise,
                subscriberReadyPromise
            ]);

            this.publisher.on('connect', () => {
                this.isRedisConnected = true;
                publisherReadyResolve && publisherReadyResolve();
                publisherReadyResolve = void 0;
                console.log('[SUCCEEDED] the pub of api-chatshier is connecting to Redis !!');
            });

            this.publisher.on('error', () => {
                this.isRedisConnected = false;
                publisherReadyResolve && publisherReadyResolve();
                publisherReadyResolve = void 0;
                console.log('[FAILED] the pub of api-chatshier is not connecting to Redis !!');
            });

            this.publisher.on('end', () => {
                this.isRedisConnected = false;

                publisherReadyPromise = new Promise((resolve) => {
                    publisherReadyResolve = resolve;
                });

                this._ready = Promise.all([
                    publisherReadyPromise,
                    subscriberReadyPromise
                ]);
            });

            this.subscriber.on('connect', () => {
                this.isRedisConnected = true;
                subscriberReadyResolve && subscriberReadyResolve();
                subscriberReadyResolve = void 0;
                console.log('[SUCCEEDED] the sub of api-chatshier is connecting to Redis !!');
            });

            this.subscriber.on('error', () => {
                this.isRedisConnected = false;
                subscriberReadyResolve && subscriberReadyResolve();
                subscriberReadyResolve = void 0;
                console.log('[FAILED] the sub of api-chatshier is not connecting to Redis !!');
            });

            this.subscriber.on('end', () => {
                this.isRedisConnected = false;

                subscriberReadyPromise = new Promise((resolve) => {
                    subscriberReadyResolve = resolve;
                });

                this._ready = Promise.all([
                    publisherReadyPromise,
                    subscriberReadyPromise
                ]);
            });

            return redisReady;
        }
    }

    let instance = new RedisHelper();
    return instance;
})();
