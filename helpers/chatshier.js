module.exports = (function() {
    /** @type {any} */
    const ERROR = require('../config/error.json');
    const CHATSHIER_CFG = require('../config/chatshier');

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

    /** @type {Webhook.Chatshier.PostbackActions} */
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
        APPOINTMENT_FINISH: 'APPOINTMENT_FINISH',
        SEND_CONSUMER_APPOINTMENTS: 'SEND_CONSUMER_APPOINTMENTS',
        CANCEL_APPOINTMENT: 'CANCEL_APPOINTMENT'
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

                // 預約系統
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_CATEGORIES]: this._sendAppointmentCategories.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_PRODUCTS]: this._sendAppointmentProducts.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_DATES]: this._sendAppointmentDates.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_TIMES]: this._sendAppointmentTimes.bind(this),
                [POSTBACK_ACTIONS.SEND_APPOINTMENT_CONFIRM]: this._sendAppointmentConfirm.bind(this),
                [POSTBACK_ACTIONS.APPOINTMENT_FINISH]: this._appointmentFinish.bind(this),
                [POSTBACK_ACTIONS.SEND_CONSUMER_APPOINTMENTS]: this._sendConsumerAppointments.bind(this),
                [POSTBACK_ACTIONS.CANCEL_APPOINTMENT]: this._cancelAppointment.bind(this)
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
                                return Promise.reject(ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
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

        _getAppGCalendarId(appId) {
            return appsMdl.find(appId).then((apps) => {
                if (!(apps && apps[appId])) {
                    return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                }

                let app = apps[appId];
                let gcalendarId = app.gcalendarId;
                if (gcalendarId) {
                    return gcalendarId;
                }

                let summary = '[' + app.name + '] - ' + appId;
                let description = 'Created by ' + CHATSHIER_CFG.GMAIL.USER;
                return gcalendarHlp.insertCalendar(summary, description).catch(() => {
                    return Promise.reject(ERROR.GOOGLE_CALENDAR_FAILED_TO_INSERT);
                }).then((gcalendar) => {
                    gcalendarId = gcalendar.id;
                    let _app = { gcalendarId: gcalendarId };
                    return appsMdl.update(appId, _app);
                }).then(() => {
                    return gcalendarId;
                });
            });
        }

        _checkAppointmentTimeout(timestamp) {
            if (!(Date.now() - timestamp > 10 * 60 * 1000)) {
                return;
            }

            let timeoutMessage = {
                type: 'text',
                text: '此操作已逾時 10 分鐘，請重新操作。'
            };
            return timeoutMessage;
        }

        _getConsumerFormTemplate(appId, platformUid, serverAddress) {
            let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
            let url = serverAddress + '/consumer-form?aid=' + appId + '&t=' + token;

            let consumerFormTemplate = {
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
            return consumerFormTemplate;
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
            let serverAddress = webhookInfo.serverAddress;
            let formMessage = this._getConsumerFormTemplate(appId, platformUid, serverAddress);
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
                    let messager = Object.values(appsChatroomsMessagers[appId].chatrooms)[0].messagers[platformUid];
                    let hasFinishProfile = (
                        messager &&
                        messager.namings && messager.namings[platformUid] &&
                        messager.email &&
                        messager.phone &&
                        messager.address
                    );

                    if (!hasFinishProfile) {
                        let alertMessage = {
                            type: 'text',
                            text: '您尚未完成個人基本資料的填寫'
                        };

                        let serverAddress = webhookInfo.serverAddress;
                        let formMessage = this._getConsumerFormTemplate(appId, platformUid, serverAddress);
                        repliedMessages.push(alertMessage, formMessage);
                        return repliedMessages;
                    }

                    let token = jwtHlp.sign(platformUid, 30 * 60 * 1000);
                    let url = webhookInfo.serverAddress + '/donation-confirm?aid=' + appId + '&t=' + token;
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
            let platformUid = webhookInfo.platformUid;

            return appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid).then((appsChatroomsMessagers) => {
                if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                    return repliedMessages;
                }

                let messager = Object.values(appsChatroomsMessagers[appId].chatrooms)[0].messagers[platformUid];
                let hasFinishProfile = (
                    messager &&
                    messager.namings && messager.namings[platformUid] &&
                    messager.email &&
                    messager.phone &&
                    messager.address
                );

                if (!hasFinishProfile) {
                    let alertMessage = {
                        type: 'text',
                        text: '預約前，請先完成您的個人基本資料填寫'
                    };

                    let serverAddress = webhookInfo.serverAddress;
                    let formMessage = this._getConsumerFormTemplate(appId, platformUid, serverAddress);
                    repliedMessages.push(alertMessage, formMessage);
                    return repliedMessages;
                }

                return appsCategoriesMdl.find({ appIds: appId, type: 'APPOINTMENT' }).then((appsCategories) => {
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
                                    thumbnailImageUrl: url + '/image/default-category.png',
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
                                            action: POSTBACK_ACTIONS.SEND_APPOINTMENT_PRODUCTS,
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
            let timeoutMessage = this._checkAppointmentTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let noProductsMessage = {
                type: 'text',
                text: '很抱歉，該預約目錄內沒有可預約的項目。'
            };

            let categoryId = payload.categoryId || '';
            return appsCategoriesMdl.find({ appIds: appId, categoryIds: categoryId, type: 'APPOINTMENT' }).then((appsCategories) => {
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
                    appIds: appId,
                    productIds: productIds,
                    type: 'APPOINTMENT',
                    isOnShelf: true
                };
                return appsProductsMdl.find(query).then((appsProducts) => {
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
                    let _productIds = Object.keys(products);

                    return Promise.all(_productIds.map((productId) => {
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
                            return appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistIds }).then((appsReceptionists) => {
                                if (!(appsReceptionists && appsReceptionists[appId])) {
                                    return;
                                }

                                if (_productIds.length > 1 || productColumns.length > 1) {
                                    while (receptionistIds.length < 3) {
                                        receptionistIds.push('');
                                    }
                                }
                                let receptionists = appsReceptionists[appId].receptionists;
                                let url = webhookInfo.serverAddress;

                                /** @type {Chatshier.Models.TemplateColumn} */
                                let column = {
                                    title: product.name,
                                    text: '請選擇要預約的對象',
                                    thumbnailImageUrl: product.src || (url + '/image/default-product.png'),
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
                                            action: POSTBACK_ACTIONS.SEND_APPOINTMENT_DATES,
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
            let timeoutMessage = this._checkAppointmentTimeout(timestamp);
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

            return appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }).then((appsReceptionists) => {
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
                    let dates = gcalendarHlp.getEventDates(schedule, new Date(), 30);
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
                        let startedTimeLocal = new Date(date.getTime() - timezoneOffset);
                        let appointmentDate = startedTimeLocal.toISOString().split('T').shift();

                        /** @type {Webhook.Chatshier.PostbackPayload} */
                        let payloadJson = {
                            action: POSTBACK_ACTIONS.SEND_APPOINTMENT_TIMES,
                            productId: productId,
                            receptionistId: receptionistId,
                            scheduleId: scheduleId,
                            appointmentDate: appointmentDate,
                            timestamp: Date.now()
                        };

                        action.label = appointmentDate || action.label;
                        action.data = JSON.stringify(payloadJson);
                        actions.push(action);

                        if (actions.length >= 3) {
                            /** @type {Chatshier.Models.TemplateColumn} */
                            let column = {
                                title: receptionist.name,
                                text: '請選擇要預約的日期',
                                thumbnailImageUrl: receptionist.photo || (url + '/image/default-consumer.png'),
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
                        thumbnailImageUrl: receptionist.photo || (url + '/image/default-consumer.png'),
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
            let timeoutMessage = this._checkAppointmentTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let productId = payload.productId || '';
            let receptionistId = payload.receptionistId || '';
            let scheduleId = payload.scheduleId || '';
            let appointmentDate = payload.appointmentDate || '';

            let noTimeMessage = {
                type: 'text',
                text: '很抱歉，目前沒有可預約的時間。'
            };
            if (!scheduleId) {
                repliedMessages.push(noTimeMessage);
                return Promise.resolve(repliedMessages);
            }

            let startedTime = new Date(appointmentDate);
            let endedTime = new Date(startedTime.getTime() + 86400000);

            return Promise.all([
                appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }),
                // 抓出該日 24 小時內的所有預約
                appsAppointmentsMdl.find({ appIds: appId, startedTime: startedTime, endedTime: endedTime })
            ]).then(([ appsReceptionists, appsAppointments ]) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    repliedMessages.push(noTimeMessage);
                    return repliedMessages;
                }

                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let schedule = receptionist.schedules[scheduleId];
                let serviceInterval = receptionist.interval;
                let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                let startedTimeLocal = new Date(schedule.start.dateTime);
                let endedTimeLocal = new Date(schedule.end.dateTime);
                endedTimeLocal.setFullYear(startedTimeLocal.getFullYear(), startedTimeLocal.getMonth(), startedTimeLocal.getDate());

                let serviceTimes = Math.floor((endedTimeLocal.getTime() - startedTimeLocal.getTime()) / serviceInterval);
                startedTimeLocal = new Date(startedTimeLocal.getTime() - timezoneOffset);

                if (!(appsAppointments && appsAppointments[appId])) {
                    appsAppointments = { [appId]: { appointments: {} } };
                }

                let excludeTimes = [];
                let appointments = appsAppointments[appId].appointments;
                for (let appointmentId in appointments) {
                    let appointment = appointments[appointmentId];
                    let _startedTimeLocal = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                    let _endedTimeLocal = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);

                    let _start = _startedTimeLocal.toISOString();
                    _start = _start.split('T').pop() || '';
                    _start = _start.substring(0, 5);

                    let _end = _endedTimeLocal.toISOString();
                    _end = _end.split('T').pop() || '';
                    _end = _end.substring(0, 5);
                    excludeTimes.push(_start + ' ~ ' + _end);
                }

                let availableTimes = [];
                for (let i = 0; i < serviceTimes; i++) {
                    endedTimeLocal = new Date(startedTimeLocal.getTime() + serviceInterval);

                    let start = startedTimeLocal.toISOString(); // 2018-07-29T07:00:10.411Z
                    start = start.split('T').pop() || ''; // 07:00:10.411Z
                    start = start.substring(0, 5); // 07:00

                    let end = endedTimeLocal.toISOString(); // 2018-07-29T08:00:10.411Z
                    end = end.split('T').pop() || ''; // 08:00:10.411Z
                    end = end.substring(0, 5); // 08:00

                    let periodStr = start + ' ~ ' + end;
                    !excludeTimes.includes(periodStr) && availableTimes.push(periodStr);
                    startedTimeLocal = new Date(startedTimeLocal.getTime() + serviceInterval);
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
                                title: receptionist.name,
                                text: '請選擇要預約的時間',
                                thumbnailImageUrl: receptionist.photo || url + '/image/default-consumer.png',
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
                                        action: POSTBACK_ACTIONS.SEND_APPOINTMENT_CONFIRM,
                                        productId: productId,
                                        receptionistId: receptionistId,
                                        scheduleId: scheduleId,
                                        appointmentDate: appointmentDate,
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
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendAppointmentConfirm(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkAppointmentTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let platformUid = webhookInfo.platformUid;
            let productId = payload.productId || '';
            let receptionistId = payload.receptionistId || '';
            let scheduleId = payload.scheduleId || '';
            let appointmentDate = payload.appointmentDate || '';
            let startedTimeStr = payload.startedTime;
            let endedTimeStr = payload.endedTime;

            let invalidMessage = {
                type: 'text',
                text: '很抱歉，無法建立此預約！請重新操作。'
            };
            if (!(receptionistId && scheduleId && startedTimeStr && endedTimeStr)) {
                repliedMessages.push(invalidMessage);
                return Promise.resolve(repliedMessages);
            }

            return appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    repliedMessages.push(invalidMessage);
                    return repliedMessages;
                }
                let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                let maxNumberPerDay = receptionist.maxNumberPerDay;
                let startedTime = new Date(appointmentDate);
                let endedTime = new Date(startedTime.getTime() + 86400000);

                return Promise.all([
                    appsProductsMdl.find({ appIds: appId, productIds: productId, type: 'APPOINTMENT' }),
                    appsAppointmentsMdl.find({ appIds: appId, receptionistId: receptionistId, startedTime: startedTime, endedTime: endedTime }),
                    appsAppointmentsMdl.find({ appIds: appId, platformUid: platformUid })
                ]).then(([ appsProducts, appsAppointmentsR, appsAppointmentsP ]) => {
                    if (!(appsProducts && appsProducts[appId])) {
                        repliedMessages.push(invalidMessage);
                        return repliedMessages;
                    }

                    if (!(appsAppointmentsR && appsAppointmentsR[appId])) {
                        appsAppointmentsR = { [appId]: { appointments: {} } };
                    }
                    let appointmentsR = appsAppointmentsR[appId].appointments;
                    if (maxNumberPerDay && Object.keys(appointmentsR).length >= maxNumberPerDay) {
                        let fullMessage = {
                            type: 'text',
                            text: '很抱歉，該預約對象當天的預約數已達上限，無法預約！請選擇其他日期。'
                        };
                        repliedMessages.push(fullMessage);
                        return repliedMessages;
                    }

                    if (!(appsAppointmentsP && appsAppointmentsP[appId])) {
                        appsAppointmentsP = { [appId]: { appointments: {} } };
                    }
                    let appointmentsP = appsAppointmentsP[appId].appointments;
                    let product = appsProducts[appId].products[productId];

                    for (let appointmentId in appointmentsP) {
                        let appointment = appointmentsP[appointmentId];
                        let startedTimeLocal = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                        let endedTimeLocal = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);

                        let _startedTimeStr = startedTimeLocal.toISOString();
                        let _appointmentDate = _startedTimeStr.split('T').shift();
                        _startedTimeStr = (_startedTimeStr.split('T').pop() || '').substring(0, 5);

                        let _endedTimeStr = endedTimeLocal.toISOString();
                        _endedTimeStr = (_endedTimeStr.split('T').pop() || '').substring(0, 5);

                        if (_appointmentDate === appointmentDate &&
                            _startedTimeStr === startedTimeStr &&
                            _endedTimeStr === endedTimeStr) {
                            let duplicatedMessage = {
                                type: 'text',
                                text: (
                                    '您在:\n\n' +
                                    '預約項目:\n' +
                                    '【' + product.name + '】\n\n' +
                                    '預約對象:\n' +
                                    '【' + receptionist.name + '】\n\n' +
                                    '預約時間:\n' +
                                    '【' + appointmentDate + '】\n' +
                                    '【' + startedTimeStr + ' ~ ' + endedTimeStr + '】\n\n' +
                                    '已有預約了'
                                )
                            };
                            repliedMessages.push(duplicatedMessage);
                            return repliedMessages;
                        }
                    }

                    let infoMessage = {
                        type: 'text',
                        text: (
                            '以下是您的預約資料:\n\n' +
                            '預約項目:\n' +
                            '【' + product.name + '】\n\n' +
                            '預約對象:\n' +
                            '【' + receptionist.name + '】\n\n' +
                            '預約時間:\n' +
                            '【' + appointmentDate + '】\n' +
                            '【' + startedTimeStr + ' ~ ' + endedTimeStr + '】'
                        )
                    };

                    let appointmentId = appsAppointmentsMdl.Types.ObjectId().toHexString();
                    /** @type {Webhook.Chatshier.PostbackPayload} */
                    let payloadJson = {
                        action: POSTBACK_ACTIONS.APPOINTMENT_FINISH,
                        appointmentId: appointmentId,
                        productId: productId,
                        receptionistId: receptionistId,
                        scheduleId: payload.scheduleId,
                        appointmentDate: appointmentDate,
                        startedTime: startedTimeStr,
                        endedTime: endedTimeStr,
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
                            }, {
                                type: 'postback',
                                label: '重新預約',
                                data: JSON.stringify({ action: POSTBACK_ACTIONS.SEND_APPOINTMENT_CATEGORIES })
                            }]
                        }
                    };
                    repliedMessages.push(infoMessage, confirmMessage);
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
        _appointmentFinish(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkAppointmentTimeout(timestamp);
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
            let appointmentDate = payload.appointmentDate;
            let startedTimeStr = payload.startedTime;
            let endedTimeStr = payload.endedTime;
            let platformUid = webhookInfo.platformUid;

            let query = {
                appIds: appId,
                appointmentIds: appointmentId,
                isDeleted: null
            };

            return appsAppointmentsMdl.find(query).then((appsAppointments) => {
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
                    appsProductsMdl.find({ appIds: appId, productIds: productId, type: 'APPOINTMENT' }),
                    appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }),
                    appsChatroomsMessagersMdl.findByPlatformUid(appId, void 0, platformUid, false),
                    consumersMdl.find(platformUid),
                    appsAppointmentsMdl.insert(appId, _appointment)
                ]);
            }).then(([ appsProducts, appsReceptionists, appsChatroomsMessagers, consumers ]) => {
                if (!(appsProducts && appsProducts[appId]) ||
                    !(appsReceptionists && appsReceptionists[appId]) ||
                    !(appsChatroomsMessagers && appsChatroomsMessagers[appId]) ||
                    !(consumers && consumers[platformUid])) {
                    repliedMessages.push(invalidMessage);
                    return Promise.reject(new Error('MANUAL_ABORT'));
                }

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

                return this._getAppGCalendarId(appId).then((gcalendarId) => {
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
                    startTimeLocal = new Date(appointmentDate + ' ' + startedTimeStr);
                    startDateTime = new Date(startTimeLocal.getTime() + timezoneOffset);

                    let endTimeLocal = new Date(appointmentDate + ' ' + endedTimeStr);
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
                                    '【' + appointmentDate + '】\n' +
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

        /**
         * @param {Webhook.Chatshier.PostbackPayload} payload
         * @param {string} appId
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @returns {Promise<any[]>}
         */
        _sendConsumerAppointments(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let platformUid = webhookInfo.platformUid;
            let url = webhookInfo.serverAddress;
            let lastAppointmentDate = payload.lastAppointmentDate || new Date();

            let noAppointmentsMessage = {
                type: 'text',
                text: '您目前沒有任何預約。'
            };

            let query = {
                appIds: appId,
                platformUid: platformUid,
                endedTime: lastAppointmentDate
            };

            return appsAppointmentsMdl.find(query).then((appsAppointments) => {
                if (!(appsAppointments && appsAppointments[appId])) {
                    repliedMessages.push(noAppointmentsMessage);
                    return repliedMessages;
                }

                let appointments = appsAppointments[appId].appointments;
                let appointmentIds = Object.keys(appointments);
                let hasMore = appointmentIds.length > 9;
                if (hasMore) {
                    appointmentIds = appointmentIds.slice(0, 10);
                    let lastAppointmentId = appointmentIds.pop() || '';
                    lastAppointmentDate = new Date(appointments[lastAppointmentId].startedTime).getTime();
                }

                let appointmentsMessage = {
                    type: 'template',
                    altText: '預約清單',
                    template: {
                        type: 'carousel',
                        /** @type {Chatshier.Models.TemplateColumn[]} */
                        columns: []
                    }
                };

                return Promise.all(appointmentIds.map((appointmentId) => {
                    let appointment = appointments[appointmentId];
                    let productId = appointment.product_id;
                    let receptionistId = appointment.receptionist_id;

                    return Promise.all([
                        appsProductsMdl.find({ appIds: appId, productIds: productId }),
                        appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId })
                    ]).then(([ appsProducts, appsReceptionists ]) => {
                        if (!(appsProducts && appsProducts[appId]) ||
                            !(appsReceptionists && appsReceptionists[appId])) {
                            return;
                        }

                        let product = appsProducts[appId].products[productId];
                        let receptionist = appsReceptionists[appId].receptionists[receptionistId];
                        let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                        let startedTimeLocal = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                        let endedTimeLocal = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);

                        let startStrSplits = startedTimeLocal.toISOString().split('T');
                        let endStrSplits = endedTimeLocal.toISOString().split('T');
                        let appointmentDate = startStrSplits.shift() || '';
                        let startTimeStr = (startStrSplits.pop() || '').substring(0, 5);
                        let endTimeStr = (endStrSplits.pop() || '').substring(0, 5);

                        /** @type {Webhook.Chatshier.PostbackPayload} */
                        let payloadJson = {
                            action: POSTBACK_ACTIONS.CANCEL_APPOINTMENT,
                            appointmentId: appointmentId,
                            timestamp: Date.now()
                        };

                        /** @type {Chatshier.Models.TemplateColumn} */
                        let column = {
                            title: product.name + ' - ' + receptionist.name,
                            text: appointmentDate + ' - ' + startTimeStr + ' ~ ' + endTimeStr,
                            thumbnailImageUrl: receptionist.photo || url + '/image/default-consumer.png',
                            actions: [{
                                type: 'postback',
                                label: '取消預約',
                                data: JSON.stringify(payloadJson)
                            }]
                        };
                        appointmentsMessage.template.columns.push(column);
                    });
                })).then(() => {
                    repliedMessages.push(appointmentsMessage);
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
        _cancelAppointment(payload, appId, webhookInfo) {
            let repliedMessages = [];
            let timestamp = payload.timestamp || 0;
            let timeoutMessage = this._checkAppointmentTimeout(timestamp);
            if (timeoutMessage) {
                repliedMessages.push(timeoutMessage);
                return Promise.resolve(repliedMessages);
            }

            let appointmentId = payload.appointmentId || '';
            let platformUid = webhookInfo.platformUid;
            let notFoundMessage = {
                type: 'text',
                text: '此預約已經被取消了。'
            };

            return appsAppointmentsMdl.find({ appIds: appId, appointmentIds: appointmentId }).then((appsAppointments) => {
                if (!(appsAppointments && appsAppointments[appId])) {
                    repliedMessages.push(notFoundMessage);
                    return Promise.resolve(repliedMessages);
                }

                let appointment = appsAppointments[appId].appointments[appointmentId];
                let eventId = appointment.eventId;
                let resourceId = appointment.eventChannelId;
                let productId = appointment.product_id;
                let receptionistId = appointment.receptionist_id;

                return Promise.all([
                    this._getAppGCalendarId(appId),
                    eventId && resourceId && gcalendarHlp.stopChannel(eventId, resourceId)
                ]).then(([ gcalendarId ]) => {
                    return Promise.all([
                        appsProductsMdl.find({ appIds: appId, productIds: productId }),
                        appsReceptionistsMdl.find({ appIds: appId, receptionistIds: receptionistId }),
                        consumersMdl.find(platformUid),
                        appsAppointmentsMdl.remove(appId, appointmentId),
                        gcalendarId && eventId && gcalendarHlp.deleteEvent(gcalendarId, eventId)
                    ]).then(([ appsProducts, appsReceptionists, consumers ]) => {
                        let successMessage = {
                            type: 'text',
                            text: '已為您取消此預約。'
                        };

                        if (appsProducts && appsProducts[appId] &&
                            appsReceptionists && appsReceptionists[appId]) {
                            let product = appsProducts[appId].products[productId];
                            let receptionist = appsReceptionists[appId].receptionists[receptionistId];

                            let timezoneOffset = receptionist.timezoneOffset * 60 * 1000;
                            let startedTimeLocal = new Date(new Date(appointment.startedTime).getTime() - timezoneOffset);
                            let endedTimeLocal = new Date(new Date(appointment.endedTime).getTime() - timezoneOffset);

                            let startStrSplits = startedTimeLocal.toISOString().split('T');
                            let endStrSplits = endedTimeLocal.toISOString().split('T');
                            let appointmentDate = startStrSplits.shift() || '';
                            let startTimeStr = (startStrSplits.pop() || '').substring(0, 5);
                            let endTimeStr = (endStrSplits.pop() || '').substring(0, 5);

                            successMessage.text += (
                                '\n' +
                                '\n【' + product.name + '】' +
                                '\n【' + receptionist.name + '】' +
                                '\n【' + appointmentDate + '】' +
                                '\n【' + startTimeStr + ' ~ ' + endTimeStr + '】'
                            );
                        }

                        if (consumers && consumers[platformUid]) {
                            let consumer = consumers[platformUid];
                            successMessage.text = consumer.name + ' 您好！' + successMessage.text;
                        }

                        repliedMessages.push(successMessage);
                    });
                }).then(() => {
                    return repliedMessages;
                });
            });
        }
    }

    return new ChatshierHelper();
})();
