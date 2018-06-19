module.exports = (function() {
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    const appsGreetingsMdl = require('../models/apps_greetings');
    const appsAutorepliesMdl = require('../models/apps_autoreplies');
    const fuseHlp = require('../helpers/fuse');
    const botSvc = require('../services/bot');

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const SYSTEM = 'SYSTEM';

    class ChatshierHelp {
        /**
         * 根據 HTTP request body 與 app.type 決定要回傳甚麼訊息
         * @param {any} messages
         * @param {Webhook.Chatshier.Information} webhookInfo
         * @param {any} app
         */
        getRepliedMessages(messages, webhookInfo, appId, app) {
            let eventType = webhookInfo.eventType;

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
                    return Promise.resolve();
                }

                let text = message.text;
                if (!text) {
                    return Promise.resolve();
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
                let repliedMessages = [];
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
        };

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
        };
    }

    return new ChatshierHelp();
})();
