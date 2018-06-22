module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    const cipherHlp = require('../helpers/cipher');

    const appsPaymentsMdl = require('../models/apps_payments');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    const consumersMdl = require('../models/consumers');

    // const ECPayPayment = require('ecpay_payment_nodejs');
    const ECPayPayment = require('../third_party/ECPAY_Payment_node_js/index');
    const ecpay = new ECPayPayment();

    const retrieveServerAddr = (req) => {
        return req.protocol + '://' + req.hostname + (req.subdomains.includes('fea') ? ':3002' : '');
    };

    /**
     * 將時間轉換為 ECPay 交易時間字串格式
     * @param {Date} datetime
     */
    const datetimeToTradeDate = (datetime) => {
        let leadZero = (i) => (i < 10 ? '0' : '') + i;
        let YYYY = datetime.getFullYear();
        let MM = leadZero(datetime.getMonth() + 1);
        let DD = leadZero(datetime.getDate());
        let hh = leadZero(datetime.getHours());
        let mm = leadZero(datetime.getMinutes());
        let ss = leadZero(datetime.getSeconds());
        return YYYY + '/' + MM + '/' + DD + ' ' + hh + ':' + mm + ':' + ss;
    };

    class PaymentController extends ControllerCore {
        constructor() {
            super();
            this.getECPayAioCheckOutAll = this.getECPayAioCheckOutAll.bind(this);
            this.postECPayPaymentResult = this.postECPayPaymentResult.bind(this);
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
                res.sendStatus(400);
                return;
            }

            if (Date.now() > timestamp + (5 * 60 * 1000)) {
                res.send('<script>window.alert("支付期間已過期，請重新操作")</script>');
                return;
            }

            // let serverAddr = retrieveServerAddr(req);
            let serverAddr = 'https://3bd160b3.ngrok.io';

            let params = {
                MerchantTradeNo: cipherHlp.generateRandomHex(20), // 請帶 20 碼 uid, ex: f0a0d7e9fae1bb72bc93
                MerchantTradeDate: datetimeToTradeDate(new Date()), // ex: 2017/02/13 15:45:30
                TotalAmount: TotalAmount,
                TradeDesc: TradeDesc,
                ItemName: ItemName,
                ReturnURL: serverAddr + '/payment/ecpay/payment_result'
                // ChooseSubPayment: '',
                // OrderResultURL: 'http://192.168.0.1/payment_result',
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
                // RelateNumber: 'PLEASE MODIFY',  //請帶30碼uid ex: SJDFJGH24FJIL97G73653XM0VOMS4K
                // CustomerID: 'MEM_0000001',  //會員編號
                // CustomerIdentifier: '',   //統一編號
                // CustomerName: '測試買家',
                // CustomerAddr: '測試用地址',
                // CustomerPhone: '0123456789',
                // CustomerEmail: 'johndoe@test.com',
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

            let html = ecpay.payment_client.aio_check_out_all(params, invoiceParams);
            res.send(html);
        }

        postECPayPaymentResult(req, res) {
            /** @type {ECPay.Payment.Result} */
            let paymentResult = req.body;
            console.log(paymentResult);

            let params = Object.assign({}, paymentResult);
            delete params.CheckMacValue;

            let checkMacValue = ecpay.payment_client.helper.gen_chk_mac_value(params);
            let isCheckMacValueVaild = checkMacValue === paymentResult.CheckMacValue;
            console.log('isCheckMacValueVaild: ' + isCheckMacValueVaild);

            res.sendStatus(isCheckMacValueVaild ? 200 : 400);
        }
    }

    return new PaymentController();
})();
