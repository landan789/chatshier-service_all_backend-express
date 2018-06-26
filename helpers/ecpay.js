module.exports = (function() {
    const ECPayPayment = require('ecpay_payment_nodejs');
    const ecpay = new ECPayPayment();

    class ECPayHelper {
        constructor() {
            this.paymentHelper.op_mode = 'Test'; // Test or Production

            // 由自己自行設定 SDK 內的忽略支付清單
            // 支援的支付類型: 'Credit', 'WebATM', 'ATM', 'CVS', 'BARCODE', 'AndroidPay'
            this.paymentHelper.ignore_payment = ['ATM', 'CVS', 'BARCODE', 'AndroidPay'];
        }

        get paymentClient() {
            return ecpay.payment_client;
        }

        get paymentHelper() {
            return ecpay.payment_client.helper;
        }

        setMerchant(merchantId, hashKey, hashIV) {
            this.paymentHelper.merc_id = merchantId;
            this.paymentHelper.hkey = hashKey;
            this.paymentHelper.hiv = hashIV;
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
