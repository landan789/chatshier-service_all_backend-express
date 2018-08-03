const express = require('express');
const bodyParser = require('body-parser');

const paymentCtl = require('../controllers/payment');
const router = express.Router();

// HTTP body x-www-form-urlencoded parser
// HTTP body 允許 json 格式
router.use(
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json()
);

router.post('/submit', paymentCtl.postSubmit);

router.post('/ecpay/result', paymentCtl.postECPayResult);
router.post('/spgateway/result', paymentCtl.postSpgatewayResult);

module.exports = router;
