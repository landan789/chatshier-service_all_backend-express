
module.exports = (function() {
    const admin = require('firebase-admin');
    const FuseJS = require('fuse.js');
    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
    const appsTemplatesMdl = require('../models/apps_templates');
    const redisHlp = require('./redis');
    const REDIS_API_CHANNEL = redisHlp.CHANNELS.REDIS_API_CHANNEL;

    class Fuse {
        constructor() {
            this._ready = admin.auth().listUsers().then((usersRecord) => {
                /** @type {{ [userId: string]: FuzzySearchUser }} */
                this.usersMap = {};
                usersRecord.users.forEach((user) => {
                    this.usersMap[user.uid] = {
                        user_id: user.uid,
                        displayName: user.displayName,
                        email: user.email
                    };
                });

                let fuseOptions = this.fuseOptionBuilder({
                    includeScore: false,
                    keys: [
                        'displayName',
                        'email'
                    ]
                });
                let userList = Object.keys(this.usersMap).map((userId) => this.usersMap[userId]);
                this.userFuse = new FuseJS(userList, fuseOptions);

                this._subscriberOnAPI = this._subscriberOnAPI.bind(this);
                return redisHlp.ready.then(() => {
                    redisHlp.subscriber.on('message', this._subscriberOnAPI);
                    redisHlp.subscriber.subscribe(REDIS_API_CHANNEL);
                });
            });
        }

        get ready() {
            return this._ready;
        }

        /**
         * @param {string} channel
         * @param {string} messageBody
         */
        _subscriberOnAPI(channel, messageBody) {
            switch (channel) {
                case REDIS_API_CHANNEL:
                    let json = JSON.parse(messageBody);
                    let eventName = json.eventName;
                    if (eventName === redisHlp.EVENTS.UPDATE_FUSE_USERS) {
                        let userIds = json.userIds;
                        this.updateUsers(userIds);
                    }
                    break;
                default:
                    break;
            }
        }

        fuseOptionBuilder(options) {
            options = options || {};
            /** @type {Fuse.FuseOptions} */
            let fuseOptions = {
                // 搜尋的關鍵字須遵守大小寫
                caseSensitive: false,
                tokenize: !!options.tokenize,
                matchAllTokens: !!options.matchAllTokens,
                includeMatches: !!options.includeMatches,
                // // 回傳的陣列物件中會包含模糊指數數據 score
                includeScore: !!options.includeScore,
                // 搜尋結果須進行排序 (稍微增加處理時間)
                shouldSort: true,
                // 比對結果的模糊指數須小於此值
                // 越接近 0.0 代表越須完全符合搜尋樣本
                // 越接近 1.0 代表模糊搜尋結果越多
                threshold: 0.2,
                location: 0,
                distance: 100,
                // 輸入搜尋的文字最大長度
                maxPatternLength: 1024,
                // 輸入的搜尋樣本字串長度須大於此值
                minMatchCharLength: 2,
                keys: options.keys || []
            };
            return fuseOptions;
        }

        /**
         * @param {string[]} userIds
         * @returns {Promise<boolean>}
         */
        updateUsers(userIds) {
            let shouldUpdate = false;
            if (!userIds) {
                return Promise.resolve(shouldUpdate);
            }

            userIds = userIds || [];
            return Promise.all(userIds.map((userId) => {
                // 此 userId 已經在清單中不需更新
                if (this.usersMap[userId]) {
                    return Promise.resolve();
                }

                // 將此 user 新增至 fuzzy search 清單中
                this.usersMap[userId] = {
                    user_id: userId,
                    displayName: '',
                    email: ''
                };
                shouldUpdate = true;
                return admin.auth().getUser(userId).then((userRecord) => {
                    this.usersMap[userId].displayName = userRecord.displayName;
                    this.usersMap[userId].email = userRecord.email;
                });
            })).then(() => {
                if (shouldUpdate) {
                    let fuseOptions = this.fuseOptionBuilder({
                        includeScore: false,
                        keys: [
                            'displayName',
                            'email'
                        ]
                    });
                    // 如果使用者清單有變動的話，建立新的 fuse.js 執行實體
                    let userList = Object.keys(this.usersMap).map((userId) => this.usersMap[userId]);
                    this.userFuse = new FuseJS(userList, fuseOptions);
                }
                return shouldUpdate;
            });
        };

        /**
         * @param {string} searchPattern
         * @returns {Promise<FuzzySearchUser[]>}
         */
        searchUser(searchPattern) {
            return this._ready.then(() => {
                return this.userFuse.search(searchPattern);
            });
        };

        /**
         * @param {string} appId
         * @param {string} keyword
         * @returns {Promise<any>}
         */
        searchKeywordreplies(appId, keyword, callback) {
            let fuseOptions = this.fuseOptionBuilder({
                tokenize: true,
                matchAllTokens: true,
                includeScore: true,
                distance: 100,
                threshold: 0.2,
                keys: [
                    'keyword'
                ]
            });

            return Promise.resolve().then(() => {
                if (!(appId && keyword)) {
                    return Promise.resolve([]);
                };

                return new Promise((resolve, reject) => {
                    appsKeywordrepliesMdl.find(appId, (appsKeywordreplies) => {
                        let keywordreplies = appsKeywordreplies[appId].keywordreplies;
                        let keywordreplyIds = Object.keys(appsKeywordreplies[appId].keywordreplies);
                        let list = keywordreplyIds.map((keywordreplyId) => {
                            keywordreplies[keywordreplyId].id = keywordreplyId;
                            return keywordreplies[keywordreplyId];
                        });
                        let keywordRepliyFuse = new FuseJS(list, fuseOptions);

                        let results = keywordRepliyFuse.search(keyword);
                        let _keywordreplies = {};

                        if (results.length > 0) {
                            _keywordreplies[results[0].item.id] = results[0].item;
                        }
                        resolve(_keywordreplies);
                    });
                });
            }).then((keywordreplies) => {
                callback(keywordreplies);
                return Promise.resolve(keywordreplies);
            });
        };

        searchKeywordreplies2(appId, inputText, callback) {
            let fuseOptions = this.fuseOptionBuilder({
                includeScore: true,
                distance: 100,
                threshold: 1,
                keys: [
                    'text'
                ]
            });

            return new Promise((resolve, reject) => {
                if (!(appId && inputText)) {
                    return resolve([]);
                }
                appsKeywordrepliesMdl.find(appId, (appsKeywordreplies) => {
                    if (!appsKeywordreplies) {
                        return;
                    }
                    let keywordreplies = appsKeywordreplies[appId].keywordreplies;
                    let keywordreplyIds = Object.keys(appsKeywordreplies[appId].keywordreplies);
                    let list = [{
                        text: inputText
                    }];
                    let keywordRepliyFuse = new FuseJS(list, fuseOptions);
                    let _keywordreplies = {};
                    keywordreplyIds.forEach((keywordreplyId) => {
                        let results = keywordRepliyFuse.search(keywordreplies[keywordreplyId].keyword);

                        if (results.length > 0 && 0.1 > results[0].score) {
                            _keywordreplies[keywordreplyId] = keywordreplies[keywordreplyId];
                        }
                    });
                    resolve(_keywordreplies);
                });
            }).then((keywordreplies) => {
                callback(keywordreplies);
                return Promise.resolve(keywordreplies);
            });
        };

        searchTemplates(appId, inputText, callback) {
            let fuseOptions = this.fuseOptionBuilder({
                includeScore: true,
                distance: 100,
                threshold: 1,
                keys: [
                    'text'
                ]
            });

            return new Promise((resolve, reject) => {
                if (!(appId && inputText)) {
                    return resolve([]);
                }
                appsTemplatesMdl.find(appId, null, (appsTemplates) => {
                    if (!appsTemplates) {
                        return;
                    }
                    let templates = appsTemplates[appId].templates;
                    let templatesIds = Object.keys(appsTemplates[appId].templates);
                    let list = [{
                        text: inputText
                    }];
                    let templateFuse = new FuseJS(list, fuseOptions);
                    let _templates = {};
                    templatesIds.forEach((templatesId) => {
                        let results = templateFuse.search(templates[templatesId].keyword);

                        if (results.length > 0 && 0.1 > results[0].score) {
                            _templates[templatesId] = templates[templatesId];
                        }
                    });
                    console.log(_templates);
                    resolve(_templates);
                });
            }).then((templates) => {
                callback(templates);
                return Promise.resolve(templates);
            });
        };
    }

    return new Fuse();
})();
