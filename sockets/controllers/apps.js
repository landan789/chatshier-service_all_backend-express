module.exports = (function() {
    /** @type {{ [appId: string]: { [socketId: string]: SocketIO.Socket } }} */
    let appsSocketMap = {};
    let instance = new AppsSocketController();

    function AppsSocketController() {}

    /**
     * @param {string} appId
     * @param {SocketIO.Socket} socket
     * @returns {boolean}
     */
    AppsSocketController.prototype.addSocket = function(appId, socket) {
        if (!(appId && socket && socket.id)) {
            return false;
        }

        if (!appsSocketMap[socket.id]) {
            appsSocketMap[socket.id] = {};
        }
        appsSocketMap[socket.id][appId] = socket;
        return true;
    };

    /**
     * @param {SocketIO.Socket} socket
     * @returns {boolean}
     */
    AppsSocketController.prototype.removeSocket = function(socket) {
        if (!(socket && socket.id)) {
            return false;
        }

        if (appsSocketMap[socket.id]) {
            for (let appId in appsSocketMap[socket.id]) {
                delete appsSocketMap[socket.id][appId];
            }
            delete appsSocketMap[socket.id];
        }
        return true;
    };

    /**
     * @param {string} appId
     * @param {string} eventName
     * @param {any} socketData
     * @returns {boolean}
     */
    AppsSocketController.prototype.emitToAll = function(appId, eventName, socketData) {
        if (!(appId && eventName && socketData)) {
            return false;
        }

        for (let socketId in appsSocketMap) {
            for (let _appId in appsSocketMap[socketId]) {
                if (_appId === appId) {
                    appsSocketMap[socketId][_appId].emit(eventName, socketData);
                }
            }
        }
        return true;
    };

    return instance;
})();
