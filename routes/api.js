var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');
var express = require('express');
var bodyParser = require('body-parser');
var formData = require('express-form-data');

var authenticationsCtl = require('../controllers/authentications');
var appsAutorepliesCtl = require('../controllers/apps_autoreplies');
var appsComposesCtl = require('../controllers/apps_composes');
var appsTemplateCtl = require('../controllers/apps_templates');
var appsCtl = require('../controllers/apps');
var appsTicketsCtl = require('../controllers/apps_tickets');
var calendarsEventsCtl = require('../controllers/calendars_events');
var appsRichmenusCtl = require('../controllers/apps_richmenus');
var appsTagsCtl = require('../controllers/apps_tags');
var appsGreetingsCtl = require('../controllers/apps_greetings');
var usersCtl = require('../controllers/users');

var groupsCtl = require('../controllers/groups');
var groupsMembersCtl = require('../controllers/groups_members');

var botCtl = require('../controllers/bot');

// ===============
// 訊息相關 Ctrl
var appsMessagersCtl = require('../controllers/apps_messagers');
var appsChatroomsMessagesCtl = require('../controllers/apps_chatrooms_messages');
// ===============

var appsKeywordrepliesCtl = require('../controllers/apps_keywordreplies');

var router = express.Router();

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

router.get('/authentications/users/:userid', authenticationsCtl.getAll);

router.get('/apps/users/:userid', appsCtl.getAll);
router.get('/apps/apps/:appid/users/:userid', appsCtl.getOne);
router.post('/apps/users/:userid', appsCtl.postOne);
router.put('/apps/apps/:appid/users/:userid', appsCtl.putOne);
router.delete('/apps/apps/:appid/users/:userid', appsCtl.deleteOne);

router.get('/apps-tickets/users/:userid', appsTicketsCtl.getAllByUserid);
router.get('/apps-tickets/apps/:appid/users/:userid', appsTicketsCtl.getAllByUserid);
router.get('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.getOne);
router.post('/apps-tickets/apps/:appid/users/:userid', appsTicketsCtl.postOne);
router.put('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.putOne);
router.delete('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.deleteOne);

// ===============
// messager 個人資料訊息相關
router.get('/apps-messagers/users/:userid', appsMessagersCtl.getAllMessagers);
router.get('/apps-messagers/apps/:appid/messager/:messagerid/users/:userid', appsMessagersCtl.getMessager);
router.put('/apps-messagers/apps/:appid/messager/:messagerid/users/:userid', appsMessagersCtl.updateMessager);
// ===============

// ===============
// 聊天室訊息
router.get('/apps-chatrooms-messages/users/:userid', appsChatroomsMessagesCtl.getAll);
router.get('/apps-chatrooms-messages/apps/:appid/users/:userid', appsChatroomsMessagesCtl.getAllByAppId);
// ===============

// ==========
// 圖文選單
router.get('/apps-richmenus/users/:userid', appsRichmenusCtl.getAll);
router.get('/apps-richmenus/apps/:appid/users/:userid', appsRichmenusCtl.getAll);
router.get('/apps-richmenus/apps/:appid/richmenus/:richmenuid/users/:userid', appsRichmenusCtl.getOne);
router.post('/apps-richmenus/apps/:appid/users/:userid', appsRichmenusCtl.postOne);
router.put('/apps-richmenus/apps/:appid/richmenus/:richmenuid/users/:userid', appsRichmenusCtl.putOne);
router.delete('/apps-richmenus/apps/:appid/richmenus/:richmenuid/users/:userid', appsRichmenusCtl.deleteOne);
// ==========

// ==========
// 自動回覆
router.get('/apps-autoreplies/users/:userid', appsAutorepliesCtl.getAll);
router.get('/apps-autoreplies/apps/:appid/users/:userid', appsAutorepliesCtl.getAll);
router.get('/apps-autoreplies/apps/:appid/autoreplies/:autoreplyid/users/:userid', appsAutorepliesCtl.getOne);
router.post('/apps-autoreplies/apps/:appid/users/:userid', appsAutorepliesCtl.postOne);
router.put('/apps-autoreplies/apps/:appid/autoreplies/:autoreplyid/users/:userid', appsAutorepliesCtl.putOne);
router.delete('/apps-autoreplies/apps/:appid/autoreplies/:autoreplyid/users/:userid', appsAutorepliesCtl.deleteOne);
// ==========

// ==========
// 關鍵字回覆
router.get('/apps-keywordreplies/users/:userid', appsKeywordrepliesCtl.getAll);
router.get('/apps-keywordreplies/apps/:appid/users/:userid', appsKeywordrepliesCtl.getAll);
router.get('/apps-keywordreplies/apps/:appid/keywordreplies/:keywordreplyid/users/:userid', appsKeywordrepliesCtl.getOne);
router.post('/apps-keywordreplies/apps/:appid/users/:userid', appsKeywordrepliesCtl.postOne);
router.put('/apps-keywordreplies/apps/:appid/keywordreplies/:keywordreplyid/users/:userid', appsKeywordrepliesCtl.putOne);
router.delete('/apps-keywordreplies/apps/:appid/keywordreplies/:keywordreplyid/users/:userid', appsKeywordrepliesCtl.deleteOne);
// ==========

// ==========
// 資料客戶分類條件
router.get('/apps-tags/users/:userid', appsTagsCtl.getAll);
router.post('/apps-tags/apps/:appid/users/:userid', appsTagsCtl.postOne);
router.put('/apps-tags/apps/:appid/tags/:tagid/users/:userid', appsTagsCtl.putOne);
router.delete('/apps-tags/apps/:appid/tags/:tagid/users/:userid', appsTagsCtl.deleteOne);
// ==========

// ==========
// 加好友回覆
router.get('/apps-greetings/users/:userid', appsGreetingsCtl.getAll);
router.get('/apps-greetings/apps/:appid/users/:userid', appsGreetingsCtl.getAll);
router.get('/apps-greetings/apps/:appid/greetings/:greetingid/users/:userid', appsGreetingsCtl.getOne);
router.post('/apps-greetings/apps/:appid/users/:userid', appsGreetingsCtl.postOne);
router.delete('/apps-greetings/apps/:appid/greetings/:greetingid/users/:userid', appsGreetingsCtl.deleteOne);
// ==========

// ==========
// 群發
router.get('/apps-composes/users/:userid', appsComposesCtl.getAll);
router.get('/apps-composes/apps/:appid/users/:userid', appsComposesCtl.getAll);
router.get('/apps-composes/apps/:appid/composes/:composeid/users/:userid', appsComposesCtl.getOne);
router.post('/apps-composes/apps/:appid/users/:userid', appsComposesCtl.postOne);
router.put('/apps-composes/apps/:appid/composes/:composeid/users/:userid', appsComposesCtl.putOne);
router.delete('/apps-composes/apps/:appid/composes/:composeid/users/:userid', appsComposesCtl.deleteOne);
// ==========

// ==========
// Templates
router.get('/apps-templates/users/:userid', appsTemplateCtl.getAll);
router.get('/apps-templates/apps/:appid/users/:userid', appsTemplateCtl.getAll);
router.get('/apps-templates/apps/:appid/templates/:templateid/users/:userid', appsTemplateCtl.getOne);
router.post('/apps-templates/apps/:appid/users/:userid', appsTemplateCtl.postOne);
router.put('/apps-templates/apps/:appid/templates/:templateid/users/:userid', appsTemplateCtl.putOne);
router.delete('/apps-templates/apps/:appid/templates/:templateid/users/:userid', appsTemplateCtl.deleteOne);
// ==========

// vendor 的個人資料
router.get('/users/users/:userid', usersCtl.getOne);
router.put('/users/users/:userid', usersCtl.putOne);
router.post('/users/users/:userid', usersCtl.postOne);

router.get('/calendars-events/users/:userid', calendarsEventsCtl.getAll);
router.post('/calendars-events/users/:userid', calendarsEventsCtl.postOne);
router.put('/calendars-events/calendars/:calendarid/events/:eventid/users/:userid', calendarsEventsCtl.putOne);
router.delete('/calendars-events/calendars/:calendarid/events/:eventid/users/:userid', calendarsEventsCtl.deleteOne);

router.get('/groups/users/:userid', groupsCtl.getAll);
router.post('/groups/users/:userid', groupsCtl.postOne);
router.put('/groups/groups/:groupid/users/:userid', groupsCtl.putOne);

router.get('/groups-members/groups/:groupid/users/:userid', groupsMembersCtl.getAll);
router.post('/groups-members/groups/:groupid/users/:userid', groupsMembersCtl.postOne);
router.put('/groups-members/groups/:groupid/members/:memberid/users/:userid', groupsMembersCtl.putOne);
router.delete('/groups-members/groups/:groupid/members/:memberid/users/:userid', groupsMembersCtl.deleteOne);

// ==========
// bot
router.get('/bot/apps/:appid', botCtl.getRichMenuList);
router.get('/bot/apps/:appid/richmenus/:richmenuid', botCtl.getRichmenu);
router.get('/bot/apps/:appid/richmenus/:richmenuid/content', botCtl.getRichMenuImage);
router.post('/bot/apps/:appid', botCtl.createRichMenu);
router.post('/bot/apps/:appid/richmenus/:richmenuid/content', botCtl.setRichMenuImage);
router.post('/bot/apps/:appid/richmenus/:richmenuid/senders/:senderid', botCtl.linkRichMenuToUser);
router.delete('/bot/apps/:appid/richmenus/:richmenuid', botCtl.deleteRichMenu);
router.delete('/bot/apps/:appid/richmenus/:richmenuid/senders/:senderid', botCtl.unlinkRichMenuFromUser);
// ==========

module.exports = router;
