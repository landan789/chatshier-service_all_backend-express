module.exports = (function() {
    const redisHlp = require('./redis');
    const REDIS_SOCKET_CHANNEL = redisHlp.CHANNELS.REDIS_SOCKET_CHANNEL;
    const ONLINE_USER_IDS = 'ONLINE_USER_IDS';

    class SocketHelper {
        constructor() {
            /** @type {{ [socketId: string]: string }} */
            this.socketUserIdMap = {};
            /** @type {{ [userId: string]: { [socketId: string]: SocketIO.Socket } }} */
            this.usersSockets = {};

            redisHlp.ready.then(() => {
                redisHlp.subscriber.on('message', this._subscriberOnMessage.bind(this));
                redisHlp.subscriber.subscribe(REDIS_SOCKET_CHANNEL);
            });
        }

        /**
         * @returns {Promise<string[]>}
         */
        getOnlineUserIds() {
            if (!redisHlp.isRedisConnected) {
                return Promise.resolve(Object.keys(this.usersSockets));
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
                    if (!this.usersSockets[userId] && !onlineUserIds.includes(userId)) {
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

            if (!this.usersSockets[userId]) {
                this.usersSockets[userId] = {};
            }
            this.usersSockets[userId][socket.id] = socket;
            this.socketUserIdMap[socket.id] = userId;

            // 用戶第 1 次連線時才需要更新 redis 狀態
            // 因為同一用戶可能使用多個瀏覽器登入，此時就會有同一個 userId 有多個 socket
            if (1 === Object.keys(this.usersSockets[userId]).length) {
                redisHlp.pushArrayValue(ONLINE_USER_IDS, userId);
            }
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

            let userId = this.socketUserIdMap[socket.id];
            if (!userId) {
                return true;
            }
            delete this.socketUserIdMap[socket.id];

            if (!(this.usersSockets[userId] && this.usersSockets[userId][socket.id])) {
                return true;
            }
            delete this.usersSockets[userId][socket.id];

            // 刪除 socket 後，若此用戶已經沒有任何 socket 連線，則代表用戶已離線
            if (0 === Object.keys(this.usersSockets[userId]).length) {
                delete this.usersSockets[userId];
                redisHlp.removeArrayValue(ONLINE_USER_IDS, userId);
            }
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
                let sockets = this.usersSockets[userId];

                if (!sockets) {
                    continue;
                }

                for (let socketId in sockets) {
                    sockets[socketId].emit(eventName, socketData);
                }
            }
        }
    }

    return new SocketHelper();
})();
