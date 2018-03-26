let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let formData = require('express-form-data');
let jwtHlp = require('../helpers/jwt');

let signupCtl = require('../controllers/signup');
let signinCtl = require('../controllers/signin');
let signoutCtl = require('../controllers/signout');

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
router.post('/signout/', jwtHlp.authenticate('HEADER'), signoutCtl.postOne);

module.exports = router;
