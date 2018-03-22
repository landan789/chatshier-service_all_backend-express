module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

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
            let findQuery = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                }
            };
            ticketId && (findQuery['tickets._id'] = this.Types.ObjectId(ticketId));

            let aggregations = [
                {
                    $unwind: '$tickets' // 只針對 document 處理
                }, {
                    $match: findQuery
                }, {
                    $project: {
                        // 篩選項目
                        tickets: 1
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error('TICKETS_NOT_FOUND'));
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

            let findQuery = {
                '_id': appId
            };

            let updateOper = {
                $push: {
                    tickets: ticket
                }
            };

            return this.AppsModel.update(findQuery, updateOper).then(() => {
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

            let findQuery = {
                '_id': appId,
                'tickets._id': ticketId
            };

            let updateOper = { $set: {} };
            for (let prop in ticket) {
                updateOper.$set['tickets.$.' + prop] = ticket[prop];
            }

            return this.AppsModel.update(findQuery, updateOper).then(() => {
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
                isDeleted: true
            };
            return this.update(appId, ticketId, ticket, callback);
        }
    }

    return new AppsTicketsModel();
})();
