module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

    const appsPaymentsMdl = require('../models/apps_payments');

    class AppsPaymentsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsPaymentsMdl.find(appIds).then((appsPayments) => {
                    if (!appsPayments) {
                        return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsPayments);
                });
            }).then((appsPayments) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsPayments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let paymentId = req.params.paymentid;

            return this.appsRequestVerify(req).then(() => {
                return appsPaymentsMdl.find(appId, paymentId).then((appsPayments) => {
                    if (!(appsPayments && appsPayments[appId])) {
                        return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsPayments);
                });
            }).then((appsPayments) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsPayments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let postTikeck = {
                type: req.body.type || '',
                merchantId: req.body.merchantId || '',
                hashKey: req.body.hashKey || '',
                hashIV: req.body.hashIV || '',
                canIssueInvoice: !!req.body.canIssueInvoice,
                invoiceMerchantId: req.body.invoiceMerchantId || '',
                invoiceHashKey: req.body.invoiceHashKey || '',
                invoiceHashIV: req.body.invoiceHashIV || ''
            };

            return this.appsRequestVerify(req).then(() => {
                return appsPaymentsMdl.insert(appId, postTikeck).then((appsPayments) => {
                    if (!(appsPayments && appsPayments[appId])) {
                        return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsPayments);
                });
            }).then((data) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let paymentId = req.params.paymentid;

            let putTikcket = {};
            ('string' === typeof req.body.type) && (putTikcket.type = req.body.type);
            ('string' === typeof req.body.merchantId) && (putTikcket.merchantId = req.body.merchantId);
            ('string' === typeof req.body.hashKey) && (putTikcket.hashKey = req.body.hashKey);
            ('string' === typeof req.body.hashIV) && (putTikcket.hashIV = req.body.hashIV);
            (undefined !== req.body.canIssueInvoice) && (putTikcket.canIssueInvoice = !!req.body.canIssueInvoice);
            ('string' === typeof req.body.invoiceMerchantId) && (putTikcket.invoiceMerchantId = req.body.invoiceMerchantId);
            ('string' === typeof req.body.invoiceHashKey) && (putTikcket.invoiceHashKey = req.body.invoiceHashKey);
            ('string' === typeof req.body.invoiceHashIV) && (putTikcket.invoiceHashIV = req.body.invoiceHashIV);

            return this.appsRequestVerify(req).then(() => {
                if (!paymentId) {
                    return Promise.reject(ERROR.APP_PAYMENT_PAYMENTID_WAS_EMPTY);
                }
                return appsPaymentsMdl.find(appId);
            }).then((appPayments) => {
                if (!(appPayments && appPayments[appId])) {
                    return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                // 判斷 payments 中是否有目前 paymentId
                let payments = appPayments[appId].payments;
                if (!payments[paymentId]) {
                    return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                return appsPaymentsMdl.update(appId, paymentId, putTikcket).then((appsPayments) => {
                    if (!(appsPayments && appsPayments[appId])) {
                        return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsPayments);
                });
            }).then((appsPayments) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsPayments
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let paymentId = req.params.paymentid;

            return this.appsRequestVerify(req).then(() => {
                if (!paymentId) {
                    return Promise.reject(ERROR.APP_PAYMENT_PAYMENTID_WAS_EMPTY);
                }
                // 取得目前 appId 下所有 payments
                return appsPaymentsMdl.find(appId);
            }).then((appPayments) => {
                if (!(appPayments && appPayments[appId])) {
                    return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                // 判斷 payments 中是否有目前 paymentId
                let payments = appPayments[appId].payments;
                if (!payments[paymentId]) {
                    return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                return appsPaymentsMdl.remove(appId, paymentId).then((appsPayments) => {
                    if (!(appsPayments && appsPayments[appId])) {
                        return Promise.reject(ERROR.APP_PAYMENT_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsPayments);
                });
            }).then((appsPayments) => {
                let json = {
                    status: 1,
                    msg: SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsPayments
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsPaymentsController();
})();
