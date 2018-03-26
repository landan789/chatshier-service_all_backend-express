let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let formData = require('express-form-data');
let jwtHlp = require('../helpers/jwt');

let signCtl = require('../controllers/sign');

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

router.post('/signup/', signCtl.postSignup);
router.post('/signin/', signCtl.postSignin);
router.post('/signout/', jwtHlp.authenticate('HEADER', null), signCtl.postSignout);
router.post('/refresh/users/:userid', jwtHlp.authenticate('HEADER', null), signCtl.postRefresh);

module.exports = router;