var admin = require('firebase-admin'); // firebase admin SDK
var appsTickets = {};

appsTickets._schema = (callback) => {
    var json = {
        createdTime: '',
        description: '',
        dueTime: Date.now(),
        priority: 1,
        messagerId: '',
        status: 2,
        updatedTime: Date.now(),
        isDeleted: 0
    };
    callback(json);
};

appsTickets.findTicketsByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/tickets').once('value', snap => {
        var tickets = snap.val();
        if ('' === tickets || undefined === tickets || null === tickets) {
            callback(null);
            return;
        }

        callback(tickets);
    });
};

appsTickets.findAppTicketsByAppIds = (appIds, callback) => {
    var appTickets = {};
    next(0, callback);

    function next(i, cb) {
        var procced = new Promise((resolve, reject) => {
            resolve();
        });

        procced.then(() => {
            return new Promise((resolve, reject) => {
                if (i >= appIds.length) {
                    reject(appTickets);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                var appId = appIds[i];
                admin.database().ref('apps/' + appId + '/tickets').once('value', snap => {
                    var tickets = snap.val();
                    var _appTickets = Object.assign({});
                    _appTickets[appId] = {
                        tickets: tickets
                    };
                    if (null === tickets || undefined === tickets || '' === tickets) {
                        resolve();
                        return;
                    }
                    appTickets = { ...appTickets, ..._appTickets }; // Object.assign(appTickets, _appTickets );

                    resolve();
                });
            });
        }).then(() => {
            next(i + 1, cb);
        }).catch(() => {
            cb(appTickets);
        });
    }
};

appsTickets.findAppTicketByAppIdByTicketId = (appId, ticketId, callback) => {
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
};

appsTickets.insertByAppid = (appId, postTicket, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return new Promise((resolve, reject) => {
            appsTickets._schema(initTicket => {
                if (null === initTicket || undefined === initTicket || '' === initTicket) {
                    reject();
                    return;
                }
                resolve(initTicket);
            });
        });
    }).then((initTicket) => {
        var ticket = Object.assign(initTicket, postTicket);

        return admin.database().ref('apps/' + appId + '/tickets').push(ticket);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(null);
    });
};

appsTickets.updateByAppIdByticketId = (appId, ticketId, putTicket, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return admin.database().ref('apps/' + appId + '/tickets/' + ticketId).update(putTicket);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(null);
    });
};

appsTickets.removeByAppIdByTicketId = (appId, ticketId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    var deleteTicket = {
        isDeleted: 1
    };

    procced.then(() => {
        return admin.database().ref('apps/' + appId + '/tickets/' + ticketId).update(deleteTicket);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(null);
    });
};

module.exports = appsTickets;
