const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');

const paymentCtl = require('../controllers/payment');
const router = express.Router();

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

router.get('/ecpay/aio-check-out-all', paymentCtl.getECPayAioCheckOutAll);
router.post('/ecpay/payment-result', paymentCtl.postECPayPaymentResult);

router.get('/spgateway/multi-payment-gateway', paymentCtl.getSpgatewayMultiPaymentGateway);
router.post('/spgateway/payment-result', paymentCtl.postSpgatewayPaymentResult);

module.exports = router;
