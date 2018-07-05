module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    const SOCKET_EVENTS = require('../config/socket-events');
    const chatshierCfg = require('../config/chatshier');

    const cipherHlp = require('../helpers/cipher');
    const spgatewayHlp = require('../helpers/spgateway');
    const ecpayHlp = require('../helpers/ecpay');
    const socketHlp = require('../helpers/socket');
    const paymentsLog = require('../logs/payments');
    const botSvc = require('../services/bot');

    const appsMdl = require('../models/apps');
    const appsPaymentsMdl = require('../models/apps_payments');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    const appsChatroomsMessagesMdl = require('../models/apps_chatrooms_messages');
    const ordersMdl = require('../models/orders');

    const CHATSHIER = 'CHATSHIER';

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
                hasRequestInvoice: req.body.hasRequestInvoice
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
                        ecpayHlp.setPaymentMerchant(payment.merchantId, payment.hashKey, payment.hashIV);

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

                        plainHtml = ecpayHlp.paymentClient.aio_check_out_all(params, {});
                        break;
                    case SPGATEWAY:
                        /** @type {Spgateway.Payment.TradeInformation} */
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

            // 交易失敗，不需要處理
            if ('1' !== paymentResult.RtnCode) {
                return res.sendStatus(200);
            }

            let merchantId = paymentResult.MerchantID;
            return appsPaymentsMdl.findByMerchantId(merchantId).then((appsPayments) => {
                if (!appsPayments) {
                    return Promise.reject(API_ERROR.APP_PAYMENT_FAILED_TO_FIND);
                }

                let appId = Object.keys(appsPayments).shift() || '';
                let paymentId = Object.keys(appsPayments[appId].payments).shift() || '';
                return Promise.resolve(appsPayments[appId].payments[paymentId]);
            }).then((payment) => {
                ecpayHlp.setPaymentMerchant(payment.merchantId, payment.hashKey, payment.hashIV);
                let checkMacValue = ecpayHlp.paymentHelper.gen_chk_mac_value(params);
                let isCheckMacValueVaild = checkMacValue === paymentResult.CheckMacValue;

                // 驗證碼正確，回應 200 OK
                // 驗證碼不正確，回應 400 Bad Request
                !res.headersSent && res.sendStatus(isCheckMacValueVaild ? 200 : 400);
                if (!isCheckMacValueVaild) {
                    return Promise.reject(new Error('400 Bad Request'));
                }

                let tradeId = paymentResult.MerchantTradeNo;
                return Promise.all([
                    Promise.resolve(payment),
                    this._paidOrder(tradeId)
                ]);
            }).then(([ payment, order ]) => {
                // 此訂單沒有建立發票關聯 ID 則不需要開立發票
                if (!(order && order.invoiceId)) {
                    return Promise.resolve(void 0);
                }

                let orderId = order._id;
                return ecpayHlp.issueInvoice(order, payment.invoiceMerchantId, payment.invoiceHashKey, payment.invoiceHashIV).then((invoice) => {
                    let putOrder = {
                        isInvoiceIssued: true,
                        invoiceNumber: invoice.InvoiceNumber,
                        invoiceRandomNumber: invoice.RandomNumber
                    };
                    return ordersMdl.update(orderId, putOrder);
                }).then((orders) => {
                    if (!(orders && orders[orderId])) {
                        return Promise.reject(API_ERROR.ORDER_FAILED_TO_UPDATE);
                    }

                    let _order = orders[orderId];
                    let replyText = (
                        '=== 支付成功 ===\n' +
                        '感謝您！'
                    );

                    if (_order.isInvoiceIssued && _order.invoiceNumber) {
                        replyText += (
                            '\n\n已為你開立電子發票: ' + _order.invoiceNumber +
                            '\n如需索取紙本，請留言。'
                        );
                    }
                    return this._replyToConsumer(order.app_id, order.consumerUid, replyText);
                });
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postSpgatewayResult(req, res) {
            this._recordLog(req);

            /** @type {Spgateway.Payment.TradeResponse} */
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
                /** @type {Spgateway.Payment.ResultResponse} */
                let resultInfo = spgatewayHlp.decryptStrToJson(paymentResult.TradeInfo, payment.hashKey, payment.hashIV);
                let tradeId = (resultInfo.Result && resultInfo.Result.MerchantOrderNo) || '';

                return Promise.all([
                    Promise.resolve(payment),
                    this._paidOrder(tradeId)
                ]);
            }).then(([ payment, order ]) => {
                // 此訂單沒有建立發票關聯 ID 則不需要開立發票
                if (!(order && order.invoiceId)) {
                    return Promise.resolve(void 0);
                }

                // 智付通 Spgateway 的電子發票是獨立開來的，使用 智付寶 Pay2Go 電子發票平台
                // 因此在智付通支付完成後，必須再使用 Pay2Go 的電子發票 API 來開立發票
                let orderId = order._id;
                return spgatewayHlp.issueInvoice(order, payment.invoiceMerchantId, payment.invoiceHashKey, payment.invoiceHashIV).then((invoice) => {
                    let putOrder = {
                        isInvoiceIssued: true,
                        invoiceNumber: invoice.InvoiceNumber,
                        invoiceRandomNumber: invoice.RandomNum
                    };
                    return ordersMdl.update(orderId, putOrder);
                }).then((orders) => {
                    if (!(orders && orders[orderId])) {
                        return Promise.reject(API_ERROR.ORDER_FAILED_TO_UPDATE);
                    }

                    let _order = orders[orderId];
                    let replyText = (
                        '=== 支付成功 ===\n' +
                        '感謝您！'
                    );

                    if (_order.isInvoiceIssued && _order.invoiceNumber) {
                        replyText += (
                            '\n\n已為你開立電子發票: ' + _order.invoiceNumber +
                            '\n如需索取紙本，請留言。'
                        );
                    }
                    return this._replyToConsumer(order.app_id, order.consumerUid, replyText);
                });
            }).then(() => {
                return res.sendStatus(200);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        /**
         * @param {string} appId
         * @param {string} platformUid
         * @param {string} replyText
         */
        _replyToConsumer(appId, platformUid, replyText) {
            /** @type {Chatshier.Models.App} */
            let app;
            /** @type {string} */
            let chatroomId;
            /** @type {Chatshier.Models.Chatroom} */
            let chatroom;

            let message = {
                from: 'SYSTEM',
                type: 'text',
                text: replyText,
                messager_id: ''
            };

            return appsMdl.find(appId).then((apps) => {
                if (!(apps && apps[appId])) {
                    return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                }
                return Promise.resolve(apps[appId]);
            }).then((_app) => {
                app = _app;
                return botSvc.pushMessage(platformUid, message, void 0, appId, app);
            }).then(() => {
                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid, false);
            }).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                }

                chatroomId = Object.keys(appsChatroomsMessagers[appId].chatrooms).shift() || '';
                chatroom = appsChatroomsMessagers[appId].chatrooms[chatroomId];
                return appsChatroomsMessagesMdl.insert(appId, chatroomId, [message]);
            }).then((appsChatroomsMessages) => {
                if (!(appsChatroomsMessages && appsChatroomsMessages[appId])) {
                    return Promise.reject(API_ERROR.APP_CHATROOM_MESSAGES_FAILED_TO_INSERT);
                }
                return Promise.resolve(appsChatroomsMessages);
            }).then((appsChatroomsMessages) => {
                let messages = Object.values(appsChatroomsMessages[appId].chatrooms[chatroomId].messages);

                return appsChatroomsMessagersMdl.find(appId, chatroomId, void 0, CHATSHIER).then((appsChatroomsMessagers) => {
                    if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                        return Promise.reject(API_ERROR.APP_CHATROOMS_MESSAGERS_FAILED_TO_FIND);
                    }

                    let _chatroom = appsChatroomsMessagers[appId].chatrooms[chatroomId];
                    let _messagers = _chatroom.messagers;
                    let recipientUserIds = Object.keys(_messagers).map((messagerId) => {
                        return _messagers[messagerId].platformUid;
                    });

                    /** @type {ChatshierChatSocketBody} */
                    let messagesToSend = {
                        app_id: appId,
                        type: app.type,
                        chatroom_id: chatroomId,
                        chatroom: chatroom,
                        senderUid: '',
                        recipientUid: platformUid,
                        messages: messages
                    };
                    return socketHlp.emitToAll(recipientUserIds, SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, messagesToSend);
                });
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
         * @returns {Promise<Chatshier.Models.Order>}
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
                    invoiceId: params.hasRequestInvoice ? cipherHlp.generateRandomHex(30) : '',
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

        /**
         * @param {string} tradeId
         * @param {any} [putOrder]
         * @returns {Promise<Chatshier.Models.Order>}
         */
        _paidOrder(tradeId, putOrder) {
            putOrder = putOrder || {};
            putOrder.isPaid = true;

            return ordersMdl.findByTradeId(tradeId).then((orders) => {
                if (!(orders && orders[tradeId])) {
                    return Promise.reject(API_ERROR.ORDER_FAILED_TO_FIND);
                }

                let orderId = orders[tradeId]._id;
                return ordersMdl.update(orderId, putOrder).then((orders) => {
                    if (!(orders && orders[orderId])) {
                        return Promise.reject(API_ERROR.ORDER_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(orders[orderId]);
                });
            });
        }
    }

    return new PaymentController();
})();
