module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    const appsGreetingsMdl = require('../models/apps_greetings');
    const appsAutorepliesMdl = require('../models/apps_autoreplies');
    const appsPaymentsMdl = require('../models/apps_payments');
    const appsRichmenusMdl = require('../models/apps_richmenus');
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
                    let serverAddr = webhookInfo.serverAddress;
                    let platformUid = webhookInfo.platformUid;
                    let url = serverAddr;

                    switch (dataJson.action) {
                        case 'CHANGE_RICHMENU':
                            let richmenuId = dataJson.richmenuId || '';
                            let richmenuPromise = appsRichmenusMdl.find(appId, richmenuId).then((appsRichmenus) => {
                                let unableMessage = [{
                                    type: 'text',
                                    text: 'Unable to switch rich menu'
                                }];

                                if (!(appsRichmenus && appsRichmenus[appId])) {
                                    repliedMessages.push(unableMessage);
                                    return;
                                }

                                // 如果此 richmenu 沒有啟用或者找不到，需回應無法切換
                                let richmenu = appsRichmenus[appId].richmenus[richmenuId];
                                if (!(richmenu && richmenu.isActivated)) {
                                    repliedMessages.push(unableMessage);
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
                            url += '/consumer_form?aid=' + appId + '&t=' + token;

                            let formMessage = {
                                type: 'template',
                                altText: dataJson.context ? dataJson.context.altText : 'Template created by Chatshier',
                                template: {
                                    type: 'buttons',
                                    title: dataJson.context ? dataJson.context.templateTitle : 'Fill your profile',
                                    text: dataJson.context ? dataJson.context.templateText : 'Open this link for continue',
                                    actions: [{
                                        type: 'uri',
                                        label: dataJson.context ? dataJson.context.buttonText : 'Click here',
                                        uri: url
                                    }]
                                }
                            };
                            repliedMessages.push(formMessage);
                            break;
                        case 'SEND_DONATE_OPTIONS':
                            let context = dataJson.context;
                            let donateMessage = {
                                type: 'template',
                                altText: context ? context.altText || '' : 'Template created by Chatshier',
                                template: {
                                    type: 'buttons',
                                    title: context ? context.templateTitle : '',
                                    text: context ? context.templateText || '' : 'Open this link for continue',
                                    /** @type {any[]} */
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
                                    donateMessage.template.actions.push({
                                        type: 'uri',
                                        label: donateAmounts[i] + ' ' + (context ? context.currency : ''),
                                        uri: url + '/ecpay/aio_check_out_all?TotalAmount=' + donateAmounts[i] + '&TradeDesc=Donate&ItemName=DonateAmount'
                                    });
                                }
                                repliedMessages.push(donateMessage);
                            });
                            promises.push(donatePromise);
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
