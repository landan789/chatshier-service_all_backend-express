module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsChatroomsMessagersModel() {}

    /**
     * @param {string} appId
     * @param {string} chatroomId
     * @param {string} messagerId
     * @param {number} [unReadCount]
     * @param {(appChatroomMessager: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsMessagersModel.prototype.increaseMessagerUnRead = (appId, chatroomId, messagerId, unReadCount, callback) => {
        unReadCount = unReadCount || 1;

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
    };

    
    /**
     * @param {string} appId
     * @param {string} chatroomId
     * @param {string|string[]} messagerIds
     * @param {any} count
     * @param {(appChatroomMessager: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsChatroomsMessagersModel.prototype.updateMessagerUnRead = (appId, chatroomId, messagerIds, messager, callback) => {
        if ('string' === typeof messagerIds) {
            messagerIds = [messagerIds];
        };

        let appsChatroomsMessagers;
        let _messagers;
        return Promise.all(messagerIds.map((messagerId) => {
            return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messagers/' + messagerId).once('value').then((snap) => {
                let _messager = snap.val();
                let __messager = {
                    unRead: (_messager.unRead + messager.unRead)
                };
                return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messagers/' + messagerId).update(__messager);
            }).then(() => {
                return admin.database().ref('apps/' + appId + '/chatrooms/' + chatroomId + '/messagers').once('value');
            }).then((snap) => {
                let messagers = snap.val();
                _messagers[messagerId] = messagers[messagerId];
                appsChatroomsMessagers = {
                    [appId]: {
                        chatrooms: {
                            [chatroomId]: {
                                messagers: _messagers
                            }
                        }
                    }
                };
            });
        })).then(() => {
            ('function' === typeof callback) && callback(appsChatroomsMessagers);
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
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
