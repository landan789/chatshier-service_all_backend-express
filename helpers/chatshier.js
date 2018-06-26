module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    const appsGreetingsMdl = require('../models/apps_greetings');
    const appsAutorepliesMdl = require('../models/apps_autoreplies');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    const appsPaymentsMdl = require('../models/apps_payments');
    const appsRichmenusMdl = require('../models/apps_richmenus');
    const appsImagemapsMdl = require('../models/apps_imagemaps');
    const appsTemplatesMdl = require('../models/apps_templates');
    const fuseHlp = require('../helpers/fuse');
    const jwtHlp = require('../helpers/jwt');
    const botSvc = require('../services/bot');

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const SYSTEM = 'SYSTEM';

    class ChatshierHelp {
        /**
         * 根據 HTTP request body 與 app.type 決定要回傳甚麼訊息
         * @param {any[]} messages
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @param {string} appId
         * @param {Chatshier.Models.App} app
         * @returns {Promise<any[]>}
         */
        getRepliedMessages(messages, webhookInfo, appId, app) {
            let eventType = webhookInfo.eventType;
            let repliedMessages = [];

            // 針對 LINE 的 postback 訊息，有些需要回應有些只是動作，需做不同的處理
            if (LINE === app.type && eventType === botSvc.LINE_EVENT_TYPES.POSTBACK) {
                let promises = [];

                while (messages.length > 0) {
                    let message = messages.shift();
                    let postback = message.postback;
                    let canParseData = 'string' === typeof postback.data && postback.data.startsWith('{') && postback.data.endsWith('}');
                    if (!canParseData) {
                        continue;
                    }

                    /** @type {Webhook.Chatshier.PostbackData} */
                    let dataJson = JSON.parse(postback.data);
                    let context = dataJson.context;
                    let serverAddr = webhookInfo.serverAddress;
                    let platformUid = webhookInfo.platformUid;
                    let url = serverAddr;

                    switch (dataJson.action) {
                        case 'CHANGE_RICHMENU':
                            let richmenuId = dataJson.richmenuId || '';
                            let richmenuPromise = appsRichmenusMdl.find(appId, richmenuId).then((appsRichmenus) => {
                                if (!(appsRichmenus && appsRichmenus[appId])) {
                                    return;
                                }

                                // 如果此 richmenu 沒有啟用或者找不到，則不做任何處理
                                let richmenu = appsRichmenus[appId].richmenus[richmenuId];
                                if (!(richmenu && richmenu.isActivated)) {
                                    return;
                                }

                                let platformUid = webhookInfo.platformUid;
                                return botSvc.linkRichMenuToUser(platformUid, richmenu.platformMenuId, appId, app);
                            });
                            promises.push(richmenuPromise);
                            break;
                        case 'SEND_TEMPLATE':
                            let templateId = dataJson.templateId || '';
                            let templatePromise = appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                                if (!(appsTemplates && appsTemplates[appId])) {
                                    return Promise.resolve();
                                }

                                let template = appsTemplates[appId].templates[templateId];
                                let templateMessage = {
                                    type: template.type,
                                    altText: template.altText,
                                    template: template.template
                                };
                                repliedMessages.push(templateMessage);
                            });
                            promises.push(templatePromise);
                            break;
                        case 'SEND_CONSUMER_FORM':
                            let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
                            url += '/consumer-form?aid=' + appId + '&t=' + token;

                            let formMessage = {
                                type: 'template',
                                altText: '填寫基本資料模板訊息',
                                template: {
                                    type: 'buttons',
                                    title: '填寫基本資料',
                                    text: '開啟以下連結進行填寫動作',
                                    actions: [{
                                        type: 'uri',
                                        label: '按此開啟',
                                        uri: url
                                    }]
                                }
                            };
                            repliedMessages.push(formMessage);
                            break;
                        case 'SEND_DONATE_OPTIONS':
                            let donateMessage = {
                                type: 'template',
                                altText: '小額捐款金額選項',
                                template: {
                                    type: 'buttons',
                                    text: '點擊以下金額進行捐款動作',
                                    /** @type {Chatshier.Models.TemplateAction[]} */
                                    actions: []
                                }
                            };

                            let donatePromise = appsPaymentsMdl.find(appId).then((appsPayments) => {
                                if (!(appsPayments && appsPayments[appId])) {
                                    return;
                                }

                                // 此 app 尚未設定任何金流服務，不處理此 postback
                                let payment = Object.values(appsPayments[appId].payments).shift();
                                if (!(payment && payment.type)) {
                                    return;
                                }

                                donateMessage.template.title = payment.type; // 將金流服務的類型作為訊息的標題顯示
                                let donateAmounts = context ? context.donateAmounts || [] : [];
                                for (let i in donateAmounts) {
                                    let amount = donateAmounts[i] + ' ' + (context ? context.currency : '');
                                    let _context = {
                                        altText: '捐款確認',
                                        templateText: '進行捐款 ' + amount
                                    };

                                    switch (payment.type) {
                                        case 'ECPay':
                                        case 'Spgateway':
                                            _context.paymentId = payment._id;
                                            _context.TotalAmount = donateAmounts[i];
                                            _context.TradeDesc = '小額捐款';
                                            _context.ItemName = '小額捐款 ' + amount;
                                            break;
                                        default:
                                            break;
                                    }

                                    let postbackData = {
                                        action: 'CONFIRM_PAYMENT',
                                        context: _context
                                    };

                                    donateMessage.template.actions.push({
                                        type: 'postback',
                                        label: amount,
                                        data: JSON.stringify(postbackData)
                                    });
                                }
                                repliedMessages.push(donateMessage);
                            });
                            promises.push(donatePromise);
                            break;
                        case 'CONFIRM_PAYMENT':
                            let paymentId = (context && context.paymentId) || '';
                            if (!paymentId) {
                                break;
                            }

                            // 當 consumer 確認付款時，檢查此 consumer 是否已經填寫完個人基本資料
                            // 如果沒有填寫完基本資料，則發送填寫基本資料模板給使用者
                            let confirmPromise = appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid).then((appsChatroomsMessagers) => {
                                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                                    return;
                                }

                                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                let chatroomId = Object.keys(chatrooms).shift() || '';
                                let messager = chatrooms[chatroomId].messagers[platformUid];

                                let isFinishProfile = (
                                    messager.namings && messager.namings[platformUid] &&
                                    messager.email &&
                                    messager.phone
                                );

                                if (!isFinishProfile) {
                                    let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
                                    url += '/consumer-form?aid=' + appId + '&t=' + token;

                                    let alertMessage = {
                                        type: 'text',
                                        text: '您尚未完成個人基本資料的填寫'
                                    };

                                    let formMessage = {
                                        type: 'template',
                                        altText: '填寫基本資料模板訊息',
                                        template: {
                                            type: 'buttons',
                                            title: '填寫基本資料',
                                            text: '開啟以下連結進行填寫動作',
                                            actions: [{
                                                type: 'uri',
                                                label: '按此開啟',
                                                uri: url
                                            }]
                                        }
                                    };
                                    repliedMessages.push(alertMessage, formMessage);
                                    return;
                                }

                                return appsPaymentsMdl.find(appId, paymentId).then((appsPayments) => {
                                    if (!(appsPayments && appsPayments[appId])) {
                                        return;
                                    }

                                    let payment = appsPayments[appId].payments[paymentId];
                                    let url = serverAddr + '/payment/' + payment.type.toLowerCase();

                                    switch (payment.type) {
                                        case 'ECPay':
                                            url += '/aio-check-out-all?';
                                            break;
                                        case 'Spgateway':
                                            url += '/multi-payment-gateway?';
                                            break;
                                        default:
                                            break;
                                    }

                                    url += (
                                        'aid=' + appId + '&' +
                                        'cid=' + platformUid + '&' +
                                        'pid=' + (context ? context.paymentId : '') + '&' +
                                        'amount=' + encodeURIComponent(context ? context.TotalAmount || '' : '') + '&' +
                                        'desc=' + encodeURIComponent(context ? context.TradeDesc || '' : '') + '&' +
                                        'iname=' + encodeURIComponent(context ? context.ItemName || '' : '') + '&' +
                                        'ts=' + Date.now()
                                    );

                                    let confirmMessage = {
                                        type: 'template',
                                        altText: context && context.altText,
                                        template: {
                                            type: 'confirm',
                                            text: context && context.templateText,
                                            actions: [{
                                                type: 'uri',
                                                label: '是',
                                                uri: url
                                            }, {
                                                type: 'postback',
                                                label: '否',
                                                data: JSON.stringify({ action: 'CANCEL_PAYMENT' })
                                            }]
                                        }
                                    };
                                    repliedMessages.push(confirmMessage);
                                });
                            });
                            promises.push(confirmPromise);
                            break;
                        default:
                            break;
                    }
                }

                return Promise.all(promises).then(() => repliedMessages);
            }

            let greetingsPromise = Promise.resolve().then(() => {
                if (LINE === app.type &&
                    (botSvc.LINE_EVENT_TYPES.FOLLOW === eventType ||
                    botSvc.LINE_EVENT_TYPES.JOIN === eventType)) {
                    return appsGreetingsMdl.findGreetings(appId);
                }
                return Promise.resolve({});
            });

            /** @type {Chatshier.Models.Keywordreplies} */
            let keywordreplies = {};
            let keywordrepliesPromise = Promise.all(messages.map((message) => {
                if (LINE === app.type &&
                    botSvc.LINE_EVENT_TYPES.MESSAGE !== eventType) {
                    return Promise.resolve(null);
                }

                let text = message.text;
                if (!text) {
                    return Promise.resolve(null);
                }

                // 關鍵字回復使用模糊比對，不直接對 DB 查找
                return fuseHlp.searchKeywordreplies(appId, text).then((_keywordreplies) => {
                    keywordreplies = Object.assign(keywordreplies, _keywordreplies);
                    return _keywordreplies;
                });
            })).then(() => {
                return Promise.all(Object.keys(keywordreplies).map((keywordreplyId) => {
                    let keywordreply = keywordreplies[keywordreplyId];
                    switch (keywordreply.type) {
                        case 'template':
                            let templateId = keywordreply.template_id;
                            return appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                                // 此關鍵字回覆的模板訊息可能已被刪除或找不到，因此刪除回復訊息
                                if (!(appsTemplates && appsTemplates[appId])) {
                                    delete keywordreplies[keywordreplyId];
                                    return;
                                }
                                let template = appsTemplates[appId].templates[templateId];
                                Object.assign(keywordreplies[keywordreplyId], template);
                            });
                        case 'imagemap':
                            let imagemapId = keywordreply.imagemap_id;
                            return appsImagemapsMdl.find(appId, imagemapId).then((appsImagemaps) => {
                                // 此關鍵字回覆的圖文訊息可能已被刪除或找不到，因此刪除回復訊息
                                if (!(appsImagemaps && appsImagemaps[appId])) {
                                    delete keywordreplies[keywordreplyId];
                                    return;
                                }
                                let imagemap = appsImagemaps[appId].imagemaps[imagemapId];
                                Object.assign(keywordreplies[keywordreplyId], imagemap);
                            });
                        case 'image':
                        case 'text':
                        default:
                            return Promise.resolve();
                    }
                }));
            }).then(() => {
                return keywordreplies;
            });

            return Promise.all([
                greetingsPromise,
                keywordrepliesPromise
            ]).then(([ greetings, keywordreplies ]) => {
                let _message = { from: SYSTEM };

                greetings = greetings || {};
                for (let greetingId in greetings) {
                    let greeting = greetings[greetingId];
                    let message = Object.assign({}, greeting, _message);
                    repliedMessages.push(message);
                }

                keywordreplies = keywordreplies || {};
                for (let keywordreplyId in keywordreplies) {
                    let keywordreply = keywordreplies[keywordreplyId];
                    let message = Object.assign({}, keywordreply, _message);
                    repliedMessages.push(message);
                }

                // 沒有加好友回覆與關鍵字回覆訊息，才進行自動回覆的查找
                if (0 === repliedMessages.length) {
                    return Promise.resolve().then(() => {
                        if (LINE === app.type &&
                            botSvc.LINE_EVENT_TYPES.MESSAGE !== eventType) {
                            return Promise.resolve({});
                        }

                        return appsAutorepliesMdl.findAutoreplies(appId).then((_autoreplies) => {
                            if (!_autoreplies) {
                                return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                            }

                            let timeNow = Date.now();
                            let autoreplies = {};

                            for (let autoreplyId in _autoreplies) {
                                let autoreply = _autoreplies[autoreplyId];
                                let endedTime = new Date(autoreply.endedTime).getTime();
                                let startedTime = new Date(autoreply.startedTime).getTime();

                                if (startedTime <= timeNow && timeNow <= endedTime) {
                                    if (autoreply.periods && autoreply.periods.length > 0) {
                                        let timezoneOffset = autoreply.timezoneOffset ? autoreply.timezoneOffset : 0;
                                        let localeNow = timeNow - (timezoneOffset * 60 * 1000);
                                        let localeDate = new Date(localeNow);
                                        let localeDay = localeDate.getDay();

                                        let timeStrToTime = (timeStr) => {
                                            let datetime = new Date(localeNow);
                                            let timeStrSplits = timeStr.split(':');
                                            datetime.setHours(
                                                parseInt(timeStrSplits[0], 10),
                                                parseInt(timeStrSplits[1], 10),
                                                0, 0
                                            );
                                            return datetime.getTime();
                                        };

                                        for (let i in autoreply.periods) {
                                            let period = autoreply.periods[i];
                                            if (period.days.indexOf(localeDay) >= 0) {
                                                let startedTime = timeStrToTime(period.startedTime);
                                                let endedTime = timeStrToTime(period.endedTime);
                                                (startedTime > endedTime) && (endedTime += 24 * 60 * 60 * 1000);
                                                if (startedTime <= localeNow && localeNow <= endedTime) {
                                                    autoreplies[autoreplyId] = autoreply;
                                                    break;
                                                }
                                            }
                                        }
                                    } else {
                                        autoreplies[autoreplyId] = autoreply;
                                    }
                                }
                            }

                            return autoreplies;
                        });
                    }).then((autoreplies) => {
                        return repliedMessages.concat(
                            Object.keys(autoreplies).map((autoreplyId) => Object.assign({}, autoreplies[autoreplyId], _message))
                        );
                    });
                }
                return repliedMessages;
            });
        }

        getKeywordreplies(messages, appId, app) {
            let keywordreplies = {};
            return Promise.all(messages.map((message) => {
                let eventType = message.eventType || message.type;
                let text = message.text;
                if (('text' !== eventType && 'message' !== eventType) || '' === message.text) {
                    return Promise.resolve();
                }

                // 關鍵字回復使用模糊比對，不直接對 DB 查找
                return fuseHlp.searchKeywordreplies(appId, text).then((_keywordreplies) => {
                    keywordreplies = Object.assign(keywordreplies, _keywordreplies);
                    return _keywordreplies;
                });
            })).then(() => {
                let _keywordreplies = Object.keys(keywordreplies).map((keywordreplyId) => {
                    return keywordreplies[keywordreplyId];
                });
                return Promise.resolve(_keywordreplies);
            });
        }
    }

    return new ChatshierHelp();
})();
