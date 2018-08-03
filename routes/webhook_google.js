const express = require('express');
const bodyParser = require('body-parser');

const gcalendarCtl = require('../controllers/gcalendar');
const router = express.Router();

// HTTP body x-www-form-urlencoded parser
// HTTP body 允許 json 格式
router.use(
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json()
);

router.post('/gcalendar/events/apps/:appid', gcalendarCtl.postEvent);
module.exports = router;
