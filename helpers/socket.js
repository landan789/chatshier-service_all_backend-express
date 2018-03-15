module.exports = (function() {
    const redisHlp = require('./redis');
    const REDIS_SOCKET_CHANNEL = redisHlp.CHANNELS.REDIS_SOCKET_CHANNEL;

    class SocketHelper {
        constructor() {
            /** @type {{ [socketId: string]: { [appId: string]: SocketIO.Socket } }} */
            this.socketsAppsMap = {};

            this._subscriberOnMessage = this._subscriberOnMessage.bind(this);
            redisHlp.ready.then(() => {
                redisHlp.subscriber.on('message', this._subscriberOnMessage);
                redisHlp.subscriber.subscribe(REDIS_SOCKET_CHANNEL);
            });
        }

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
            if (redisHlp.noRedis) {
                this._sendSocketMessage(appId, eventName, dataToSocket);
                return Promise.resolve();
            }

            return redisHlp.ready.then(() => {
                let redisReqBody = JSON.stringify({ appId, eventName, dataToSocket });
                return redisHlp.publish(REDIS_SOCKET_CHANNEL, redisReqBody);
            });
        };
    }

    let instance = new SocketHelper();
    return instance;
})();
