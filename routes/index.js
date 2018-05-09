const express = require('express');
const router = express.Router();

const titlePostfix = ' | Chatshier';

let reactReadyPaths = [
    '/signin',
    '/signup'
];
router.get(reactReadyPaths, function(req, res, next) {
    res.render('react');
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.redirect('/chat');
});
router.get('/chat', function(req, res, next) {
    res.render('chat', { title: '聊天室' + titlePostfix });
});
router.get('/setting', function(req, res, next) {
    res.render('setting', { title: '設定' + titlePostfix });
});
router.get('/autoreply', function(req, res, next) {
    res.render('autoreply', { title: '自動回覆' + titlePostfix });
});
router.get('/keywordsreply', function(req, res, next) {
    res.render('keywordsreply', { title: '關鍵字回覆' + titlePostfix });
});
router.get('/greeting', function(req, res, next) {
    res.render('greeting', { title: '加好友回覆' + titlePostfix });
});
router.get('/compose', function(req, res, next) {
    res.render('compose', { title: '群發' + titlePostfix });
});
router.get('/calendar', function(req, res, next) {
    res.render('calendar', { title: '行事曆' + titlePostfix });
});
router.get('/ticket', function(req, res, next) {
    res.render('ticket', { title: '待辦事項' + titlePostfix });
});
// authentication
router.get('/signout', function(req, res, next) {
    res.render('signout', { title: '登出' + titlePostfix });
});

router.get('/analyze', function(req, res, next) {
    res.render('analyze', { title: '訊息分析' + titlePostfix });
});
router.get('/template', function(req, res, next) {
    res.render('template', { title: '自訂 Line Template' + titlePostfix });
});
router.get('/richmenu', function(req, res, next) {
    res.render('richmenu', { title: '圖文選單' + titlePostfix });
});
router.get('/imagemap', function(req, res, next) {
    res.render('imagemap', { title: '圖文訊息' + titlePostfix });
});

module.exports = router;
