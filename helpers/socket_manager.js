module.exports = (function() {
    const redis = require('redis');
    const chatshierCfg = require('../config/chatshier');
    const REDIS_SOCKET_CHANNEL = 'REDIS_SOCKET_CHANNEL';

    // http://redis.js.org/#api-rediscreateclient
    let redisClientOpts = {
        host: chatshierCfg.REDIS.HOST,
        port: chatshierCfg.REDIS.PORT,
        connect_timeout: 3000,
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

    class SocketManager {
        constructor() {
            /** @type {{ [socketId: string]: { [appId: string]: SocketIO.Socket } }} */
            this.socketsAppsMap = {};
            this.noRedis = true;
            this.publisher = redis.createClient(redisClientOpts);
            this.subscriber = redis.createClient(redisClientOpts);
            this.redisReady = this._initRedisClient();
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
                this.noRedis = false;
                publisherReadyResolve && publisherReadyResolve();
                publisherReadyResolve = void 0;
            });

            this.publisher.on('error', (err) => {
                if (err && ('ECONNREFUSED' === err.code || 'CONNECTION_BROKEN' === err.code)) {
                    this.noRedis = true;
                }
                publisherReadyResolve && publisherReadyResolve();
                publisherReadyResolve = void 0;
            });

            this.publisher.on('end', () => {
                this.noRedis = true;

                publisherReadyPromise = new Promise((resolve) => {
                    publisherReadyResolve = resolve;
                });

                this.redisReady = Promise.all([
                    publisherReadyPromise,
                    subscriberReadyPromise
                ]);
            });

            this.subscriber.on('connect', () => {
                this.noRedis = false;
                subscriberReadyResolve && subscriberReadyResolve();
                subscriberReadyResolve = void 0;
            });

            this.subscriber.on('error', (err) => {
                if (err && ('ECONNREFUSED' === err.code || 'CONNECTION_BROKEN' === err.code)) {
                    this.noRedis = true;
                }
                subscriberReadyResolve && subscriberReadyResolve();
                subscriberReadyResolve = void 0;
            });

            this.subscriber.on('end', () => {
                this.noRedis = true;

                subscriberReadyPromise = new Promise((resolve) => {
                    subscriberReadyResolve = resolve;
                });

                this.redisReady = Promise.all([
                    publisherReadyPromise,
                    subscriberReadyPromise
                ]);
            });

            this.subscriber.on('message', (channel, message) => this._subscriberOnMessage(channel, message));
            this.subscriber.subscribe(REDIS_SOCKET_CHANNEL);

            return redisReady;
        };

        /**
         * @param {string} channel
         * @param {string} messageBody
         */
        _subscriberOnMessage(channel, messageBody) {
            switch (channel) {
                case REDIS_SOCKET_CHANNEL:
                    let json = JSON.parse(messageBody);
                    let appId = json.appId;
                    let eventName = json.eventName;
                    let dataToSocket = json.dataToSocket;
                    this._sendSocketMessage(appId, eventName, dataToSocket);
                    break;
                default:
                    break;
            }
        }

        /**
         * @param {string} appId
         * @param {string} eventName
         * @param {any} socketData
         */
        _sendSocketMessage(appId, eventName, socketData) {
            for (let socketId in this.socketsAppsMap) {
                for (let _appId in this.socketsAppsMap[socketId]) {
                    if (_appId !== appId) {
                        continue;
                    }
                    this.socketsAppsMap[socketId][appId].emit(eventName, socketData);
                }
            }
        }

        /**
         * @param {string} appId
         * @param {SocketIO.Socket} socket
         * @returns {boolean}
         */
        addSocket(appId, socket) {
            if (!(appId && socket && socket.id)) {
                return false;
            }

            if (!this.socketsAppsMap[socket.id]) {
                this.socketsAppsMap[socket.id] = {};
            }
            this.socketsAppsMap[socket.id][appId] = socket;
            return true;
        };

        /**
         * @param {SocketIO.Socket} socket
         * @returns {boolean}
         */
        removeSocket(socket) {
            if (!(socket && socket.id)) {
                return false;
            }

            if (this.socketsAppsMap[socket.id]) {
                for (let appId in this.socketsAppsMap[socket.id]) {
                    delete this.socketsAppsMap[socket.id][appId];
                }
                delete this.socketsAppsMap[socket.id];
            }
            return true;
        };

        /**
         * @param {string} appId
         * @param {string} eventName
         * @param {any} dataToSocket
         * @returns {Promise<void>}
         */
        emitToAll(appId, eventName, dataToSocket) {
            if (!(appId && eventName && dataToSocket)) {
                return Promise.reject(new Error());
            }

            // 如果連結到 redis server 有出現錯誤
            // 則不透過 redis server 發送訊息
            if (this.noRedis) {
                this._sendSocketMessage(appId, eventName, dataToSocket);
                return Promise.resolve();
            }

            return this.redisReady.then(() => {
                return new Promise((resolve) => {
                    let redisReqBody = JSON.stringify({ appId, eventName, dataToSocket });
                    this.publisher.publish(REDIS_SOCKET_CHANNEL, redisReqBody, () => {
                        resolve();
                    });
                });
            });
        };
    }

    let instance = new SocketManager();
    return instance;
})();
