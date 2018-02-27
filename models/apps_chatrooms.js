module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

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
     * @param {(newChatroomId: string) => any} [callback]
     * @returns {Promise<string>}
     */
    AppsChatroomsModel.prototype.insert = (appId, callback) => {
        let newChatroom = {
            createdTime: Date.now()
        };

        return admin.database().ref('apps/' + appId + '/chatrooms').push(newChatroom).then((ref) => {
            let newChatroomId = ref.key;
            ('function' === typeof callback) && callback(newChatroomId);
            return newChatroomId;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    let instance = new AppsChatroomsModel();
    return instance;
})();
