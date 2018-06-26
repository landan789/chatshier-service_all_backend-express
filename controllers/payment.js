module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    const chatshierCfg = require('../config/chatshier');
    const cipherHlp = require('../helpers/cipher');
    const spgatewayHlp = require('../helpers/spgateway');
    const ecpayHlp = require('../helpers/ecpay');
    const paymentsLog = require('../logs/payments');

    const appsPaymentsMdl = require('../models/apps_payments');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    const ordersMdl = require('../models/orders');

    class PaymentController extends ControllerCore {
        constructor() {
            super();
            this.getECPayAioCheckOutAll = this.getECPayAioCheckOutAll.bind(this);
            this.postECPayPaymentResult = this.postECPayPaymentResult.bind(this);
            this.getSpgatewayMultiPaymentGateway = this.getSpgatewayMultiPaymentGateway.bind(this);
            this.postSpgatewayPaymentResult = this.postSpgatewayPaymentResult.bind(this);
        }

        getECPayAioCheckOutAll(req, res) {
            let appId = req.query.aid;
            let consumerUid = req.query.cid;
            let paymentId = req.query.pid;
            let timestamp = parseInt(req.query.ts, 10);

            let TotalAmount = decodeURIComponent(req.query.amount);
            let TradeDesc = decodeURIComponent(req.query.desc);
            let ItemName = decodeURIComponent(req.query.iname);

            // 以上資料缺一不可
            if (!(appId && consumerUid && paymentId && TotalAmount && TradeDesc && ItemName && !isNaN(timestamp))) {
                return res.sendStatus(400);
            }

            if (Date.now() > timestamp + (10 * 60 * 1000)) {
                return res.send('<script>window.alert("付款期限已過期，請重新操作")</script>');
            }

            let serverAddr = this._retrieveServerAddr(req);

            return Promise.all([
                appsPaymentsMdl.find(appId, paymentId),
                this._createOrder(appId, consumerUid, ItemName, TotalAmount, TradeDesc)
            ]).then(([ appsPayments, order ]) => {
                if (!(appsPayments && appsPayments[appId])) {
                    return Promise.reject(API_ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                let params = {
                    MerchantTradeNo: order.tradeId, // 請帶 20 碼 uid, ex: f0a0d7e9fae1bb72bc93
                    MerchantTradeDate: ecpayHlp.datetimeToTradeDate(new Date(order.tradeDate)), // ex: 2017/02/13 15:45:30
                    TotalAmount: order.tradeAmount,
                    TradeDesc: order.tradeDescription,
                    ItemName: ItemName,
                    ReturnURL: serverAddr + '/payment/ecpay/payment-result'
                    // ChooseSubPayment: '',
                    // OrderResultURL: serverAddr + 'payment/ecpay/order-result',
                    // NeedExtraPaidInfo: '1',
                    // ClientBackURL: 'https://www.google.com',
                    // ItemURL: 'http://item.test.tw',
                    // Remark: '交易備註',
                    // HoldTradeAMT: '1',
                    // StoreID: '',
                    // CustomField1: '',
                    // CustomField2: '',
                    // CustomField3: '',
                    // CustomField4: ''
                };

                // 若要測試開立電子發票，請將 invoiceParams 內的"所有"參數取消註解 //
                let invoiceParams = {
                    // RelateNumber: order.invoiceId, // 請帶 30 碼 uid ex: SJDFJGH24FJIL97G73653XM0VOMS4K
                    // CustomerID: consumerUid, // 會員編號
                    // CustomerIdentifier: order.taxId, // 統一編號
                    // CustomerName: order.payerName,
                    // CustomerAddr: order.payerAddress,
                    // CustomerPhone: order.payerPhone,
                    // CustomerEmail: order.payerEmail,
                    // ClearanceMark: '2',
                    // TaxType: '1',
                    // CarruerType: '',
                    // CarruerNum: '',
                    // Donation: '2',
                    // LoveCode: '',
                    // Print: '1',
                    // InvoiceItemName: '測試商品1|測試商品2',
                    // InvoiceItemCount: '2|3',
                    // InvoiceItemWord: '個|包',
                    // InvoiceItemPrice: '35|10',
                    // InvoiceItemTaxType: '1|1',
                    // InvoiceRemark: '測試商品1的說明|測試商品2的說明',
                    // DelayDay: '0',
                    // InvType: '07'
                };

                // 由於 ECPay 的 SDK 計算驗證碼的 HashKey 與 HashIV 儲存在程式當中，而不是作為參數傳入
                // 因此必須更換 ECPay 的參數數值
                let payment = appsPayments[appId].payments[paymentId];
                ecpayHlp.setMerchant(payment.merchantId, payment.hashKey, payment.hashIV);

                let html = ecpayHlp.paymentClient.aio_check_out_all(params, invoiceParams);
                return res.send(html);
            }).then(() => {
                let suc = { msg: 'OK' };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getSpgatewayMultiPaymentGateway(req, res) {
            let appId = req.query.aid;
            let consumerUid = req.query.cid;
            let paymentId = req.query.pid;
            let timestamp = parseInt(req.query.ts, 10);

            let TotalAmount = decodeURIComponent(req.query.amount);
            let TradeDesc = decodeURIComponent(req.query.desc);
            let ItemName = decodeURIComponent(req.query.iname);

            // 以上資料缺一不可
            if (!(appId && consumerUid && paymentId && TotalAmount && TradeDesc && ItemName && !isNaN(timestamp))) {
                return res.sendStatus(400);
            }

            if (Date.now() > timestamp + (10 * 60 * 1000)) {
                return res.send('<script>window.alert("付款期限已過期，請重新操作")</script>');
            }

            let serverAddr = this._retrieveServerAddr(req);
            return Promise.all([
                this._createOrder(appId, consumerUid, ItemName, TotalAmount, TradeDesc),
                appsPaymentsMdl.find(appId, paymentId).then(() => {
                    return appsPaymentsMdl.find(appId, paymentId).then((appsPayments) => {
                        if (!(appsPayments && appsPayments[appId])) {
                            return Promise.reject(API_ERROR.APP_PAYMENT_FAILED_TO_FIND);
                        }
                        return Promise.resolve(appsPayments[appId].payments[paymentId]);
                    });
                })
            ]).then(([ order, payment ]) => {
                /**
                 * @type {Spgateway.Payment.TradeInformation}
                 */
                let tradeInfo = {
                    MerchantID: payment.merchantId,
                    MerchantOrderNo: order.tradeId,
                    RespondType: 'JSON',
                    TimeStamp: '' + Math.floor(Date.now() / 1000),
                    Version: '1.4',
                    LangType: 'zh-tw',
                    Amt: order.tradeAmount,
                    ItemDesc: order.tradeDescription,
                    NotifyURL: serverAddr + '/payment/spgateway/payment-result',
                    Email: order.payerEmail,
                    EmailModify: 0,
                    LoginType: 0
                };

                let html = spgatewayHlp.generateMPGFormHtml(tradeInfo, payment.hashKey, payment.hashIV);
                return res.send(html);
            });
        }

        postECPayPaymentResult(req, res) {
            this._recordLog(req);

            /** @type {ECPay.Payment.Result} */
            let paymentResult = req.body;
            let params = Object.assign({}, paymentResult);
            delete params.CheckMacValue;

            let merchantId = paymentResult.MerchantID;
            return appsPaymentsMdl.findByMerchantId(merchantId).then((appsPayments) => {
                if (!appsPayments) {
                    return Promise.reject(API_ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                let appId = Object.keys(appsPayments).shift() || '';
                let paymentId = Object.keys(appsPayments[appId].payments).shift() || '';
                return Promise.resolve(appsPayments[appId].payments[paymentId]);
            }).then((payment) => {
                ecpayHlp.setMerchant(payment.merchantId, payment.hashKey, payment.hashIV);
                let checkMacValue = ecpayHlp.paymentHelper.gen_chk_mac_value(params);
                let isCheckMacValueVaild = checkMacValue === paymentResult.CheckMacValue;
                res.sendStatus(isCheckMacValueVaild ? 200 : 400);

                // 交易失敗，暫時不需要更新訂單狀態
                if ('1' !== paymentResult.RtnCode) {
                    return;
                }

                let tradeId = paymentResult.MerchantTradeNo;
                return this._paidOrder(tradeId);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postSpgatewayPaymentResult(req, res) {
            this._recordLog(req);

            /** @type {Spgateway.Payment.Result} */
            let paymentResult = req.body;
            let merchantId = paymentResult.MerchantID;

            return appsPaymentsMdl.findByMerchantId(merchantId).then((appsPayments) => {
                if (!appsPayments) {
                    return Promise.reject(API_ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                let appId = Object.keys(appsPayments).shift() || '';
                let paymentId = Object.keys(appsPayments[appId].payments).shift() || '';
                return Promise.resolve(appsPayments[appId].payments[paymentId]);
            }).then((payment) => {
                /** @type {Spgateway.Payment.ResultInformation} */
                let resultInfo = spgatewayHlp.decryptTradeInfo(paymentResult.TradeInfo, payment.hashKey, payment.hashIV);
                let tradeId = resultInfo.MerchantOrderNo;

                return this._paidOrder(tradeId);
            }).then(() => {
                return res.sendStatus(200);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        _recordLog(req) {
            let paymentNotify = {
                url: req.hostname + req.originalUrl,
                body: req.body
            };
            return paymentsLog.start(paymentNotify);
        }

        _retrieveServerAddr(req) {
            // let serverAddr = req.protocol + '://' + req.hostname + (req.subdomains.includes('fea') ? ':' + chatshierCfg.API.PORT : '');
            let serverAddr = 'https://3bd160b3.ngrok.io';
            return serverAddr;
        }

        _createOrder(appId, consumerUid, itemName, tradeAmount, tradeDescription) {
            return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, consumerUid).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }

                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                let chatroomId = Object.keys(chatrooms).shift() || '';
                let messager = chatrooms[chatroomId].messagers[consumerUid];

                let order = {
                    app_id: appId,
                    consumerUid: consumerUid,
                    invoiceId: cipherHlp.generateRandomHex(30),
                    taxId: '',
                    commodities: [{
                        name: itemName
                    }],
                    tradeId: cipherHlp.generateRandomHex(20),
                    tradeDate: Date.now(),
                    tradeAmount: parseInt(tradeAmount, 10),
                    tradeDescription: tradeDescription,
                    payerName: messager.namings[consumerUid],
                    payerEmail: messager.email,
                    payerPhone: messager.phone,
                    payerAddress: messager.address
                };

                return ordersMdl.insert(order).then((orders) => {
                    if (!orders) {
                        return Promise.reject(API_ERROR.ORDER_FAILED_TO_INSERT);
                    }

                    let orderId = Object.keys(orders).shift() || '';
                    return Promise.resolve(orders[orderId]);
                });
            });
        }

        _paidOrder(tradeId) {
            return ordersMdl.findByTradeId(tradeId).then((orders) => {
                if (!(orders && orders[tradeId])) {
                    return Promise.resolve();
                }

                let orderId = orders[tradeId]._id;
                let putOrder = {
                    isPaid: true
                };

                return ordersMdl.update(orderId, putOrder).then((orders) => {
                    if (!(orders && orders[tradeId])) {
                        return Promise.resolve(API_ERROR.ORDER_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve();
                });
            });
        }
    }

    return new PaymentController();
})();
