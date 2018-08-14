
module.exports = (function() {
    const FuseJS = require('fuse.js');
    const usersMdl = require('../models/users');
    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');
    const redisHlp = require('./redis');
    const REDIS_API_CHANNEL = redisHlp.CHANNELS.REDIS_API_CHANNEL;

    class FuseHelper {
        constructor() {
            this._ready = usersMdl.find().then((users) => {
                /** @type {{ [userId: string]: FuzzySearchUser }} */
                this.users = users || {};

                let fuseOptions = this.fuseOptionBuilder({
                    includeScore: false,
                    keys: [
                        'name',
                        'email'
                    ]
                });
                let userList = Object.keys(this.users).map((userId) => this.users[userId]);
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
                        let users = json.users;
                        this.updateUsers(users);
                    }
                    break;
                default:
                    break;
            }
        }

        fuseOptionBuilder(options) {
            options = options || {};
            /** @type {FuseJS.FuseOptions} */
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
         * @param {any} users
         * @returns {boolean}
         */
        updateUsers(users) {
            let shouldUpdate = false;
            if (!users || (users && 0 === Object.keys(users).length)) {
                return shouldUpdate;
            }

            for (let userId in users) {
                let user = users[userId];

                if (this.users[userId]) {
                    if (this.users[userId].name !== user.name) {
                        this.users[userId].name = user.name;
                        shouldUpdate = true;
                    }

                    if (this.users[userId].email !== user.email) {
                        this.users[userId].email = user.email;
                        shouldUpdate = true;
                    }
                    continue;
                }

                // 將此 user 新增至 fuzzy search 清單中
                this.users[userId] = {
                    _id: userId,
                    name: user.name,
                    email: user.email
                };
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                let fuseOptions = this.fuseOptionBuilder({
                    includeScore: false,
                    keys: [
                        'name',
                        'email'
                    ]
                });
                // 如果使用者清單有變動的話，建立新的 fuse.js 執行實體
                let userIds = Object.keys(this.users);
                let userList = userIds.map((userId) => this.users[userId]);
                this.userFuse = new FuseJS(userList, fuseOptions);
            }
            return shouldUpdate;
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
         * @param {string} inputText
         * @returns {Promise<Chatshier.Models.Keywordreplies>}
         */
        searchKeywordreplies(appId, inputText) {
            let fuseOptions = this.fuseOptionBuilder({
                includeScore: true,
                distance: 100,
                threshold: 1,
                keys: [
                    'text'
                ]
            });

            return Promise.resolve().then(() => {
                if (!(appId && inputText)) {
                    return {};
                }

                return appsKeywordrepliesMdl.find(appId).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return {};
                    }

                    let keywordreplies = appsKeywordreplies[appId].keywordreplies;
                    let keywordreplyIds = Object.keys(keywordreplies).filter((keywordreplyId) => !!keywordreplies[keywordreplyId].status);
                    let list = [{
                        text: inputText
                    }];
                    let keywordReplyFuse = new FuseJS(list, fuseOptions);
                    let _keywordreplies = {};
                    keywordreplyIds.forEach((keywordreplyId) => {
                        let keywordreply = keywordreplies[keywordreplyId];
                        let results = keywordReplyFuse.search(keywordreply.keyword);
                        if (results.length > 0 && 0.1 > results[0].score) {
                            _keywordreplies[keywordreplyId] = keywordreply;
                        }
                    });
                    return _keywordreplies;
                });
            });
        };
    }

    return new FuseHelper();
})();
