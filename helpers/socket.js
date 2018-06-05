module.exports = (function() {
    const redisHlp = require('./redis');
    const REDIS_SOCKET_CHANNEL = redisHlp.CHANNELS.REDIS_SOCKET_CHANNEL;

    class SocketHelper {
        constructor() {
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
                    let userIds = json.userIds;
                    let eventName = json.eventName;
                    let dataToSocket = json.dataToSocket;
                    this._sendSocketMessage(userIds, eventName, dataToSocket);
                    break;
                default:
                    break;
            }
        }

        /**
         * @param {string[]} userIds
         * @param {string} eventName
         * @param {any} socketData
         */
        _sendSocketMessage(userIds, eventName, socketData) {
            userIds = userIds || [];
            if (0 === userIds.length) {
                return;
            }

            for (let socketId in this.socketsAppsMap) {
                for (let _userId in this.socketsAppsMap[socketId]) {
                    let i = userIds.indexOf(_userId);
                    if (i < 0) {
                        continue;
                    }
                    this.socketsAppsMap[socketId][userIds[i]].emit(eventName, socketData);
                }
            }
        }

        /**
         * @param {string} userId
         * @param {any} socket
         * @returns {boolean}
         */
        addSocket(userId, socket) {
            if (!(userId && socket && socket.id)) {
                return false;
            }

            if (!this.socketsAppsMap[socket.id]) {
                this.socketsAppsMap[socket.id] = {};
            }
            this.socketsAppsMap[socket.id][userId] = socket;
            return true;
        };

        /**
         * @param {any} socket
         * @returns {boolean}
         */
        removeSocket(socket) {
            if (!(socket && socket.id)) {
                return false;
            }

            if (this.socketsAppsMap[socket.id]) {
                for (let userId in this.socketsAppsMap[socket.id]) {
                    delete this.socketsAppsMap[socket.id][userId];
                }
                delete this.socketsAppsMap[socket.id];
            }
            return true;
        };

        /**
         * @param {string|string[]} userIds
         * @param {string} eventName
         * @param {any} dataToSocket
         * @returns {Promise<void>}
         */
        emitToAll(userIds, eventName, dataToSocket) {
            if (!(userIds && eventName && dataToSocket)) {
                return Promise.reject(new Error());
            }

            if (!(userIds instanceof Array)) {
                userIds = [userIds];
            }

            // 如果連結到 redis server 有出現錯誤
            // 則不透過 redis server 發送訊息
            if (redisHlp.noRedis) {
                this._sendSocketMessage(userIds, eventName, dataToSocket);
                return Promise.resolve();
            }

            return redisHlp.ready.then(() => {
                let redisReqBody = JSON.stringify({ userIds, eventName, dataToSocket });
                return redisHlp.publish(REDIS_SOCKET_CHANNEL, redisReqBody);
            });
        };
    }

    let instance = new SocketHelper();
    return instance;
})();
