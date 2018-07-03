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

    const ECPAY = 'ECPAY';
    const SPGATEWAY = 'SPGATEWAY';

    class PaymentController extends ControllerCore {
        constructor() {
            super();
            this.postSubmit = this.postSubmit.bind(this);
            this.postECPayResult = this.postECPayResult.bind(this);
            this.postSpgatewayResult = this.postSpgatewayResult.bind(this);
        }

        postSubmit(req, res) {
            let appId = req.query.aid;
            let consumerUid = req.query.cid;

            let amount = req.body.amount;
            let tradeDesc = req.body.tradeDescription;
            let itemName = req.body.itemName;

            // 以上資料缺一不可
            if (!(appId && consumerUid && amount && tradeDesc && itemName)) {
                return res.sendStatus(400);
            }

            /** @type {Chatshier.Controllers.PaymentSubmit} */
            let paymentParams = {
                tradeDescription: req.body.tradeDescription,
                itemName: req.body.itemName,
                itemCount: req.body.itemCount,
                itemUnit: req.body.itemUnit,
                itemUnitPrice: req.body.itemUnitPrice,
                itemRemark: req.body.itemRemark,
                amount: req.body.amount,
                payerName: req.body.payerName,
                payerEmail: req.body.payerEmail,
                payerPhone: req.body.payerPhone,
                payerAddress: req.body.payerAddress,
                hasRequestInvoice: req.body.hasRequestInvoice,
                invoiceTitle: req.body.invoiceTitle,
                invoiceAddress: req.body.invoiceAddress
            };

            return Promise.all([
                appsPaymentsMdl.find(appId),
                this._createOrder(appId, consumerUid, paymentParams)
            ]).then(([ appsPayments, order ]) => {
                if (!(appsPayments && appsPayments[appId])) {
                    return Promise.reject(API_ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                let paymentId = Object.keys(appsPayments[appId].payments).shift() || '';
                let payment = appsPayments[appId].payments[paymentId];
                let serverAddr = this._retrieveServerAddr(req);

                let plainHtml = '';
                switch (payment.type) {
                    case ECPAY:
                        // 由於 ECPay 的 SDK 計算驗證碼的 HashKey 與 HashIV 儲存在程式當中，而不是作為參數傳入
                        // 因此必須更換 ECPay 的參數數值
                        ecpayHlp.setMerchant(payment.merchantId, payment.hashKey, payment.hashIV);

                        let params = {
                            MerchantTradeNo: order.tradeId, // 請帶 20 碼 uid, ex: f0a0d7e9fae1bb72bc93
                            MerchantTradeDate: ecpayHlp.datetimeToTradeDate(new Date(order.tradeDate)), // ex: 2017/02/13 15:45:30
                            TotalAmount: '' + order.tradeAmount,
                            TradeDesc: order.tradeDescription,
                            ItemName: itemName,
                            ReturnURL: serverAddr + '/payment/ecpay/result'
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

                        // 若要測試開立電子發票，請將 invoiceParams 內的 "所有" 參數取消註解
                        /** @type {ECPay.Payment.InvoiceParameters | void } */
                        let invoiceParams = paymentParams.hasRequestInvoice ? {
                            RelateNumber: order.invoiceId, // 請帶 30 碼 uid ex: SJDFJGH24FJIL97G73653XM0VOMS4K
                            CustomerID: '', // 會員編號
                            CustomerIdentifier: order.taxId, // 統一編號
                            CustomerName: order.payerName,
                            CustomerAddr: order.payerAddress,
                            CustomerPhone: order.payerPhone,
                            CustomerEmail: order.payerEmail,
                            ClearanceMark: '2',
                            TaxType: '1',
                            CarruerType: '',
                            CarruerNum: '',
                            Donation: '2',
                            LoveCode: '',
                            Print: '0',
                            InvoiceItemName: order.commodities.map((commodity) => commodity.name).join('|'),
                            InvoiceItemCount: order.commodities.map((commodity) => commodity.count).join('|'),
                            InvoiceItemWord: order.commodities.map((commodity) => commodity.unit).join('|'),
                            InvoiceItemPrice: order.commodities.map((commodity) => commodity.unitPrice).join('|'),
                            InvoiceItemTaxType: order.commodities.map(() => '1').join('|'),
                            InvoiceRemark: order.commodities.map((commodity) => commodity.remark).join('|'),
                            DelayDay: '0',
                            InvType: '07'
                        } : void 0;

                        plainHtml = ecpayHlp.paymentClient.aio_check_out_all(params, invoiceParams || {});
                        break;
                    case SPGATEWAY:
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
                            NotifyURL: serverAddr + '/payment/spgateway/result',
                            Email: order.payerEmail,
                            EmailModify: 0,
                            LoginType: 0
                        };

                        plainHtml = spgatewayHlp.generateMPGFormHtml(tradeInfo, payment.hashKey, payment.hashIV);
                        break;
                    default:
                        break;
                }

                return res.send(plainHtml);
            });
        }

        postECPayResult(req, res) {
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

        postSpgatewayResult(req, res) {
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
            let serverAddr = req.protocol + '://' + req.hostname + (req.subdomains.includes('fea') ? ':' + chatshierCfg.API.PORT : '');
            return serverAddr;
        }

        /**
         * @param {string} appId
         * @param {string} consumerUid
         * @param {Chatshier.Controllers.PaymentSubmit} params
         */
        _createOrder(appId, consumerUid, params) {
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
                    invoiceTitle: params.invoiceTitle || '',
                    invoiceAddress: params.invoiceAddress || '',
                    taxId: params.taxId || '',
                    commodities: [{
                        name: params.itemName,
                        description: '',
                        count: params.itemCount,
                        unitPrice: params.itemUnitPrice,
                        unit: params.itemUnit,
                        remark: params.itemRemark
                    }],
                    tradeId: cipherHlp.generateRandomHex(20),
                    tradeDate: Date.now(),
                    tradeAmount: 'string' === typeof params.amount ? parseInt(params.amount, 10) : params.amount,
                    tradeDescription: params.tradeDescription,
                    payerName: params.payerName || messager.namings[consumerUid],
                    payerEmail: params.payerEmail || messager.email,
                    payerPhone: params.payerPhone || messager.phone,
                    payerAddress: params.payerAddress || messager.address
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
                        return Promise.reject(API_ERROR.ORDER_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve();
                });
            });
        }
    }

    return new PaymentController();
})();
