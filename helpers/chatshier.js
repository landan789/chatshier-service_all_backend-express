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

    // const ECPAY = 'ECPAY';
    // const SPGATEWAY = 'SPGATEWAY';
    // const PAYMENT_LOGOS = {
    //     [ECPAY]: 'https://www.ecpay.com.tw/Content/Themes/WebStyle20131201/images/header_logo.png',
    //     [SPGATEWAY]: 'https://www.spgateway.com/ud/img/logo.png'
    // };

    const POSTBACK_ACTIONS = Object.freeze({
        CHANGE_RICHMENU: 'CHANGE_RICHMENU',
        SEND_TEMPLATE: 'SEND_TEMPLATE',
        SEND_IMAGEMAP: 'SEND_IMAGEMAP',
        SEND_CONSUMER_FORM: 'SEND_CONSUMER_FORM',
        PAYMENT_CONFIRM: 'PAYMENT_CONFIRM'
    });

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
                    let postbackData = JSON.parse(postback.data);
                    let serverAddr = webhookInfo.serverAddress;
                    let platformUid = webhookInfo.platformUid;
                    let url = serverAddr;

                    switch (postbackData.action) {
                        case POSTBACK_ACTIONS.CHANGE_RICHMENU:
                            let richmenuId = postbackData.richmenuId || '';
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
                        case POSTBACK_ACTIONS.SEND_TEMPLATE:
                            let templateId = postbackData.templateId || '';
                            let templatePromise = appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                                if (!(appsTemplates && appsTemplates[appId])) {
                                    return Promise.resolve();
                                }

                                let template = appsTemplates[appId].templates[templateId];

                                if (postbackData.additionalText) {
                                    let additionalTextMessage = {
                                        type: 'text',
                                        text: postbackData.additionalText
                                    };
                                    repliedMessages.push(additionalTextMessage);
                                }

                                let templateMessage = {
                                    type: template.type,
                                    altText: template.altText,
                                    template: template.template
                                };
                                repliedMessages.push(templateMessage);
                            });
                            promises.push(templatePromise);
                            break;
                        case POSTBACK_ACTIONS.SEND_IMAGEMAP:
                            let imagemapId = postbackData.imagemapId || '';
                            let imagemapPromise = appsImagemapsMdl.find(appId, imagemapId).then((appsImagemaps) => {
                                if (!(appsImagemaps && appsImagemaps[appId])) {
                                    return Promise.resolve();
                                }

                                if (postbackData.additionalText) {
                                    let additionalTextMessage = {
                                        type: 'text',
                                        text: postbackData.additionalText
                                    };
                                    repliedMessages.push(additionalTextMessage);
                                }

                                let imagemap = appsImagemaps[appId].imagemaps[imagemapId];
                                let imagemapMessage = {
                                    type: imagemap.type,
                                    altText: imagemap.altText,
                                    baseUrl: imagemap.baseUrl,
                                    baseSize: imagemap.baseSize,
                                    actions: imagemap.actions
                                };
                                repliedMessages.push(imagemapMessage);
                            });
                            promises.push(imagemapPromise);
                            break;
                        case POSTBACK_ACTIONS.SEND_CONSUMER_FORM:
                            let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
                            url += '/consumer-form?aid=' + appId + '&t=' + token;

                            let formMessage = {
                                type: 'template',
                                altText: '填寫基本資料範本訊息',
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
                        case POSTBACK_ACTIONS.PAYMENT_CONFIRM:
                            let confirmPromise = appsPaymentsMdl.find(appId).then((appsPayments) => {
                                // 如果此 App 尚未設定金流服務，則跳過處理
                                if (!(appsPayments && appsPayments[appId])) {
                                    return Promise.resolve(void 0);
                                }
                                return Promise.resolve(Object.values(appsPayments[appId].payments).shift());
                            }).then((payment) => {
                                if (!payment) {
                                    return;
                                }

                                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid).then((appsChatroomsMessagers) => {
                                    if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                                        return;
                                    }

                                    // 當 consumer 點擊捐款時，檢查此 consumer 是否已經填寫完個人基本資料
                                    // 如果沒有填寫完基本資料，則發送填寫基本資料範本給使用者
                                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                                    let chatroomId = Object.keys(chatrooms).shift() || '';
                                    let messager = chatrooms[chatroomId].messagers[platformUid];

                                    let hasFinishProfile = (
                                        messager.namings && messager.namings[platformUid] &&
                                        messager.email &&
                                        messager.phone &&
                                        messager.address
                                    );

                                    if (!hasFinishProfile) {
                                        let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
                                        url += '/consumer-form?aid=' + appId + '&t=' + token;

                                        let alertMessage = {
                                            type: 'text',
                                            text: '您尚未完成個人基本資料的填寫'
                                        };

                                        let formMessage = {
                                            type: 'template',
                                            altText: '填寫基本資料範本訊息',
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

                                    let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
                                    url += '/donation-confirm?aid=' + appId + '&t=' + token;
                                    if (payment.canIssueInvoice) {
                                        url += '&cii=1';
                                    }

                                    let linkMessage = {
                                        type: 'template',
                                        altText: '捐款連結訊息',
                                        template: {
                                            type: 'buttons',
                                            title: '捐款連結',
                                            text: '開啟以下連結前往捐款資料確認',
                                            actions: [{
                                                type: 'uri',
                                                label: '按此開啟',
                                                uri: url
                                            }]
                                        }
                                    };
                                    repliedMessages.push(linkMessage);
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
            }).then((greetings) => {
                return this.prepareReplies(appId, greetings);
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
                return this.prepareReplies(appId, keywordreplies);
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
                        return this.prepareReplies(appId, autoreplies);
                    }).then((_autoreplies) => {
                        return repliedMessages.concat(
                            Object.keys(_autoreplies).map((autoreplyId) => {
                                return Object.assign({}, _autoreplies[autoreplyId], _message);
                            })
                        );
                    });
                }
                return repliedMessages;
            });
        }

        getKeywordreplies(messages, appId) {
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

        /**
         * @param {string} appId
         * @param {any} replies
         */
        prepareReplies(appId, replies) {
            return Promise.all(Object.keys(replies).map((replyId) => {
                let reply = replies[replyId];
                switch (reply.type) {
                    case 'template':
                        if (reply.template) {
                            return Promise.resolve();
                        }
                        let templateId = reply.template_id;
                        return appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                            // 此關鍵字回覆的範本訊息可能已被刪除或找不到，因此刪除回復訊息
                            if (!(appsTemplates && appsTemplates[appId])) {
                                delete replies[replyId];
                                return;
                            }
                            let template = appsTemplates[appId].templates[templateId];
                            Object.assign(replies[replyId], template);
                        });
                    case 'imagemap':
                        if (reply.baseUrl) {
                            return Promise.resolve();
                        }
                        let imagemapId = reply.imagemap_id;
                        return appsImagemapsMdl.find(appId, imagemapId).then((appsImagemaps) => {
                            // 此關鍵字回覆的圖文訊息可能已被刪除或找不到，因此刪除回復訊息
                            if (!(appsImagemaps && appsImagemaps[appId])) {
                                delete replies[replyId];
                                return;
                            }
                            let imagemap = appsImagemaps[appId].imagemaps[imagemapId];
                            Object.assign(replies[replyId], imagemap);
                        });
                    case 'image':
                    case 'text':
                    default:
                        return Promise.resolve();
                }
            })).then(() => {
                return replies;
            });
        }
    }

    return new ChatshierHelp();
})();
