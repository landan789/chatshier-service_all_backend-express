module.exports = (function() {
    const appsTemplatesMdl = require('../models/apps_templates');
    const appsGreetingsMdl = require('../models/apps_greetings');
    const appsAutorepliesMdl = require('../models/apps_autoreplies');
    const fuseHlp = require('../helpers/fuse');

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const SYSTEM = 'SYSTEM';

    class ChatshierHelp {
        /**
         * 根據 HTTP request body 與 app.type 決定要回傳甚麼訊息
         * @param {*} messages
         * @param {*} app
         */
        getRepliedMessages(messages, appId, app) {
            let greetings = {};
            let grettingsPromise = Promise.all(messages.map((message) => {
                let eventType = message.eventType || null;
                if ('follow' !== eventType) {
                    return Promise.resolve();
                };

                return appsGreetingsMdl.findGreetings(appId).then((_greetings) => {
                    Object.assign(greetings, _greetings);
                    return _greetings;
                });
            })).then(() => {
                return greetings;
            });

            let keywordreplies = {};
            let keywordrepliesPromise = Promise.all(messages.map((message) => {
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

            let autoreplies = {};
            let autorepliesPromise = Promise.all(messages.map((message) => {
                let eventType = message.eventType || null;
                if ('follow' === eventType || 'unfollow' === eventType) {
                    return Promise.resolve();
                }

                return appsAutorepliesMdl.findAutoreplies(appId).then((_autoreplies) => {
                    let timeNow = Date.now();

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
                        delete _autoreplies[autoreplyId];
                    }
                    return autoreplies;
                });
            })).then(() => {
                return autoreplies;
            });

            let templates = {};
            let templatesPromise = Promise.all(messages.map((message) => {
                let eventType = message.eventType;
                let text = message.text;
                if ('message' !== eventType) {
                    return Promise.resolve();
                }

                // templates使用模糊比對，不直接對 DB 查找
                return fuseHlp.searchTemplates(appId, text).then((_templates) => {
                    templates = Object.assign(templates, _templates);
                    return _templates;
                });
            })).then(() => {
                return templates;
            });

            return Promise.all([
                grettingsPromise,
                keywordrepliesPromise,
                autorepliesPromise,
                templatesPromise
            ]).then((results) => {
                let repliedMessages = [];
                let greetings = results.shift() || {};
                let keywordreplies = results.shift() || {};
                let autoreplies = results.shift() || {};
                let templates = results.shift() || {};
                let _message = { from: SYSTEM };

                Object.keys(greetings).forEach((grettingId) => {
                    let gretting = greetings[grettingId];
                    let message = Object.assign({}, gretting, _message);
                    repliedMessages.push(message);
                });

                Object.keys(keywordreplies).forEach((keywordreplyId) => {
                    let keywordreply = keywordreplies[keywordreplyId];
                    let message = Object.assign({}, keywordreply, _message);
                    repliedMessages.push(message);
                });

                Object.keys(autoreplies).forEach((autoreplyId) => {
                    let autoreply = autoreplies[autoreplyId];
                    let message = Object.assign({}, autoreply, _message);
                    repliedMessages.push(message);
                });

                Object.keys(templates).forEach((templateId) => {
                    let template = templates[templateId];
                    let message = Object.assign({}, template, _message);
                    repliedMessages.push(message);
                });

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
