var admin = require('firebase-admin'); // firebase admin SDK
var appsTickets = {
    _schema: (callback) => {
        var json = {
            createdTime: Date.now(),
            description: '',
            dueTime: Date.now(),
            priority: 1,
            messager_id: '',
            status: 2,
            assigned: '',
            updatedTime: Date.now(),
            isDeleted: 0
        };
        callback(json);
    },

    findTickets: (appId, callback) => {
        admin.database().ref('apps/' + appId + '/tickets').once('value', snap => {
            var tickets = snap.val();
            if ('' === tickets || undefined === tickets || null === tickets) {
                callback(null);
                return;
            }

            callback(tickets);
        });
    },
    /**
     * @param {string[]} appIds
     * @param {(appTickets: any) => any} callback
     */
    findAppTickets: (appIds, callback) => {
        if ('string' === typeof appIds) {
            appIds = [appIds];
        }
        let appTickets = {};

        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/tickets').once('value').then((snap) => {
                let tickets = snap.val();
                if (!tickets) {
                    return;
                }

                appTickets[appId] = {
                    tickets: tickets
                };
            });
        })).then(() => {
            callback(appTickets);
        }).catch(() => {
            callback(null);
        });
    },
    findAppTicket: (appId, ticketId, callback) => {
        var procced = new Promise((resolve, reject) => {
            resolve();
        });

        procced.then(() => {
            return new Promise((resolve, reject) => {
                admin.database().ref('apps/' + appId + '/tickets/' + ticketId).once('value', snap => {
                    var ticket = snap.val();
                    if (null === ticket || undefined === ticket || '' === ticket) {
                        reject();
                        return;
                    }
                    var apps = {};
                    var tickets = {};
                    tickets[ticketId] = ticket;
                    apps[appId] = tickets;
                    resolve(apps);
                });
            });
        }).then((data) => {
            var apps = data;
            callback(apps);
        }).catch(() => {
            callback(null);
        });
    },
    insert: (appId, postTicket, callback) => {
        var procced = Promise.resolve();

        procced.then(() => {
            return new Promise((resolve, reject) => {
                appsTickets._schema(initTicket => {
                    resolve(initTicket);
                });
            });
        }).then((initTicket) => {
            postTicket = Object.assign(initTicket, postTicket);
            return admin.database().ref('apps/' + appId + '/tickets').push(postTicket);
        }).then((ref) => {
            let ticketId = ref.key;
            let appsTickets = {
                [appId]: {
                    tickets: {
                        [ticketId]: postTicket
                    }
                }
            };
            callback(appsTickets);
        }).catch(() => {
            callback(null);
        });
    },
    update: (appId, ticketId, putTicket, callback) => {
        let procced = Promise.resolve();

        procced.then(() => {
            putTicket.updatedTime = Date.now();
            return admin.database().ref('apps/' + appId + '/tickets/' + ticketId).update(putTicket);
        }).then(() => {
            return admin.database().ref('apps/' + appId + '/tickets/' + ticketId).once('value');
        }).then((snap) => {
            let ticketInDB = snap.val();
            let appsTickets = {
                [appId]: {
                    tickets: {
                        [ticketId]: ticketInDB
                    }
                }
            };
            callback(appsTickets);
        }).catch(() => {
            callback(null);
        });
    },
    remove: (appId, ticketId, callback) => {
        var procced = new Promise((resolve, reject) => {
            resolve();
        });

        var deleteTicket = {
            updatedTime: Date.now(),
            isDeleted: 1
        };

        procced.then(() => {
            return admin.database().ref('apps/' + appId + '/tickets/' + ticketId).update(deleteTicket);
        }).then(() => {
            callback(true);
        }).catch(() => {
            callback(null);
        });
    }
};

module.exports = appsTickets;
