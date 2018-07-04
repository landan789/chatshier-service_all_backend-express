module.exports = (function() {
    // const ECPayPayment = require('ecpay_payment_nodejs');
    // const ECPayInvoice = require('ecpay_invoice_nodejs');
    const ECPayPayment = require('../third_party/ecpay_payment_nodejs');
    const ECPayInvoice = require('../third_party/ecpay_invoice_nodejs');

    const ecpayPayment = new ECPayPayment();
    const ecpayInvoice = new ECPayInvoice();

    class ECPayHelper {
        constructor() {
            this.paymentHelper.op_mode = 'Test'; // Test or Production

            // 由自己自行設定 SDK 內的忽略支付清單
            // 支援的支付類型: 'Credit', 'WebATM', 'ATM', 'CVS', 'BARCODE', 'AndroidPay'
            this.paymentHelper.ignore_payment = ['ATM', 'CVS', 'BARCODE', 'AndroidPay'];
        }

        get paymentClient() {
            return ecpayPayment.payment_client;
        }

        get paymentHelper() {
            return this.paymentClient.helper;
        }

        get invoiceClient() {
            return ecpayInvoice.invoice_client;
        }

        get invoiceHelper() {
            return this.invoiceClient.helper;
        }

        /**
         * @param {string} merchantId
         * @param {string} paymentHashKey
         * @param {string} paymentHashIV
         * @param {string} [invoiceHashKey='']
         * @param {string} [invoiceHashIV='']
         */
        setMerchant(merchantId, paymentHashKey, paymentHashIV, invoiceHashKey = '', invoiceHashIV = '') {
            this.paymentHelper.merc_id = this.invoiceHelper.merc_id = merchantId;
            this.paymentHelper.hkey = paymentHashKey;
            this.paymentHelper.hiv = paymentHashIV;

            invoiceHashKey && (this.invoiceHelper.hkey = invoiceHashKey);
            invoiceHashIV && (this.invoiceHelper.hiv = invoiceHashIV);
        }

        /**
         * 將時間轉換為 ECPay 交易時間字串格式 YYYY-MM-DD hh:mm:ss
         * @param {Date} datetime
         */
        datetimeToTradeDate(datetime) {
            let leadZero = (i) => (i < 10 ? '0' : '') + i;
            let YYYY = datetime.getFullYear();
            let MM = leadZero(datetime.getMonth() + 1);
            let DD = leadZero(datetime.getDate());
            let hh = leadZero(datetime.getHours());
            let mm = leadZero(datetime.getMinutes());
            let ss = leadZero(datetime.getSeconds());
            return YYYY + '/' + MM + '/' + DD + ' ' + hh + ':' + mm + ':' + ss;
        }
    }

    return new ECPayHelper();
})();
