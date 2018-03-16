const express = require('express');
const router = express.Router();

let reactReadyPaths = [
    '/signin',
    '/signup'
];
router.get(reactReadyPaths, function(req, res, next) {
    res.render('react');
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Chatshier' });
});
router.get('/chat', function(req, res, next) {
    res.render('chat', { title: 'Chatshier聊天室' });
});
router.get('/setting', function(req, res, next) {
    res.render('setting', { title: '設定' });
});
router.get('/autoreply', function(req, res, next) {
    res.render('autoreply', { title: '自動回覆' });
});
router.get('/keywordsreply', function(req, res, next) {
    res.render('keywordsreply', { title: '關鍵字回覆' });
});
router.get('/greeting', function(req, res, next) {
    res.render('greeting', { title: '加好友問候' });
});
router.get('/compose', function(req, res, next) {
    res.render('compose', { title: '訊息群發' });
});
router.get('/calendar', function(req, res, next) {
    res.render('calendar', { title: '行事曆' });
});
router.get('/ticket', function(req, res, next) {
    res.render('ticket', { title: '待辦事項' });
});
router.get('/ticket_form', function(req, res, next) {
    res.render('ticket_form', { title: '新增待辦事項' });
});
// authentication
router.get('/logout', function(req, res, next) {
    res.render('logout', { title: '登出' });
});

router.get('/analyze', function(req, res, next) {
    res.render('analyze', { title: '分析' });
});
router.get('/template', function(req, res, next) {
    res.render('template', { title: '自訂Line Template' });
});
router.get('/richmenu', function(req, res, next) {
    res.render('richmenu', { title: '圖文選單' });
});

router.get('/loading', function(req, res) {
    res.send(303);
});
module.exports = router;
