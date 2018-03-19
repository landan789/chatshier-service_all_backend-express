let express = require('express');
let router = express.Router();
var bodyParser = require('body-parser');
var formData = require('express-form-data');
let signupCtl = require('../controllers/signup');
let signinCtl = require('../controllers/signin');

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

router.post('/signup/', signupCtl.postOne);
router.post('/signin/', signinCtl.postOne);

module.exports = router;
