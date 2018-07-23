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

router.post('/submit', paymentCtl.postSubmit);

router.post('/ecpay/result', paymentCtl.postECPayResult);
router.post('/spgateway/result', paymentCtl.postSpgatewayResult);

module.exports = router;
