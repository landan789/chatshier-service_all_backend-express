const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');

const imageCtl = require('../controllers/image');

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

// ==========
// image
router.post('/upload-file/users/:userid', imageCtl.uploadFile);
router.post('/move-file/users/:userid', imageCtl.moveFile);
// ==========

module.exports = router;
