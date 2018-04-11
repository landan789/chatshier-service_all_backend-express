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
                if (eventType && 'follow' !== eventType) {
                    return Promise.resolve();
                };

                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.findGreetings(appId, (_greetings) => {
                        greetings = Object.assign({}, greetings, _greetings);
                        resolve(_greetings);
                    });
                });
            })).then(() => {
                return Promise.resolve(greetings);
            });

            let keywordreplies = {};
            let keywordrepliesPromise = Promise.all(messages.map((message) => {
                let text = message.text;
                if (!text) {
                    return Promise.resolve();
                }
                return new Promise((resolve, reject) => {
                    // 關鍵字回復使用模糊比對，不直接對 DB 查找
                    fuseHlp.searchKeywordreplies2(appId, text, (_keywordreplies) => {
                        keywordreplies = Object.assign(keywordreplies, _keywordreplies);
                        resolve(_keywordreplies);
                    });
                });
            })).then(() => {
                return Promise.resolve(keywordreplies);
            });

            let autoreplies = {};
            let autorepliesPromise = Promise.all(messages.map((message) => {
                let eventType = message.eventType || null;
                if (eventType && ('follow' === eventType || 'unfollow' === eventType)) {
                    return Promise.resolve();
                };
                return new Promise((resolve, reject) => {
                    appsAutorepliesMdl.findAutoreplies(appId, (_autoreplies) => {
                        autoreplies = Object.assign(autoreplies, _autoreplies);
                        let timeNow = Date.now();

                        for (let key in autoreplies) {
                            let endedTime = autoreplies[key].endedTime;
                            let startedTime = autoreplies[key].startedTime;
                            if (startedTime <= timeNow && timeNow < endedTime) {
                                continue;
                            }
                            delete autoreplies[key];
                        }
                        resolve(autoreplies);
                    });
                });
            })).then(() => {
                return Promise.resolve(autoreplies);
            });

            // let templates = {};
            // let templatesPromise = Promise.all(messages.map((message) => {
            //     let eventType = message.eventType;
            //     let text = message.text;
            //     if ('message' !== eventType) {
            //         return Promise.resolve();
            //     }
            //     return new Promise((resolve, reject) => {
            //         // templates使用模糊比對，不直接對 DB 查找
            //         fuseHlp.searchTemplates(appId, text, (_templates) => {
            //             templates = Object.assign(templates, _templates);
            //             resolve(_templates);
            //         });
            //     });
            // })).then(() => {
            //     return Promise.resolve(templates);
            // });

            return Promise.all([
                grettingsPromise,
                keywordrepliesPromise,
                autorepliesPromise
                // templatesPromise
            ]).then((results) => {
                let repliedMessages = [];
                let greetins = results.shift();
                let keywordreplies = results.shift();
                let autoreplies = results.shift();
                // let templates = results.shift();
                let _message = {
                    from: SYSTEM
                };
                Object.keys(greetins).map((grettingId) => {
                    let gretting = greetins[grettingId];
                    let message = Object.assign({}, gretting, _message);
                    repliedMessages.push(message);
                });

                Object.keys(keywordreplies).map((keywordreplyId) => {
                    let keywordreply = keywordreplies[keywordreplyId];
                    let message = Object.assign({}, keywordreply, _message);
                    repliedMessages.push(message);
                });

                Object.keys(autoreplies).map((autoreplyId) => {
                    let autoreply = autoreplies[autoreplyId];
                    let message = Object.assign({}, autoreply, _message);
                    repliedMessages.push(message);
                });

                // Object.keys(templates).map((templateId) => {
                //     let template = templates[templateId];
                //     let message = Object.assign({}, SCHEMA.APP_CHATROOM_MESSAGE, template, _message);
                //     repliedMessages.push(message);
                // });

                return Promise.resolve(repliedMessages);
            });
        };

        getKeywordreplies(messages, appId, app) {
            let keywordreplies = {};
            return Promise.all(messages.map((message) => {
                let eventType = message.eventType;
                let text = message.text;
                if ('message' !== eventType || '' === message.text) {
                    return Promise.resolve();
                }
                return new Promise((resolve, reject) => {
                    // 關鍵字回復使用模糊比對，不直接對 DB 查找
                    fuseHlp.searchKeywordreplies2(appId, text, (_keywordreplies) => {
                        keywordreplies = Object.assign(keywordreplies, _keywordreplies);
                        resolve(_keywordreplies);
                    });
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
