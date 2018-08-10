module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    const CHATSHIER_CFG = require('../config/chatshier');
    const GenericTemplateBuilder = require('facebook-bot-messenger').GenericTemplateBuilder;

    const appsMdl = require('../models/apps');
    const appsAppointmentsMdl = require('../models/apps_appointments');
    const appsAutorepliesMdl = require('../models/apps_autoreplies');
    const appsCategoriesMdl = require('../models/apps_categories');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');
    const appsGreetingsMdl = require('../models/apps_greetings');
    const appsImagemapsMdl = require('../models/apps_imagemaps');
    const appsPaymentsMdl = require('../models/apps_payments');
    const appsProductsMdl = require('../models/apps_products');
    const appsReceptionistsMdl = require('../models/apps_receptionists');
    const appsRichmenusMdl = require('../models/apps_richmenus');
    const appsTemplatesMdl = require('../models/apps_templates');
    const consumersMdl = require('../models/consumers');

    const fuseHlp = require('../helpers/fuse');
    const gcalendarHlp = require('../helpers/gcalendar');
    const jwtHlp = require('../helpers/jwt');

    const LINE = 'LINE';
    const SYSTEM = 'SYSTEM';

    const POSTBACK_ACTIONS = Object.freeze({
        CHANGE_RICHMENU: 'CHANGE_RICHMENU',
        SEND_REPLY_TEXT: 'SEND_REPLY_TEXT',
        SEND_TEMPLATE: 'SEND_TEMPLATE',
        SEND_IMAGEMAP: 'SEND_IMAGEMAP',
        SEND_CONSUMER_FORM: 'SEND_CONSUMER_FORM',
        PAYMENT_CONFIRM: 'PAYMENT_CONFIRM',

        SEND_APPOINTMENT_CATEGORIES: 'SEND_APPOINTMENT_CATEGORIES',
        SEND_APPOINTMENT_PRODUCTS: 'SEND_APPOINTMENT_PRODUCTS',
        SEND_APPOINTMENT_DATES: 'SEND_APPOINTMENT_DATES',
        SEND_APPOINTMENT_TIMES: 'SEND_APPOINTMENT_TIMES',
        SEND_APPOINTMENT_CONFIRM: 'SEND_APPOINTMENT_CONFIRM',
        APPOINTMENT_FINISH: 'APPOINTMENT_FINISH'
    });

    class ChatshierHelper {
        constructor() {
            this.postbackEntries = {
                [POSTBACK_ACTIONS.CHANGE_RICHMENU]: this._changeRichmenu.bind(this),
                [POSTBACK_ACTIONS.SEND_REPLY_TEXT]: this._sendReplyText.bind(this),
                [POSTBACK_ACTIONS.SEND_TEMPLATE]: this._sendTemplate.bind(this),
                [POSTBACK_ACTIONS.SEND_IMAGEMAP]: this._sendImagemap.bind(this),
                [POSTBACK_ACTIONS.SEND_CONSUMER_FORM]: this._sendConsumerForm.bind(this),
                [POSTBACK_ACTIONS.PAYMENT_CONFIRM]: this._paymentConfirm.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_CATEGORIES]: this._sendAppointmentCategories.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_PRODUCTS]: this._sendAppointmentProducts.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_DATES]: this._sendAppointmentDates.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_TIMES]: this._sendAppointmentTimes.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_CONFIRM]: this._sendAppointmentConfirm.bind(this),
                [POSTBACK_ACTIONS.APPOINTMENT_FINISH]: this._appointmentFinish.bind(this)
            };
        }

        /**
         * 根據 HTTP request body 與 app.type 決定要回傳甚麼訊息
         * @param {any[]} messages
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @param {string} appId
         * @param {Chatshier.Models.App} app
         * @returns {Promise<any[]>}
         */
        getMessageReplies(messages, webhookInfo, appId, app) {
            let eventType = webhookInfo.eventType;
            let repliedMessages = [];

            let greetingsPromise = Promise.resolve().then(() => {
                if (LINE === app.type && ('follow' === eventType || 'join' === eventType)) {
                    return appsGreetingsMdl.findGreetings(appId);
                }
                return Promise.resolve({});
            }).then((greetings) => {
                return this.prepareReplies(appId, greetings);
            });

            /** @type {Chatshier.Models.Keywordreplies} */
            let keywordreplies = {};
            let keywordrepliesPromise = Promise.all(messages.map((message) => {
                if (LINE === app.type && 'message' !== eventType) {
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
                        if (LINE === app.type && 'message' !== eventType) {
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

        /**
         * @param {any[]} messages
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @param {string} appId
         * @param {any} botSvc
         * @returns {Promise<any[]>}
         */
        getPostbackReplies(messages, webhookInfo, appId, botSvc) {
            let promises = [];

            while (messages.length > 0) {
                let message = messages.shift();
                let postback = message.postback;
                let payloadStr = postback.data || postback.payload;

                let canParseData =
                    ('string' === typeof payloadStr) && (
                        (payloadStr.startsWith('{') && payloadStr.endsWith('}')) ||
                        (payloadStr.startsWith('[') && payloadStr.endsWith(']'))
                    );
                if (!canParseData) {
                    continue;
                }

                /** @type {Webhook.Chatshier.PostbackPayload} */
                let payload = JSON.parse(payloadStr);
                let entryFunc = this.postbackEntries[payload.action];
                if (!entryFunc) {
                    continue;
                }
                promises.push(entryFunc(payload, appId, webhookInfo, botSvc));
            }

            return Promise.all(promises).then((repliedMessagesArray) => {
                return repliedMessagesArray.reduce((total, messages = []) => total.concat(messages), []);
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
         * 由於訊息中是記錄 template_id 與 imagemap_id 因此抓取出對應的訊息資料
         *
         * @param {string} appId
         * @param {any} replies
         */
        prepareReplies(appId, replies) {
            return Promise.all(Object.keys(replies).map((messageId) => {
                let reply = replies[messageId];
                switch (reply.type) {
                    case 'template':
                        if (reply.template) {
                            return Promise.resolve();
                        }
                        let templateId = reply.template_id;
                        return appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                            // 此關鍵字回覆的範本訊息可能已被刪除或找不到，因此刪除回復訊息
                            if (!(appsTemplates && appsTemplates[appId])) {
                                delete replies[messageId];
                                return;
                            }
                            let template = appsTemplates[appId].templates[templateId];
                            Object.assign(replies[messageId], template);
                        });
                    case 'imagemap':
                        if (reply.baseUrl) {
                            return Promise.resolve();
                        }
                        let imagemapId = reply.imagemap_id;
                        return appsImagemapsMdl.find(appId, imagemapId).then((appsImagemaps) => {
                            // 此關鍵字回覆的圖文訊息可能已被刪除或找不到，因此刪除回復訊息
                            if (!(appsImagemaps && appsImagemaps[appId])) {
                                delete replies[messageId];
                                return;
                            }
                            let imagemap = appsImagemaps[appId].imagemaps[imagemapId];
                            Object.assign(replies[messageId], imagemap);
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

        /**
         * @param {string} recipientUid
         * @param {Chatshier.Models.Template} templateMessage
         */
        convertTemplateToFB(recipientUid, templateMessage) {
            let template = templateMessage.template;
            let columns = template.columns ? template.columns : [template];
            let elements = columns.map((column) => {
                let element = {
                    title: column.title,
                    subtitle: column.text
                };

                if (!element.title && element.subtitle) {
                    element.title = element.subtitle;
                    delete element.subtitle;
                }

                if (column.thumbnailImageUrl) {
                    element.image_url = column.thumbnailImageUrl;
                }

                if (column.defaultAction) {
                    element.default_action = {
                        type: 'web_url',
                        url: column.defaultAction.uri
                    };
                }

                let actions = column.actions || [];
                if (actions.length > 0) {
                    element.buttons = actions.map((action) => {
                        /** @type {string} */
                        let type = action.type;
                        let button = {
                            type: type,
                            title: action.label
                        };

                        if ('uri' === action.type) {
                            if (action.uri && action.uri.startsWith('tel:')) {
                                button.type = 'phone_number';
                                button.payload = action.uri.replace('tel:', '');
                            } else {
                                button.type = 'web_url';
                                button.url = action.uri;
                            }
                        } else if ('message' === action.type) {
                            button.type = 'postback';
                            button.payload = JSON.stringify({ action: 'SEND_REPLY_TEXT', replyText: action.text || '' });
                        } else {
                            button.type = 'postback';
                            button.payload = action.data || '{}';
                        }
                        return button;
                    });
                }
                return element;
            });

            let templateBuilder = new GenericTemplateBuilder(elements);
            let templateJson = {
                recipient: {
                    id: recipientUid
                },
                message: {
                    attachment: {
                        type: 'template',
                        payload: templateBuilder.buildTemplate()
                    }
                }
            };
            return templateJson;
        }

        _checkTimeout(timestamp) {
            if (!(Date.now() - timestamp > 30 * 60 * 1000)) {
                return;
            }

            let timeoutMessage = {
                type: 'text',
                text: '此操作已逾時 30 分鐘，請重新操作。'
            };
            return timeoutMessage;
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @param {any} botSvc
         * @returns {Promise<any[]>}
         */
        _changeRichmenu(payload, appId, webhookInfo, botSvc) {
            let richmenuId = payload.richmenuId || '';

            return appsRichmenusMdl.find(appId, richmenuId).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    return;
                }

                // 如果此 richmenu 沒有啟用或者找不到，則不做任何處理
                let richmenu = appsRichmenus[appId].richmenus[richmenuId];
                if (!(richmenu && richmenu.isActivated)) {
                    return;
                }

                let platformUid = webhookInfo.platformUid;
                return botSvc.linkRichMenuToUser(platformUid, richmenu.platformMenuId, appId);
            }).then(() => []);
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @returns {Promise<any[]>}
         */
        _sendReplyText(payload) {
            if (!(payload && payload.replyText)) {
                return Promise.resolve([]);
            }
            let replyTextMessage = {
                type: 'text',
                text: payload.replyText
            };
            return Promise.resolve([ replyTextMessage ]);
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @returns {Promise<any[]>}
         */
        _sendTemplate(payload, appId) {
            let templateId = payload.templateId || '';
            let repliedMessages = [];

            return appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                if (!(appsTemplates && appsTemplates[appId])) {
                    return Promise.resolve(repliedMessages);
                }

                let template = appsTemplates[appId].templates[templateId];

                if (payload.additionalText) {
                    let additionalTextMessage = {
                        type: 'text',
                        text: payload.additionalText
                    };
                    repliedMessages.push(additionalTextMessage);
                }

                let templateMessage = {
                    type: template.type,
                    altText: template.altText,
                    template: template.template
                };
                repliedMessages.push(templateMessage);
                return repliedMessages;
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @returns {Promise<any[]>}
         */
        _sendImagemap(payload, appId) {
            let imagemapId = payload.imagemapId || '';
            let repliedMessages = [];

            return appsImagemapsMdl.find(appId, imagemapId).then((appsImagemaps) => {
                if (!(appsImagemaps && appsImagemaps[appId])) {
                    return Promise.resolve(repliedMessages);
                }

                if (payload.additionalText) {
                    let additionalTextMessage = {
                        type: 'text',
                        text: payload.additionalText
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
                return repliedMessages;
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendConsumerForm(payload, appId, webhookInfo) {
            let platformUid = webhookInfo.platformUid;
            let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
            let url = webhookInfo.serverAddress + '/consumer-form?aid=' + appId + '&t=' + token;

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
            return Promise.resolve([ formMessage ]);
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _paymentConfirm(payload, appId, webhookInfo) {
            let repliedMessages = [];

            return appsPaymentsMdl.find(appId).then((appsPayments) => {
                // 如果此 App 尚未設定金流服務，則跳過處理
                if (!(appsPayments && appsPayments[appId])) {
                    return Promise.resolve(void 0);
                }
                return Promise.resolve(Object.values(appsPayments[appId].payments).shift());
            }).then((payment) => {
                if (!payment) {
                    return repliedMessages;
                }

                let platformUid = webhookInfo.platformUid;
                return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid).then((appsChatroomsMessagers) => {
                    if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                        return repliedMessages;
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

                    let url = webhookInfo.serverAddress;
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
                        return repliedMessages;
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
                    return repliedMessages;
                });
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendAppointmentCategories(payload, appId, webhookInfo) {
            let repliedMessages = [];

            return appsCategoriesMdl.find(appId, void 0, { 'categories.type': 'APPOINTMENT' }).then((appsCategories) => {
                if (!(appsCategories && appsCategories[appId])) {
                    let noCategoriesMessage = {
                        type: 'text',
                        text: '很抱歉，現在沒有可預約的目錄。'
                    };
                    repliedMessages.push(noCategoriesMessage);
                    return repliedMessages;
                }

                let categories = appsCategories[appId].categories;
                let categoryIds = Object.keys(categories);

                /** @type {string[][]} */
                let categoryColumns = [];
                while (categoryIds.length > 3) {
                    categoryColumns.push(categoryIds.splice(0, 3));
                }
                categoryColumns.push(categoryIds);

                let url = webhookInfo.serverAddress;
                let categoriesMessage = {
                    type: 'template',
                    altText: '預約目錄',
                    template: {
                        type: 'carousel',
                        columns: categoryColumns.map((categoryIds) => {
                            if (categoryColumns.length > 1) {
                                while (categoryIds.length < 3) {
                                    categoryIds.push('');
                                }
                            }

                            /** @type {Chatshier.Models.TemplateColumn} */
                            let column = {
                                title: '預約目錄',
                                text: '請選擇要預約的目錄',
                                thumbnailImageUrl: url + '/image/logo-no-transparent.png',
                                actions: categoryIds.map((categoryId) => {
                                    /** @type {Chatshier.Models.TemplateAction} */
                                    let action = {
                                        type: 'postback',
                                        label: '　',
                                        data: 'none'
                                    };

                                    if (!categoryId) {
                                        return action;
                                    }

                                    let category = categories[categoryId];
                                    /** @type {Webhook.Chatshier.PostbackPayload} */
                                    let payloadJson = {
                                        action: 'SEND_APPOINTMENT_PRODUCTS',
                                        categoryId: categoryId,
                                        timestamp: Date.now()
                                    };

                                    action.label = category.name;
                                    action.data = JSON.stringify(payloadJson);
                                    return action;
                                })
                            };
                            return column;
                        })
                    }
                };
                repliedMessages.push(categoriesMessage);
                return repliedMessages;
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendAppointmentProducts(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let noProductsMessage = {
                type: 'text',
                text: '很抱歉，該預約目錄內沒有可預約的項目。'
            };

            let categoryId = payload.categoryId || '';
            return appsCategoriesMdl.find(appId, categoryId, { 'categories.type': 'APPOINTMENT' }).then((appsCategories) => {
                if (!(appsCategories && appsCategories[appId])) {
                    let noCategoriesMessage = {
                        type: 'text',
                        text: '很抱歉，找不到這個預約目錄。'
                    };
                    repliedMessages.push(noCategoriesMessage);
                    return repliedMessages;
                }

                let category = appsCategories[appId].categories[categoryId] || {};
                let productIds = category.product_ids || [];
                if (0 === productIds.length) {
                    repliedMessages.push(noProductsMessage);
                    return repliedMessages;
                }

                let query = {
                    'products.type': 'APPOINTMENT',
                    'products.isOnShelf': true
                };
                return appsProductsMdl.find(appId, productIds, query).then((appsProducts) => {
                    if (!(appsProducts && appsProducts[appId])) {
                        repliedMessages.push(noProductsMessage);
                        return repliedMessages;
                    }

                    let products = appsProducts[appId].products;
                    let productsMessage = {
                        type: 'template',
                        altText: '預約項目',
                        template: {
                            type: 'carousel',
                            /** @type {Chatshier.Models.TemplateColumn[]} */
                            columns: []
                        }
                    };
                    return Promise.all(productIds.map((productId) => {
                        let product = products[productId];
                        let receptionistIds = product.receptionist_ids || [];

                        // 服務人員數量有可能超過 3 個，因此每 3 筆資料切成一張卡片
                        let productColumns = [];
                        while (receptionistIds.length > 3) {
                            productColumns.push(receptionistIds.splice(0, 3));
                        }
                        productColumns.push(receptionistIds);

                        return Promise.all(productColumns.map((receptionistIds) => {
                            // 抓取出此產品內所有的服務人員，以便顯示服務人員名稱
                            return appsReceptionistsMdl.find(appId, receptionistIds).then((appsReceptionists) => {
                                if (!(appsReceptionists && appsReceptionists[appId])) {
                                    return;
                                }

                                if (productIds.length > 1 || productColumns.length > 1) {
                                    while (receptionistIds.length < 3) {
                                        receptionistIds.push('');
                                    }
                                }
                                let receptionists = appsReceptionists[appId].receptionists;
                                let url = webhookInfo.serverAddress;

                                /** @type {Chatshier.Models.TemplateColumn} */
                                let column = {
                                    title: '預約 - ' + product.name,
                                    text: '請選擇要預約的對象',
                                    thumbnailImageUrl: product.src || (url + '/image/logo-no-transparent.png'),
                                    actions: receptionistIds.map((receptionistId) => {
                                        /** @type {Chatshier.Models.TemplateAction} */
                                        let action = {
                                            type: 'postback',
                                            label: '　',
                                            data: 'none'
                                        };

                                        if (!(receptionistId && receptionists[receptionistId])) {
                                            return action;
                                        }

                                        let receptionist = receptionists[receptionistId];
                                        /** @type {Webhook.Chatshier.PostbackPayload} */
                                        let payloadJson = {
                                            action: 'SEND_APPOINTMENT_DATES',
                                            productId: productId,
                                            receptionistId: receptionistId,
                                            timestamp: Date.now()
                                        };

                                        action.label = receptionist.name;
                                        action.data = JSON.stringify(payloadJson);
                                        return action;
                                    }).sort((a, b) => {
                                        if ('none' === a.data && 'none' !== b.data) {
                                            return 1;
                                        } else if ('none' !== a.data && 'none' === b.data) {
                                            return -1;
                                        } else {
                                            return 0;
                                        }
                                    })
                                };
                                return column;
                            });
                        })).then((columns) => {
                            // 建立的卡片必須依照順序，因此須等到 Promise.all 結束後，再依照順序插入
                            columns.forEach((column) => {
                                if (!column) {
                                    return;
                                }
                                productsMessage.template.columns.push(column);
                            });
                        });
                    })).then(() => {
                        if (0 === productsMessage.template.columns.length) {
                            repliedMessages.push(noProductsMessage);
                        } else {
                            repliedMessages.push(productsMessage);
                        }
                        return repliedMessages;
                    });
                });
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendAppointmentDates(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let productId = payload.productId || '';
            let receptionistId = payload.receptionistId || '';
            let noDateMessage = {
                type: 'text',
                text: '很抱歉，目前沒有可預約的日期。'
            };

            return appsReceptionistsMdl.find(appId, receptionistId).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    repliedMessages.push(noDateMessage);
                    return repliedMessages;
                }

                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let schedules = receptionist.schedules;
                let scheduleIds = Object.keys(schedules).sort((a, b) => {
                    if (schedules[a].start.dateTime > schedules[b].start.dateTime) {
                        return 1;
                    } else if (schedules[a].start.dateTime < schedules[b].start.dateTime) {
                        return -1;
                    } else {
                        return 0;
                    }
                });

                if (0 === scheduleIds.length) {
                    repliedMessages.push(noDateMessage);
                    return repliedMessages;
                }

                /** @type {{[scheduleId: string]: Date[]}} */
                let scheduleDates = {};
                for (let i in scheduleIds) {
                    let scheduleId = scheduleIds[i];
                    let schedule = schedules[scheduleId];
                    let dates = gcalendarHlp.getEventDates(schedule, 30);
                    dates.length > 0 && (scheduleDates[scheduleId] = dates);
                }

                let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                let datesMessage = {
                    type: 'template',
                    altText: '預約日期',
                    template: {
                        type: 'carousel',
                        /** @type {Chatshier.Models.TemplateColumn[]} */
                        columns: []
                    }
                };

                let url = webhookInfo.serverAddress;
                let columns = [];
                let actions = [];
                for (let scheduleId in scheduleDates) {
                    let dates = scheduleDates[scheduleId];

                    while (dates.length > 0 && columns.length < 10) {
                        let date = dates.shift();
                        if (!date) {
                            continue;
                        }

                        /** @type {Chatshier.Models.TemplateAction} */
                        let action = {
                            type: 'postback',
                            label: '　',
                            data: 'none'
                        };

                        /** @type {Webhook.Chatshier.PostbackPayload} */
                        let payloadJson = {
                            action: 'SEND_APPOINTMENT_TIMES',
                            productId: productId,
                            receptionistId: receptionistId,
                            scheduleId: scheduleId,
                            timestamp: Date.now()
                        };

                        let startedTimeLocal = new Date(date.getTime() - timezoneOffset);
                        let appointDate = startedTimeLocal.toISOString().split('T').shift();
                        action.label = appointDate || action.label;
                        action.data = JSON.stringify(payloadJson);
                        actions.push(action);

                        if (actions.length >= 3) {
                            /** @type {Chatshier.Models.TemplateColumn} */
                            let column = {
                                title: '預約 - ' + receptionist.name,
                                text: '請選擇要預約的日期',
                                thumbnailImageUrl: receptionist.photo || (url + '/image/logo-no-transparent.png'),
                                actions: actions.slice()
                            };
                            actions.length = 0;
                            columns.push(column);

                            if (columns.length >= 10) {
                                break;
                            }
                        }
                    }
                }

                if (actions.length > 0 && columns.length < 10) {
                    /** @type {Chatshier.Models.TemplateColumn} */
                    let column = {
                        title: '預約 - ' + receptionist.name,
                        text: '請選擇要預約的日期',
                        thumbnailImageUrl: receptionist.photo || (url + '/image/logo-no-transparent.png'),
                        actions: actions.slice()
                    };

                    while (column.actions.length < 3) {
                        column.actions.push({
                            type: 'postback',
                            label: '　',
                            data: 'none'
                        });
                    }
                    columns.push(column);
                    actions.length = 0;
                }
                datesMessage.template.columns = columns;
                repliedMessages.push(datesMessage);
                return repliedMessages;
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendAppointmentTimes(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let productId = payload.productId || '';
            let receptionistId = payload.receptionistId || '';
            let scheduleId = payload.scheduleId || '';

            let noTimeMessage = {
                type: 'text',
                text: '很抱歉，目前沒有可預約的時間。'
            };
            if (!scheduleId) {
                repliedMessages.push(noTimeMessage);
                return Promise.resolve(repliedMessages);
            }

            return appsReceptionistsMdl.find(appId, receptionistId).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    repliedMessages.push(noTimeMessage);
                    return repliedMessages;
                }

                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let schedule = receptionist.schedules[scheduleId];

                let serviceInterval = receptionist.interval;
                let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                let startTime = new Date(schedule.start.dateTime);
                let endTime = new Date(schedule.end.dateTime);
                endTime.setFullYear(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

                let serviceTimes = Math.floor((endTime.getTime() - startTime.getTime()) / serviceInterval);
                startTime = new Date(startTime.getTime() - timezoneOffset);

                let availableTimes = [];
                for (let i = 0; i < serviceTimes; i++) {
                    endTime = new Date(startTime.getTime() + serviceInterval);

                    let start = startTime.toISOString(); // 2018-07-29T07:00:10.411Z
                    start = start.split('T').pop() || ''; // 07:00:10.411Z
                    start = start.substring(0, 5); // 07:00

                    let end = endTime.toISOString(); // 2018-07-29T08:00:10.411Z
                    end = end.split('T').pop() || ''; // 08:00:10.411Z
                    end = end.substring(0, 5); // 08:00

                    availableTimes.push(start + ' ~ ' + end);
                    startTime = new Date(startTime.getTime() + serviceInterval);
                }

                if (0 === availableTimes.length) {
                    repliedMessages.push(noTimeMessage);
                    return repliedMessages;
                }

                // 預約時間數量有可能超過 3 個，因此每 3 筆資料切成一張卡片
                let timeColumns = [];
                while (availableTimes.length > 3) {
                    timeColumns.push(availableTimes.splice(0, 3));
                }
                timeColumns.push(availableTimes);

                let url = webhookInfo.serverAddress;
                let timesMessage = {
                    type: 'template',
                    altText: '預約時間',
                    template: {
                        type: 'carousel',
                        /** @type {Chatshier.Models.TemplateColumn[]} */
                        columns: timeColumns.map((availableTimes) => {
                            if (timeColumns.length > 1) {
                                while (availableTimes.length < 3) {
                                    availableTimes.push('');
                                }
                            }

                            /** @type {Chatshier.Models.TemplateColumn} */
                            let column = {
                                title: '預約 - ' + receptionist.name,
                                text: '請選擇要預約的時間',
                                thumbnailImageUrl: receptionist.photo || url + '/image/logo-no-transparent.png',
                                actions: availableTimes.map((availableTime) => {
                                    /** @type {Chatshier.Models.TemplateAction} */
                                    let action = {
                                        type: 'postback',
                                        label: '　',
                                        data: 'none'
                                    };

                                    if (!availableTime) {
                                        return action;
                                    }

                                    let timeSplits = availableTime.split('~');
                                    let startedTime = (timeSplits.shift() || '　').trim();
                                    let endedTime = (timeSplits.shift() || '　').trim();

                                    /** @type {Webhook.Chatshier.PostbackPayload} */
                                    let payloadJson = {
                                        action: 'SEND_APPOINTMENT_CONFIRM',
                                        productId: productId,
                                        receptionistId: receptionistId,
                                        scheduleId: scheduleId,
                                        startedTime: startedTime,
                                        endedTime: endedTime,
                                        timestamp: Date.now()
                                    };

                                    action.label = availableTime;
                                    action.data = JSON.stringify(payloadJson);
                                    return action;
                                })
                            };
                            return column;
                        })
                    }
                };
                repliedMessages.push(timesMessage);
                return repliedMessages;
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @returns {Promise<any[]>}
         */
        _sendAppointmentConfirm(payload, appId) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let categoryId = payload.categoryId || '';
            let productId = payload.productId || '';
            let receptionistId = payload.receptionistId || '';
            let scheduleId = payload.scheduleId || '';
            let startedTime = payload.startedTime;
            let endedTime = payload.endedTime;

            if (!(receptionistId && scheduleId && startedTime && endedTime)) {
                let invalidMessage = {
                    type: 'text',
                    text: '很抱歉，無法確認您的預約資料，請重新操作。'
                };
                repliedMessages.push(invalidMessage);
                return Promise.resolve(repliedMessages);
            }

            return Promise.all([
                appsCategoriesMdl.find(appId, categoryId, { 'categories.type': 'APPOINTMENT' }),
                appsProductsMdl.find(appId, productId, { 'products.type': 'APPOINTMENT' }),
                appsReceptionistsMdl.find(appId, receptionistId)
            ]).then(([ appsCategories, appsProducts, appsReceptionists ]) => {
                if (!(appsCategories && appsCategories[appId]) ||
                    !(appsProducts && appsProducts[appId]) ||
                    !(appsReceptionists && appsReceptionists[appId])) {
                    let invalidMessage = {
                        type: 'text',
                        text: '很抱歉，無法建立此預約！請重新操作。'
                    };
                    repliedMessages.push(invalidMessage);
                    return repliedMessages;
                }

                let product = appsProducts[appId].products[productId];
                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let schedule = receptionist.schedules[scheduleId];
                let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                let startedTimeLocal = new Date(new Date(schedule.start.dateTime).getTime() - timezoneOffset);
                let appointDate = startedTimeLocal.toISOString().split('T').shift();

                let infoMessage = {
                    type: 'text',
                    text: (
                        '以下是您的預約資料:\n' +
                        '\n' +
                        '預約項目: ' + product.name + '\n' +
                        '\n' +
                        '預約對象: ' + receptionist.name + '\n' +
                        '\n' +
                        '預約時間:\n' +
                        '\n' +
                        '【' + appointDate + '】\n' +
                        '【' + startedTime + ' ~ ' + endedTime + '】'
                    )
                };

                let appointmentId = appsAppointmentsMdl.Types.ObjectId().toHexString();
                /** @type {Webhook.Chatshier.PostbackPayload} */
                let payloadJson = {
                    action: 'APPOINTMENT_FINISH',
                    appointmentId: appointmentId,
                    productId: productId,
                    receptionistId: receptionistId,
                    scheduleId: payload.scheduleId,
                    startedTime: startedTime,
                    endedTime: endedTime,
                    timestamp: Date.now()
                };
                let confirmMessage = {
                    type: 'template',
                    altText: '預約時間',
                    template: {
                        type: 'buttons',
                        title: '確認預約',
                        text: '請確認以上資料是否無誤',
                        actions: [{
                            type: 'postback',
                            label: '確認預約',
                            data: JSON.stringify(payloadJson)
                        }]
                    }
                };
                repliedMessages.push(infoMessage, confirmMessage);
                return repliedMessages;
            });
        }

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _appointmentFinish(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let invalidMessage = {
                type: 'text',
                text: '很抱歉，無法建立此預約！請重新操作。'
            };

            let appointmentId = payload.appointmentId || '';
            if (!appointmentId) {
                repliedMessages.push(invalidMessage);
                return Promise.resolve(repliedMessages);
            }

            let productId = payload.productId || '';
            let receptionistId = payload.receptionistId || '';
            let scheduleId = payload.scheduleId || '';
            let startedTimeStr = payload.startedTime;
            let endedTimeStr = payload.endedTime;
            let platformUid = webhookInfo.platformUid;

            return appsAppointmentsMdl.find(appId, appointmentId, {}).then((appsAppointments) => {
                if (appsAppointments && appsAppointments[appId]) {
                    let existedMessage = {
                        type: 'text',
                        text: '此預約已經建立，感謝您的預約！'
                    };
                    repliedMessages.push(existedMessage);
                    return Promise.reject(new Error('MANUAL_ABORT'));
                }

                let _appointment = {
                    _id: appointmentId,
                    product_id: productId,
                    receptionist_id: receptionistId,
                    platformUid: platformUid
                };

                return Promise.all([
                    appsMdl.find(appId),
                    appsProductsMdl.find(appId, productId, { 'products.type': 'APPOINTMENT' }),
                    appsReceptionistsMdl.find(appId, receptionistId),
                    appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid, false),
                    consumersMdl.find(platformUid),
                    appsAppointmentsMdl.insert(appId, _appointment)
                ]);
            }).then(([ apps, appsProducts, appsReceptionists, appsChatroomsMessagers, consumers ]) => {
                if (!(apps && apps[appId]) ||
                    !(appsProducts && appsProducts[appId]) ||
                    !(appsReceptionists && appsReceptionists[appId]) ||
                    !(appsChatroomsMessagers && appsChatroomsMessagers[appId]) ||
                    !(consumers && consumers[platformUid])) {
                    repliedMessages.push(invalidMessage);
                    return Promise.reject(new Error('MANUAL_ABORT'));
                }

                let app = apps[appId];
                let product = appsProducts[appId].products[productId];
                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let messager = Object.values(appsChatroomsMessagers[appId].chatrooms)[0].messagers[platformUid];
                let consumer = consumers[platformUid];
                let summary = consumer.name + ' 向 ' + receptionist.name + ' 預約 ' + product.name;
                let description = (
                    '大頭貼: <a href="' + consumer.photo + '" target="_blank">連結</a>\n' +
                    '名稱: ' + consumer.name
                );
                messager.email && (description += '\nEmail: ' + messager.email);
                messager.phone && (description += '\n電話: ' + messager.phone);
                messager.gender && (description += '\n性別: ' + ('MALE' === messager.gender ? '男' : '女'));
                messager.age && (description += '\n年齡: ' + messager.age);

                return Promise.resolve().then(() => {
                    let gcalendarId = app.gcalendarId;
                    if (!gcalendarId) {
                        let summary = '[' + app.name + '] - ' + appId;
                        let description = 'Created by ' + CHATSHIER_CFG.GAPI.USER;

                        return gcalendarHlp.insertCalendar(summary, description).then((gcalendar) => {
                            gcalendarId = gcalendar.id;
                            let _app = { gcalendarId: gcalendarId };
                            return appsMdl.update(appId, _app);
                        }).then(() => {
                            return Promise.resolve(gcalendarId);
                        });
                    }
                    return Promise.resolve(gcalendarId);
                }).then((gcalendarId) => {
                    let attendees = [{
                        name: receptionist.name,
                        email: receptionist.email
                    }];

                    messager.email && attendees.push({
                        name: consumer.name,
                        email: messager.email
                    });

                    let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                    let schedule = receptionist.schedules[scheduleId];
                    let startDateTime = new Date(schedule.start.dateTime);
                    let startTimeLocal = new Date(startDateTime.getTime() - timezoneOffset);
                    let appointDate = startTimeLocal.toISOString().split('T').shift();
                    startTimeLocal = new Date(appointDate + ' ' + startedTimeStr);
                    startDateTime = new Date(startTimeLocal.getTime() + timezoneOffset);

                    let endTimeLocal = new Date(appointDate + ' ' + endedTimeStr);
                    let endDateTime = new Date(endTimeLocal.getTime() + timezoneOffset);

                    return gcalendarHlp.insertEvent(gcalendarId, {
                        summary: summary,
                        description: description,
                        startDateTime: startDateTime,
                        endDateTime: endDateTime,
                        attendees: attendees
                    }).then((gcalendarEvent) => {
                        let webhookUrl = webhookInfo.serverAddress + '/webhook-google/calendar/appointments?appid=' + appId;
                        let _appointment = {
                            startedTime: startDateTime,
                            endedTime: endDateTime,
                            eventId: gcalendarEvent.id,
                            summary: gcalendarEvent.summary,
                            description: gcalendarEvent.description
                        };

                        return Promise.all([
                            gcalendarHlp.watchEvent(gcalendarId, gcalendarEvent.id, webhookUrl),
                            appsAppointmentsMdl.update(appId, appointmentId, _appointment)
                        ]).then(([ channel ]) => {
                            return appsAppointmentsMdl.update(appId, appointmentId, { eventChannelId: channel.resourceId });
                        }).then((appsAppointments) => {
                            if (!(appsAppointments && appsAppointments[appId])) {
                                let failedMessage = {
                                    type: 'text',
                                    text: '很抱歉！此預約建立失敗，請聯絡客服或重新操作'
                                };
                                repliedMessages.push(failedMessage);
                                return repliedMessages;
                            }

                            let successMessage = {
                                type: 'text',
                                text: (
                                    (consumer.name ? consumer.name + ' ' : '') + '您好:\n' +
                                    '\n' +
                                    '已為您建立預約。' +
                                    '\n\n' +
                                    '【' + product.name + '】\n' +
                                    '【' + receptionist.name + '】\n' +
                                    '【' + appointDate + '】\n' +
                                    '【' + startedTimeStr + ' ~ ' + endedTimeStr + '】\n' +
                                    '\n' +
                                    '感謝您的預約！'
                                )
                            };
                            repliedMessages.push(successMessage);
                            return repliedMessages;
                        });
                    });
                });
            }).catch((err) => {
                if (err && 'MANUAL_ABORT' === err.message) {
                    return repliedMessages;
                }
                return Promise.reject(err);
            });
        }
    }

    return new ChatshierHelper();
})();
