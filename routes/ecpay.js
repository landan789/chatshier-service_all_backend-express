const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');

// const ECPayPayment = require('ecpay_payment_nodejs');
const ECPayPayment = require('../third_party/ECPAY_Payment_node_js/index');
const cipherHlp = require('../helpers/cipher');

const router = express.Router();
const ecpay = new ECPayPayment();

// HTTP body x-www-form-urlencoded parser
// HTTP body 允許 json 格式
// HTTP body form-data parser
router.use(
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json(),
    formData.parse({ autoFiles: true }),
    formData.format(),
    formData.stream(),
    formData.union()
);

const retrieveServerAddr = (req) => {
    return req.protocol + '://' + req.hostname + (req.subdomains.includes('fea') ? ':3002' : '');
};

/**
 * @param {Date} datetime
 */
const datetimeToTradeDate = (datetime) => {
    let fixZero = (i) => (i < 10 ? '0' : '') + i;
    let YYYY = datetime.getFullYear();
    let MM = fixZero(datetime.getMonth() + 1);
    let DD = fixZero(datetime.getDate());
    let hh = fixZero(datetime.getHours());
    let mm = fixZero(datetime.getMinutes());
    let ss = fixZero(datetime.getSeconds());
    return YYYY + '/' + MM + '/' + DD + ' ' + hh + ':' + mm + ':' + ss;
};

router.post('/payment_result', (req, res) => {
    /** @type {ECPay.Payment.Result} */
    let paymentResult = req.body;
    console.log(paymentResult);

    let params = Object.assign({}, paymentResult);
    delete params.CheckMacValue;

    let checkMacValue = ecpay.payment_client.helper.gen_chk_mac_value(params);
    let isCheckMacValueVaild = checkMacValue === paymentResult.CheckMacValue;
    console.log('isCheckMacValueVaild: ' + isCheckMacValueVaild);

    res.sendStatus(isCheckMacValueVaild ? 200 : 400);
});

router.get('/aio_check_out_credit_onetime', (req, res) => {
    // let serverAddr = retrieveServerAddr(req);
    let serverAddr = 'https://3bd160b3.ngrok.io';
    let TotalAmount = '' + req.query.TotalAmount;
    let TradeDesc = req.query.TradeDesc;
    let ItemName = req.query.ItemName;

    let params = {
        MerchantTradeNo: cipherHlp.generateRandomHex(20), // 請帶 20 碼 uid, ex: f0a0d7e9fae1bb72bc93
        MerchantTradeDate: datetimeToTradeDate(new Date()), // ex: 2017/02/13 15:45:30
        TotalAmount: TotalAmount,
        TradeDesc: TradeDesc,
        ItemName: ItemName,
        ReturnURL: serverAddr + '/ecpay/payment_result'
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

    let html = ecpay.payment_client.aio_check_out_credit_onetime(params, invoiceParams);
    res.send(html);
});

module.exports = router;
