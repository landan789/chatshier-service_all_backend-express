module.exports = (function() {
    const ECPayPayment = require('ecpay_payment_nodejs');
    const ECPayInvoice = require('ecpay_invoice_nodejs');
    const ecpayPayment = new ECPayPayment();
    const ecpayInvoice = new ECPayInvoice();

    class ECPayHelper {
        constructor() {
            this.paymentHelper.op_mode = 'Production';

            // 由自己自行設定 SDK 內的忽略支付清單
            // 支援的支付類型: 'Credit', 'WebATM', 'ATM', 'CVS', 'BARCODE', 'AndroidPay'
            this.paymentHelper.ignore_payment = ['ATM', 'CVS', 'BARCODE', 'AndroidPay'];
        }

        /**
         * @param {'Test' | 'Production'} value
         */
        set mode(value) {
            this.paymentHelper.op_mode = value;
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
         * @param {string} hashKey
         * @param {string} hashIV
         */
        setPaymentMerchant(merchantId, hashKey, hashIV) {
            this.paymentHelper.merc_id = merchantId;
            this.paymentHelper.hkey = hashKey;
            this.paymentHelper.hiv = hashIV;
        }

        /**
         * @param {Chatshier.Models.Order} order
         * @param {string} merchantId
         * @param {string} hashKey
         * @param {string} hashIV
         * @returns {Promise<ECPay.Invoice.IssueResponse>}
         */
        issueInvoice(order, merchantId, hashKey, hashIV) {
            /** @type {ECPay.Invoice.IssueParameters} */
            let invoiceParams = {
                TimeStamp: '' + Math.floor(Date.now() / 1000),
                MerchantID: merchantId,
                RelateNumber: order.invoiceId,
                CustomerID: '',
                CustomerIdentifier: order.taxId,
                CustomerName: order.payerName,
                CustomerAddr: order.payerAddress,
                CustomerPhone: order.payerPhone,
                CustomerEmail: order.payerEmail,
                ClearanceMark: '',
                TaxType: '1',
                CarruerType: '',
                CarruerNum: '',
                Donation: '2',
                LoveCode: '',
                Print: '1',
                SalesAmount: '' + order.tradeAmount,
                InvoiceRemark: '',
                ItemName: order.products.map((product) => product.name).join('|'),
                ItemCount: order.products.map((product) => product.count).join('|'),
                ItemWord: order.products.map((product) => product.unit).join('|'),
                ItemPrice: order.products.map((product) => product.unitPrice).join('|'),
                ItemAmount: order.products.map((product) => product.count * product.unitPrice).join('|'),
                ItemTaxType: '',
                ItemRemark: order.products.map((product) => product.remark).join('|'),
                InvType: '07',
                vat: '1'
            };

            this.invoiceHelper.merc_id = merchantId;
            this.invoiceHelper.hkey = hashKey;
            this.invoiceHelper.hiv = hashIV;
            return this.invoiceClient.ecpay_invoice_issue(invoiceParams).then((resQuery) => {
                /** @type {ECPay.Invoice.IssueResponse} */
                let issueResponse = this._queryStringToJSON(resQuery);
                if ('1' !== issueResponse.RtnCode) {
                    return Promise.reject(new Error(issueResponse.RtnMsg));
                }
                return Promise.resolve(issueResponse);
            });
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

        /**
         * @param {string} queryString
         * @returns {any}
         */
        _queryStringToJSON(queryString) {
            return queryString.split('&').reduce((output, str) => {
                let splits = str.split('=');
                if (splits[0]) {
                    output[splits[0]] = splits[1] || '';
                }
                return output;
            }, {});
        }
    }

    return new ECPayHelper();
})();
