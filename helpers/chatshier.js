module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    const GenericTemplateBuilder = require('facebook-bot-messenger').GenericTemplateBuilder;

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

    const fuseHlp = require('../helpers/fuse');
    const jwtHlp = require('../helpers/jwt');

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
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
        SEND_APPOINTMENT_DATE: 'SEND_APPOINTMENT_DATE',
        SEND_APPOINTMENT_TIME: 'SEND_APPOINTMENT_TIME',
        SEND_APPOINTMENT_CONFIRM: 'SEND_APPOINTMENT_CONFIRM',
        APPOINTMENT_FINISH: 'APPOINTMENT_FINISH'
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
        getReplies(messages, webhookInfo, appId, app) {
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
            let repliedMessages = [];
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
                let serverAddr = webhookInfo.serverAddress;
                let platformUid = webhookInfo.platformUid;
                let url = serverAddr;

                switch (payload.action) {
                    case POSTBACK_ACTIONS.CHANGE_RICHMENU:
                        let richmenuId = payload.richmenuId || '';
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
                            return botSvc.linkRichMenuToUser(platformUid, richmenu.platformMenuId, appId);
                        });
                        promises.push(richmenuPromise);
                        break;
                    case POSTBACK_ACTIONS.SEND_REPLY_TEXT:
                        if (payload.replyText) {
                            let replyTextMessage = {
                                type: 'text',
                                text: payload.replyText
                            };
                            repliedMessages.push(replyTextMessage);
                        }
                        break;
                    case POSTBACK_ACTIONS.SEND_TEMPLATE:
                        let templateId = payload.templateId || '';
                        let templatePromise = appsTemplatesMdl.find(appId, templateId).then((appsTemplates) => {
                            if (!(appsTemplates && appsTemplates[appId])) {
                                return Promise.resolve();
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
                        });
                        promises.push(templatePromise);
                        break;
                    case POSTBACK_ACTIONS.SEND_IMAGEMAP:
                        let imagemapId = payload.imagemapId || '';
                        let imagemapPromise = appsImagemapsMdl.find(appId, imagemapId).then((appsImagemaps) => {
                            if (!(appsImagemaps && appsImagemaps[appId])) {
                                return Promise.resolve();
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
                    case POSTBACK_ACTIONS.SEND_APPOINTMENT_CATEGORIES:
                        let categoryPromise = appsCategoriesMdl.find(appId).then((appsCategories) => {
                            if (!(appsCategories && appsCategories[appId])) {
                                let noCategoriesMessage = {
                                    type: 'text',
                                    text: '很抱歉，現在沒有可預約的目錄。'
                                };
                                repliedMessages.push(noCategoriesMessage);
                                return Promise.resolve(void 0);
                            }

                            let categories = appsCategories[appId].categories;
                            let categoryIds = Object.keys(categories);

                            /** @type {string[][]} */
                            let categoryColumns = [];
                            while (categoryIds.length > 3) {
                                categoryColumns.push(categoryIds.splice(0, 3));
                            }
                            categoryColumns.push(categoryIds);

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
                        });
                        promises.push(categoryPromise);
                        break;
                    case POSTBACK_ACTIONS.SEND_APPOINTMENT_PRODUCTS:
                        let timestamp = payload.timestamp || 0;
                        if (Date.now() - timestamp > 30 * 60 * 1000) {
                            let timeoutMessage = {
                                type: 'text',
                                text: '此操作已逾時 30 分鐘，請重新操作。'
                            };
                            repliedMessages.push(timeoutMessage);
                            break;
                        }

                        let categoryId = payload.categoryId || '';
                        let productPromise = appsCategoriesMdl.find(appId, categoryId).then((appsCategories) => {
                            if (!(appsCategories && appsCategories[appId])) {
                                let noCategoriesMessage = {
                                    type: 'text',
                                    text: '很抱歉，找不到這個預約目錄。'
                                };
                                repliedMessages.push(noCategoriesMessage);
                                return Promise.resolve();
                            }

                            let category = appsCategories[appId].categories[categoryId] || {};
                            let productIds = category.product_ids || [];
                            if (0 === productIds.length) {
                                let noProductsMessage = {
                                    type: 'text',
                                    text: '很抱歉，該預約目錄內沒有可預約的項目。'
                                };
                                repliedMessages.push(noProductsMessage);
                                return Promise.resolve();
                            }

                            return appsProductsMdl.find(appId, productIds).then((appsProducts) => {
                                if (!(appsProducts && appsProducts[appId])) {
                                    let noProductsMessage = {
                                        type: 'text',
                                        text: '很抱歉，該預約目錄內沒有可預約的項目。'
                                    };
                                    repliedMessages.push(noProductsMessage);
                                    return Promise.resolve();
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

                                            if (productColumns.length > 1) {
                                                while (receptionistIds.length < 3) {
                                                    receptionistIds.push('');
                                                }
                                            }
                                            let receptionists = appsReceptionists[appId].receptionists;

                                            /** @type {Chatshier.Models.TemplateColumn} */
                                            let column = {
                                                title: '預約項目',
                                                text: '請選擇要預約的項目',
                                                actions: receptionistIds.map((receptionistId) => {
                                                    /** @type {Chatshier.Models.TemplateAction} */
                                                    let action = {
                                                        type: 'postback',
                                                        label: '　',
                                                        data: 'none'
                                                    };

                                                    if (!receptionistId) {
                                                        return action;
                                                    }

                                                    let receptionist = receptionists[receptionistId];
                                                    /** @type {Webhook.Chatshier.PostbackPayload} */
                                                    let payloadJson = {
                                                        action: 'SEND_APPOINTMENT_DATE',
                                                        receptionistId: receptionistId,
                                                        timestamp: Date.now()
                                                    };

                                                    action.label = receptionist.name;
                                                    action.data = JSON.stringify(payloadJson);
                                                    return action;
                                                })
                                            };
                                            productsMessage.template.columns.push(column);
                                        });
                                    }));
                                })).then(() => {
                                    repliedMessages.push(productsMessage);
                                });
                            });
                        });
                        promises.push(productPromise);
                        break;
                    case POSTBACK_ACTIONS.SEND_APPOINTMENT_DATE:
                        break;
                    case POSTBACK_ACTIONS.SEND_APPOINTMENT_TIME:
                        break;
                    case POSTBACK_ACTIONS.SEND_APPOINTMENT_CONFIRM:
                        break;
                    case POSTBACK_ACTIONS.APPOINTMENT_FINISH:
                        break;
                    default:
                        break;
                }
            }

            return Promise.all(promises).then(() => repliedMessages);
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
    }

    return new ChatshierHelp();
})();
