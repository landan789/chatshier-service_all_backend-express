module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    let instance = new AppsChatroomsModel();

    function AppsChatroomsModel() {}

    /**
     * @param {string} appId
     * @param {(appsChatrooms: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsModel.prototype.findAll = (appId, callback) => {
        return admin.database().ref('apps/' + appId + '/chatrooms').once('value').then((snap) => {
            let chatrooms = snap.val() || {};
            let appsChatrooms = {
                [appId]: {
                    chatrooms: chatrooms
                }
            };
            ('function' === typeof callback) && callback(appsChatrooms);
            return appsChatrooms;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * @param {string} appId
     * @param {string} chatroomId
     * @param {(appsChatrooms: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsModel.prototype.findOne = (appId, chatroomId, callback) => {
        return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId).once('value').then((snap) => {
            let chatroom = snap.val() || {};
            let appsChatrooms = {
                [appId]: {
                    chatrooms: {
                        [chatroomId]: chatroom
                    }
                }
            };
            ('function' === typeof callback) && callback(appsChatrooms);
            return appsChatrooms;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * @param {string} appId
     * @param {string|string[]} chatroomIds
     * @param {(chatroomMessagers: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsModel.prototype.findMessagerIdsInChatrooms = (appId, chatroomIds, callback) => {
        if ('string' === typeof chatroomIds) {
            chatroomIds = [chatroomIds];
        }

        return Promise.resolve().then(() => {
            if (!chatroomIds) {
                return Promise.reject(new Error());
            }
            let appsChatroomMessagers = {
                [appId]: {
                    messagers: {}
                }
            };

            return admin.database().ref('apps/' + appId + '/messagers').once('value').then((snap) => {
                let messagers = snap.val() || {};

                for (let i in chatroomIds) {
                    let chatroomId = chatroomIds[i];

                    for (let messagerId in messagers) {
                        if (chatroomId === messagers[messagerId].chatroom_id) {
                            appsChatroomMessagers[appId].messagers[messagerId] = messagers[messagerId];
                        }
                    }
                }
                return appsChatroomMessagers;
            });
        }).then((chatroomMessagers) => {
            ('function' === typeof callback) && callback(chatroomMessagers);
            return chatroomMessagers;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * @param {string} appId
     * @param {(newChatroomId: string) => any} [callback]
     * @returns {Promise<string>}
     */
    AppsChatroomsModel.prototype.insert = (appId, callback) => {
        return admin.database().ref('apps/' + appId + '/chatrooms').push().then((ref) => {
            let newChatroomId = ref.key;
            ('function' === typeof callback) && callback(newChatroomId);
            return newChatroomId;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    return instance;
})();
