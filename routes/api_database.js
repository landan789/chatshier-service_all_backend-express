const express = require('express');
const bodyParser = require('body-parser');
const formData = require('express-form-data');

const appsAutorepliesCtl = require('../controllers/apps_autoreplies');
const appsAppointmentsCtl = require('../controllers/apps_appointments');
const appsComposesCtl = require('../controllers/apps_composes');
const appsTemplateCtl = require('../controllers/apps_templates');
const appsImagemapsCtl = require('../controllers/apps_imagemaps');
const appsCtl = require('../controllers/apps');
const appsTicketsCtl = require('../controllers/apps_tickets');
const calendarsEventsCtl = require('../controllers/calendars_events');
const appsPaymentsCtl = require('../controllers/apps_payments');
const appsRichmenusCtl = require('../controllers/apps_richmenus');
const appsFieldsCtl = require('../controllers/apps_fields');
const appsGreetingsCtl = require('../controllers/apps_greetings');
const consumersCtl = require('../controllers/consumers');
const consumersFormCtl = require('../controllers/consumers_form');
const usersCtl = require('../controllers/users');
const groupsCtl = require('../controllers/groups');
const groupsMembersCtl = require('../controllers/groups_members');

const appsChatroomsCtl = require('../controllers/apps_chatrooms');
const appsChatroomsMessagersCtl = require('../controllers/apps_chatrooms_messagers');
const appsKeywordrepliesCtl = require('../controllers/apps_keywordreplies');

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

router.get('/apps/users/:userid', appsCtl.getAll);
router.get('/apps/apps/:appid/users/:userid', appsCtl.getOne);
router.post('/apps/users/:userid', appsCtl.postOne);
router.put('/apps/apps/:appid/users/:userid', appsCtl.putOne);
router.delete('/apps/apps/:appid/users/:userid', appsCtl.deleteOne);

router.get('/apps-tickets/users/:userid', appsTicketsCtl.getAll);
router.get('/apps-tickets/apps/:appid/users/:userid', appsTicketsCtl.getAll);
router.get('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.getOne);
router.post('/apps-tickets/apps/:appid/users/:userid', appsTicketsCtl.postOne);
router.put('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.putOne);
router.delete('/apps-tickets/apps/:appid/tickets/:ticketid/users/:userid', appsTicketsCtl.deleteOne);

// ===============
// 聊天室訊息
router.get('/apps-chatrooms/users/:userid', appsChatroomsCtl.getAll);
router.get('/apps-chatrooms/apps/:appid/users/:userid', appsChatroomsCtl.getAll);
router.put('/apps-chatrooms/apps/:appid/chatrooms/:chatroomid/users/:userid', appsChatroomsCtl.putOne);
router.get('/apps-chatrooms-messagers/users/:userid', appsChatroomsMessagersCtl.getAll);
router.get('/apps-chatrooms-messagers/apps/:appid/chatrooms/:chatroomid/messagers/:messagerid/users/:userid', appsChatroomsMessagersCtl.getAll);
router.put('/apps-chatrooms-messagers/apps/:appid/chatrooms/:chatroomid/messagers/:messagerid/users/:userid', appsChatroomsMessagersCtl.putOne);
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
router.get('/apps-fields/users/:userid', appsFieldsCtl.getAll);
router.post('/apps-fields/apps/:appid/users/:userid', appsFieldsCtl.postOne);
router.put('/apps-fields/apps/:appid/fields/:fieldid/users/:userid', appsFieldsCtl.putOne);
router.delete('/apps-fields/apps/:appid/fields/:fieldid/users/:userid', appsFieldsCtl.deleteOne);
// ==========

// ==========
// 加好友回覆
router.get('/apps-greetings/users/:userid', appsGreetingsCtl.getAll);
router.get('/apps-greetings/apps/:appid/users/:userid', appsGreetingsCtl.getAll);
router.get('/apps-greetings/apps/:appid/greetings/:greetingid/users/:userid', appsGreetingsCtl.getOne);
router.post('/apps-greetings/apps/:appid/users/:userid', appsGreetingsCtl.postOne);
router.put('/apps-greetings/apps/:appid/greetings/:greetingid/users/:userid', appsGreetingsCtl.putOne);
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

// ==========
// 圖文訊息
router.get('/apps-imagemaps/users/:userid', appsImagemapsCtl.getAll);
router.get('/apps-imagemaps/apps/:appid/users/:userid', appsImagemapsCtl.getAll);
router.get('/apps-imagemaps/apps/:appid/imagemaps/:imagemapid/users/:userid', appsImagemapsCtl.getOne);
router.post('/apps-imagemaps/apps/:appid/users/:userid', appsImagemapsCtl.postOne);
router.put('/apps-imagemaps/apps/:appid/imagemaps/:imagemapid/users/:userid', appsImagemapsCtl.putOne);
router.delete('/apps-imagemaps/apps/:appid/imagemaps/:imagemapid/users/:userid', appsImagemapsCtl.deleteOne);
// ==========

// ==========
// 預約
router.get('/apps-appointments/users/:userid', appsAppointmentsCtl.getAll);
router.get('/apps-appointments/apps/:appid/users/:userid', appsAppointmentsCtl.getAll);
router.get('/apps-appointments/apps/:appid/appointments/:appointmentid/users/:userid', appsAppointmentsCtl.getOne);
router.post('/apps-appointments/apps/:appid/users/:userid', appsAppointmentsCtl.postOne);
router.put('/apps-appointments/apps/:appid/appointments/:appointmentid/users/:userid', appsAppointmentsCtl.putOne);
router.delete('/apps-appointments/apps/:appid/appointments/:appointmentid/users/:userid', appsAppointmentsCtl.deleteOne);
// ==========

router.get('/apps-payments/users/:userid', appsPaymentsCtl.getAll);
router.get('/apps-payments/apps/:appid/users/:userid', appsPaymentsCtl.getAll);
router.get('/apps-payments/apps/:appid/payments/:paymentid/users/:userid', appsPaymentsCtl.getOne);
router.post('/apps-payments/apps/:appid/users/:userid', appsPaymentsCtl.postOne);
router.put('/apps-payments/apps/:appid/payments/:paymentid/users/:userid', appsPaymentsCtl.putOne);
router.delete('/apps-payments/apps/:appid/payments/:paymentid/users/:userid', appsPaymentsCtl.deleteOne);

// ===============
// consumer 個人資料訊息相關
router.get('/consumers/users/:userid', consumersCtl.getAll);
router.get('/consumers/consumers/:platformuid/users/:userid', consumersCtl.getOne);
router.put('/consumers/consumers/:platformuid/users/:userid', consumersCtl.putOne);
// ===============

// vendor 的個人資料
router.get('/users/users/:userid', usersCtl.getOne);
router.put('/users/users/:userid', usersCtl.putOne);

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

router.get('/consumers-form/apps/:appid/consumers/:platformuid', consumersFormCtl.getAllRequiredData);
router.put('/consumers-form/apps/:appid/consumers/:platformuid', consumersFormCtl.putOne);

module.exports = router;
