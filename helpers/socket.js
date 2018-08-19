module.exports = (function() {
    const redisHlp = require('./redis');
    const REDIS_SOCKET_CHANNEL = redisHlp.CHANNELS.REDIS_SOCKET_CHANNEL;
    const ONLINE_USER_IDS = 'ONLINE_USER_IDS';

    class SocketHelper {
        constructor() {
            /** @type {{ [socketId: string]: { [userId: string]: SocketIO.Socket } }} */
            this.socketMap = {};
            this.userMap = {};

            this._subscriberOnMessage = this._subscriberOnMessage.bind(this);
            redisHlp.ready.then(() => {
                redisHlp.subscriber.on('message', this._subscriberOnMessage);
                redisHlp.subscriber.subscribe(REDIS_SOCKET_CHANNEL);
            });
        }

        /**
         * @returns {Promise<string[]>}
         */
        getOnlineUserIds() {
            if (!redisHlp.isRedisConnected) {
                return Promise.resolve(Object.keys(this.userMap));
            }
            return redisHlp.getArrayValues(ONLINE_USER_IDS);
        }

        /**
         * @param {string[]} userIds
         * @returns {Promise<string[]>}
         */
        getOfflineUserIds(userIds) {
            return this.getOnlineUserIds().then((onlineUserIds) => {
                let offlineUserIds = [];
                for (let i in userIds) {
                    let userId = userIds[i];
                    if (!this.userMap[userId] && !onlineUserIds.includes(userId)) {
                        offlineUserIds.push(userId);
                    }
                }
                return offlineUserIds;
            });
        }

        /**
         * @param {string} userId
         * @param {SocketIO.Socket} socket
         * @returns {boolean}
         */
        addSocket(userId, socket) {
            if (!(userId && socket && socket.id)) {
                return false;
            }

            if (!this.socketMap[socket.id]) {
                this.socketMap[socket.id] = {};
            }
            this.socketMap[socket.id][userId] = this.userMap[userId] = socket;
            redisHlp.pushArrayValue(ONLINE_USER_IDS, userId);
            return true;
        }

        /**
         * @param {SocketIO.Socket} socket
         * @returns {boolean}
         */
        removeSocket(socket) {
            if (!(socket && socket.id)) {
                return false;
            }

            if (!this.socketMap[socket.id]) {
                return true;
            }

            for (let userId in this.socketMap[socket.id]) {
                delete this.userMap[userId];
                delete this.socketMap[socket.id][userId];
                redisHlp.removeArrayValue(ONLINE_USER_IDS, userId);
            }
            delete this.socketMap[socket.id];
            return true;
        }

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
            if (!redisHlp.isRedisConnected) {
                this._sendSocketMessage(userIds, eventName, dataToSocket);
                return Promise.resolve();
            }

            return redisHlp.ready.then(() => {
                let redisReqBody = JSON.stringify({ userIds, eventName, dataToSocket });
                return redisHlp.publish(REDIS_SOCKET_CHANNEL, redisReqBody);
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

            for (let i in userIds) {
                let userId = userIds[i];
                this.userMap[userId] && this.userMap[userId].emit(eventName, socketData);
            }
        }
    }

    return new SocketHelper();
})();
