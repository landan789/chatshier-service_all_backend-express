module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsChatroomsMessagersModel() {}

    /**
     * @param {string} appId
     * @param {string} chatroomId
     * @param {string|string[]} messagerIds
     * @param {number} [unReadCount]
     * @param {(appChatroomMessager: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsMessagersModel.prototype.increaseMessagersUnRead = (appId, chatroomId, messagerIds, unReadCount, callback) => {
        if ('string' === typeof messagerIds) {
            messagerIds = [messagerIds];
        };
        unReadCount = unReadCount || 1;

        return Promise.all(messagerIds.map((messagerId) => {
            return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId).once('value').then((snap) => {
                let chatroom = snap.val() || {};
                let messagers = chatroom.messagers || {};
                let messager = messagers[messagerId] || { unRead: 0 };
                messager.unRead += unReadCount;

                return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messagers/' + messagerId).update(messager).then(() => {
                    let appChatroomMessager = {
                        [appId]: {
                            chatrooms: {
                                [chatroomId]: {
                                    messagers: {
                                        [messagerId]: messager
                                    }
                                }
                            }
                        }
                    };
                    ('function' === typeof callback) && callback(appChatroomMessager);
                    return appChatroomMessager;
                });
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }));
    };

    /**
     * @param {string} appId
     * @param {string} chatroomId
     * @param {string} messagerId
     * @param {(isSuccessful: boolean) => any} [callback]
     * @returns {Promise<boolean>}
     */
    AppsChatroomsMessagersModel.prototype.resetMessagerUnRead = (appId, chatroomId, messagerId, callback) => {
        let isSuccessful = false;
        let messager = {
            unRead: 0
        };

        return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messagers/' + messagerId).update(messager).then(() => {
            isSuccessful = true;
            ('function' === typeof callback) && callback(isSuccessful);
            return isSuccessful;
        }).catch(() => {
            isSuccessful = false;
            ('function' === typeof callback) && callback(isSuccessful);
            return isSuccessful;
        });
    };

    let instance = new AppsChatroomsMessagersModel();
    return instance;
})();
