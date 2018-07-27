module.exports = (function() {
    const ModelCore = require('../cores/model');
    const ORDERS = 'orders';

    class OrdersModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(ORDERS, ModelCore.OrdersSchema);
        }

        /**
         * @param {string | string[]} [orderIds]
         * @param {(orders: Chatshier.Models.Orders | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Orders | null>}
         */
        find(orderIds, callback) {
            if (orderIds && !(orderIds instanceof Array)) {
                orderIds = [orderIds];
            }

            let query = {
                isDeleted: false
            };

            if (orderIds instanceof Array) {
                query['_id'] = {
                    $in: orderIds.map((orderId) => this.Types.ObjectId(orderId))
                };
            }

            return this.Model.find(query).sort({ createdTime: -1 }).then((results) => {
                let orders = {};
                if (0 !== results.length) {
                    orders = this.toObject(results);
                }
                return Promise.resolve(orders);
            }).then((orders) => {
                ('function' === typeof callback) && callback(orders);
                return orders;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} tradeId
         * @param {(orders: Chatshier.Models.Orders | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Orders | null>}
         */
        findByTradeId(tradeId, callback) {
            let query = {
                isDeleted: false,
                tradeId: tradeId
            };

            return this.Model.find(query).then((results) => {
                let orders = {};
                if (0 !== results.length) {
                    orders = this.toObject(results, 'tradeId');
                }
                return Promise.resolve(orders);
            }).then((orders) => {
                ('function' === typeof callback) && callback(orders);
                return orders;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {any} postOrder
         * @param {(orders: Chatshier.Models.Orders | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Orders | null>}
         */
        insert(postOrder, callback) {
            postOrder = postOrder || {};
            postOrder.createdTime = postOrder.updatedTime = Date.now();

            let _postOrder = new this.Model(postOrder);
            return _postOrder.save().then((order) => {
                let orderId = order._id;
                return this.find(orderId);
            }).then((orders) => {
                ('function' === typeof callback) && callback(orders);
                return orders;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} orderId
         * @param {any} putOrder
         * @param {(orders: Chatshier.Models.Orders | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Orders | null>}
         */
        update(orderId, putOrder, callback) {
            putOrder = putOrder || {};
            putOrder.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(orderId)
            };

            let order = { $set: {} };
            for (let prop in putOrder) {
                order.$set[prop] = putOrder[prop];
            }

            return this.Model.update(query, order).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(orderId);
            }).then((orders) => {
                ('function' === typeof callback) && callback(orders);
                return orders;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} orderId
         * @param {(orders: Chatshier.Models.Orders | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Orders | null>}
         */
        remove(orderId, callback) {
            let putOrder = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(orderId)
            };

            let order = { $set: {} };
            for (let prop in putOrder) {
                order.$set[prop] = putOrder[prop];
            }

            return this.Model.update(query, order).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }

                return this.Model.findOne(query).lean().then((order) => {
                    return this.toObject(order);
                });
            }).then((orders) => {
                ('function' === typeof callback) && callback(orders);
                return orders;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new OrdersModel();
})();
