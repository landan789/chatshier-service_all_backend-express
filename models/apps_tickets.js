module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsTicketsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} [ticketId]
         * @param {(appsTickets: Chatshier.Models.AppsTickets | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTickets | null>}
         */
        find(appIds, ticketId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            // 尋找符合的欄位
            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'tickets.isDeleted': false
            };
            if (ticketId) {
                query['tickets._id'] = this.Types.ObjectId(ticketId);
            }

            let aggregations = [{
                $unwind: '$tickets'
            }, {
                $match: query
            }, {
                $project: {
                    tickets: true
                }
            }, {
                $sort: {
                    'templates.createdTime': -1 // 最晚建立的在最前頭
                }
            }];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsTickets = {};
                if (0 === results.length) {
                    return appsTickets;
                }

                appsTickets = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { tickets: {} };
                    Object.assign(output[app._id].tickets, this.toObject(app.tickets));
                    return output;
                }, {});
                return appsTickets;
            }).then((appsTickets) => {
                ('function' === typeof callback) && callback(appsTickets);
                return appsTickets;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} ticket
         * @param {(appsTickets: Chatshier.Models.AppsTickets | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTickets | null>}
         */
        insert(appId, ticket, callback) {
            ticket = ticket || {};

            let ticketId = this.Types.ObjectId();
            ticket._id = ticketId;
            ticket.createdTime = ticket.updatedTime = Date.now();

            let query = {
                '_id': appId
            };

            let updateOper = {
                $push: {
                    tickets: ticket
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, ticketId.toHexString());
            }).then((appsTickets) => {
                ('function' === typeof callback) && callback(appsTickets);
                return appsTickets;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} ticketId
         * @param {any} ticket
         * @param {(appsTickets: Chatshier.Models.AppsTickets | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTickets | null>}
         */
        update(appId, ticketId, ticket, callback) {
            ticket = ticket || {};
            ticket.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'tickets._id': ticketId
            };

            let updateOper = { $set: {} };
            for (let prop in ticket) {
                updateOper.$set['tickets.$.' + prop] = ticket[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, ticketId);
            }).then((appsTickets) => {
                ('function' === typeof callback) && callback(appsTickets);
                return appsTickets;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} ticketId
         * @param {(appsTickets: Chatshier.Models.AppsTickets | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsTickets | null>}
         */
        remove(appIds, ticketId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let ticket = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'tickets._id': this.Types.ObjectId(ticketId)
            };

            let updateOper = { $set: {} };
            for (let prop in ticket) {
                updateOper.$set['tickets.$.' + prop] = ticket[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [{
                    $unwind: '$tickets'
                }, {
                    $match: query
                }, {
                    $project: {
                        tickets: true
                    }
                }];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsTickets = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsTickets = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { tickets: {} };
                        Object.assign(output[app._id].tickets, this.toObject(app.tickets));
                        return output;
                    }, {});
                    return appsTickets;
                });
            }).then((appsTickets) => {
                ('function' === typeof callback) && callback(appsTickets);
                return appsTickets;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsTicketsModel();
})();
