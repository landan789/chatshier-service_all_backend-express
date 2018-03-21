module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsChatroomsModel() {}
    /**
     * @param {string} appId
     * @param {(appsChatrooms: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsModel.prototype.insert = (appId, callback) => {
        let chatroom = {
            createdTime: Date.now()
        };

        return admin.database().ref('apps/' + appId + '/chatrooms').push(chatroom).then((ref) => {
            let chatroomId = ref.key;
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

    let instance = new AppsChatroomsModel();
    return instance;
})();
