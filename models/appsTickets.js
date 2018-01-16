var admin = require("firebase-admin"); //firebase admin SDK
var appsTickets = {};


appsTickets._schema = (callback) => {
    var json = {
        ccEmails: [],
        company_id: '', // 可能移除
        createdAt: '',
        custom_fields: {}, // 可能移除
        description: '',
        dueBy: '',
        emailConfigId: '', // 可能移除
        frDueBy: '',
        frEscalated: '',
        fwdEmails: [],
        groupId: '', // 可能移除
        id: '',
        isEscalated: false,
        priority: 1,
        productId: '', // 可能移除
        replyCcEmails: [],
        requester: '',
        requesterId: '',
        responder_id: null,
        source: 2,
        spam: false,
        status: 2,
        subject: "2017",
        toEmails: null,
        type: null,
        updateAt: '2017',
        delete: 0
    };
    callback(json);
};
appsTickets.findTicketsByAppId = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/tickets').once('value', snap => {
        var tickets = snap.val();
        if ('' === tickets || undefined === tickets || null === tickets) {
            callback(false);
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
                    appTickets = {...appTickets, ..._appTickets }; // Object.assign(appTickets, _appTickets );

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
        callback(false);
    });

}

appsTickets.insertByAppid = (appId, postApp, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return new Promise((resolve, reject) => {
            appsTickets._schema(initTicket => {
                resolve(initTicket);
            });
        });
    }).then((initApp) => {
        var app = Object.assign(initApp, postApp);

        return new Promise((resolve, reject) => {
            var appId = admin.database().ref("apps").push(app).key;
            resolve(appId);
        });
    }).then((appId) => {
        return new Promise((resolve, reject) => {
            admin.database().ref("users/" + userid).once("value", snap => {
                var user = snap.val();
                var appIds = !user.hasOwnProperty("app_ids") ? [] : user.app_ids;
                if (null === user || "" === user || undefined === user) {
                    reject();
                    return;
                }
                var n = appIds.length;
                var i;
                for (i = 0; i < n; i++) {
                    var _appId = appIds[i];
                    if (_appId == appId) {
                        appIds.slice(i, 1);
                    }
                }

                appIds.unshift(appId);
                resolve(appIds);
            });
        });
    }).then((appIds) => {
        return new Promise((resolve, reject) => {
            var webhook = {
                app_id: appIds[0]
            };

            var webhookId = admin.database().ref("webhooks").push(webhook).key;

            var user = {
                app_ids: appIds
            };

            var app = {
                webhook_id: webhookId
            };
            admin.database().ref("users/" + userid).update(user).then(() => {
                return admin.database().ref("apps/" + appIds[0]).update(app);
            }).then(() => {
                resolve();
            });
        });
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

appsTickets.updateByAppId = (appId, putApp, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    procced.then(() => {
        return new Promise((resolve, reject) => {
            admin.database().ref("apps/" + appId).once("value", snap => {
                var app = snap.val();
                if (undefined === app || "" === app || null === app) {
                    reject();
                    return;
                }

                // 已刪除資料不能更新
                if (1 === app.delete) {
                    reject();
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        return admin.database().ref("apps/" + appId).update(putApp);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

appsTickets.removeByAppId = (appId, callback) => {
    var procced = new Promise((resolve, reject) => {
        resolve();
    });

    deleteApp = {
        delete: 1
    };

    procced.then(() => {
        return admin.database().ref("apps/" + appId).update(deleteApp);
    }).then(() => {
        callback(true);
    }).catch(() => {
        callback(false);
    });
};

module.exports = appsTickets;