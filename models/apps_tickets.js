module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const docUnwind = {
        $unwind: '$tickets' // 只針對 document 處理
    };

    const docOutput = {
        $project: {
            // 篩選需要的項目
            tickets: 1
        }
    };

    class AppsTicketsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string|string[]} appIds
         * @param {any|null} ticketId
         * @param {(appTickets: any) => any} [callback]
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
                'isDeleted': false
            };
            if (ticketId) {
                query['tickets._id'] = this.Types.ObjectId(ticketId);
                query['tickets.isDeleted'] = false;
            }

            let aggregations = [
                docUnwind,
                {
                    $match: query
                },
                docOutput
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    let appsTickets = {};
                    return Promise.resolve(appsTickets);
                }

                let appsTickets = results.reduce((output, curr) => {
                    output[curr._id] = output[curr._id] || { tickets: {} };
                    Object.assign(output[curr._id].tickets, this.toObject(curr.tickets));
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
         * @param {(appTickets: any) => any} [callback]
         */
        insert(appId, ticket, callback) {
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
         * @param {string} appId
         * @param {string} ticketId
         * @param {any} ticket
         * @param {(appTickets: any) => any} [callback]
         */
        update(appId, ticketId, ticket, callback) {
            ticket._id = ticketId;
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
         * @param {string} appId
         * @param {string} ticketId
         * @param {(appTickets: any) => any} [callback]
         */
        remove(appId, ticketId, callback) {
            let ticket = {
                _id: ticketId,
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId),
                'tickets._id': this.Types.ObjectId(ticketId)
            };

            let updateOper = { $set: {} };
            for (let prop in ticket) {
                updateOper.$set['tickets.$.' + prop] = ticket[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [
                    docUnwind,
                    {
                        $match: query
                    },
                    docOutput
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    let appsTickets = results.reduce((output, curr) => {
                        output[curr._id] = output[curr._id] || { tickets: {} };
                        Object.assign(output[curr._id].tickets, this.toObject(curr.tickets));
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
