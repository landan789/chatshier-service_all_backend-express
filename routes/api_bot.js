const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');

const botCtl = require('../controllers/bot');

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
// bot
router.get('/apps/:appid/users/:userid', botCtl.getRichmenuList);
router.post('/apps/:appid/menus/:menuid/users/:userid', botCtl.activateRichmenu);
router.put('/apps/:appid/menus/:menuid/users/:userid', botCtl.setDefaultRichmenu);
router.delete('/apps/:appid/menus/:menuid/users/:userid', botCtl.deactivateRichmenu);
router.get('/apps/:appid/consumers/:platformuid', botCtl.getProfile);
router.delete('/leave-group-room/apps/:appid/chatrooms/:chatroomid/users/:userid', botCtl.leaveGroupRoom);
// ==========

module.exports = router;
