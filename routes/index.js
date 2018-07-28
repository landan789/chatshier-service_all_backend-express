const express = require('express');
const router = express.Router();

const titlePostfix = ' | Chatshier';

let reactReadyPaths = [
    '/signin',
    '/signup',
    '/reset-password',
    '/change-password',

    '/calendar',
    '/ticket',
    '/analyze',

    '/appointment',
    '/receptionist',
    '/product',
    '/category'
];
router.get(reactReadyPaths, (req, res, next) => {
    res.render('react');
});

/* GET home page. */
router.get('/', (req, res, next) => {
    res.redirect('/chat');
});
router.get('/chat', (req, res, next) => {
    res.render('chat', { title: '聊天室' + titlePostfix });
});

router.get('/autoreply', (req, res, next) => {
    res.render('autoreply', { title: '自動回覆' + titlePostfix });
});

router.get('/keywordsreply', (req, res, next) => {
    res.render('keywordsreply', { title: '關鍵字回覆' + titlePostfix });
});

router.get('/greeting', (req, res, next) => {
    res.render('greeting', { title: '加好友回覆' + titlePostfix });
});

router.get('/compose', (req, res, next) => {
    res.render('compose', { title: '群發' + titlePostfix });
});

router.get('/template', (req, res, next) => {
    res.render('template', { title: '範本訊息' + titlePostfix });
});

router.get('/richmenu', (req, res, next) => {
    res.render('richmenu', { title: '圖文選單' + titlePostfix });
});

router.get('/imagemap', (req, res, next) => {
    res.render('imagemap', { title: '圖文訊息' + titlePostfix });
});

router.get('/category-product', function(req, res, next) {
    res.render('category_product', { title: '商品管理' + titlePostfix });
});

router.get('/signout', (req, res, next) => {
    res.render('signout', { title: '登出' + titlePostfix });
});

router.get('/setting', (req, res, next) => {
    res.render('setting', { title: '設定' + titlePostfix });
});

router.get('/consumer-form', (req, res, next) => {
    res.render('actions/consumer_form', { title: '顧客資料' });
});

router.get('/donation-confirm', (req, res, next) => {
    res.render('actions/donation_confirm', { title: '捐款確認' });
});

module.exports = router;
