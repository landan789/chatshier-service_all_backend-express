
module.exports = (function() {
    const admin = require('firebase-admin');
    const _Fuse = require('fuse.js');
    const appsKeywordrepliesMdl = require('../models/apps_keywordreplies');

    /** @type {_Fuse} */
    let fuseRunner;
    /** @type {FuzzySearchUser[]} */
    let usersList = [];

    let readyPromise = admin.auth().listUsers().then((usersResult) => {
        usersList = usersResult.users.map((user) => {
            return {
                user_id: user.uid,
                displayName: user.displayName,
                email: user.email
            };
        });

        let fuseOptions = fuseOptionBuilder({
            includeScore: false,
            keys: [
                'displayName',
                'email'
            ]
        });
        fuseRunner = new _Fuse(usersList, fuseOptions);
    });

    /**
     * @param {Fuse.FuseOptions} options
     */
    const fuseOptionBuilder = (options) => {
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
    };

    function Fuse() {};

    /**
     * @param {string} userId
     * @param {any} user
     * @returns {boolean}
     */
    Fuse.prototype.updateUser = function(userId, user) {
        if (!(userId && user)) {
            return false;
        }

        let fuseOptions = fuseOptionBuilder({
            includeScore: false,
            keys: [
                'displayName',
                'email'
            ]
        });

        for (let i = 0; i < usersList.length; i++) {
            if (userId === usersList[i].user_id) {
                usersList[i].displayName = user.name;
                usersList[i].email = user.email;
                fuseRunner = new _Fuse(usersList, fuseOptions);
                return true;
            }
        }

        /** @type {FuzzySearchUser} */
        let fuseUser = {
            user_id: userId,
            displayName: user.name,
            email: user.email
        };

        usersList.push(fuseUser);
        fuseRunner = new _Fuse(usersList, fuseOptions);
        return true;
    };

    /**
     * @param {string[]} keywordId
     * @param {any} keyword
     * @returns {Promise<any>}
     */
    Fuse.prototype.searchKeywordreplies = function(appId, keyword, callback) {
        let fuseOptions = fuseOptionBuilder({
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
                appsKeywordrepliesMdl.findKeywordreplies(appId, (appsKeywordreplies) => {
                    let keywordreplies = appsKeywordreplies[appId].keywordreplies;
                    let keywordreplyIds = Object.keys(appsKeywordreplies[appId].keywordreplies);
                    let list = keywordreplyIds.map((keywordreplyId) => {
                        keywordreplies[keywordreplyId].id = keywordreplyId;
                        return keywordreplies[keywordreplyId];
                    });
                    fuseRunner = new _Fuse(list, fuseOptions);

                    let results = fuseRunner.search(keyword);
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

    Fuse.prototype.searchKeywordreplies2 = function(appId, inputText, callback) {
        let fuseOptions = fuseOptionBuilder({
            includeScore: true,
            distance: 100,
            threshold: 1,
            keys: [
                'text'
            ]
        });

        return new Promise((resolve, reject) => {
            if (!(appId && inputText)) {
                return Promise.resolve([]);
            }
            appsKeywordrepliesMdl.findKeywordreplies(appId, (appsKeywordreplies) => {
                if (!appsKeywordreplies) {
                    return;
                }
                let keywordreplies = appsKeywordreplies[appId].keywordreplies;
                let keywordreplyIds = Object.keys(appsKeywordreplies[appId].keywordreplies);
                let list = [{
                    text: inputText
                }];
                fuseRunner = new _Fuse(list, fuseOptions);
                let _keywordreplies = {};
                keywordreplyIds.forEach((keywordreplyId) => {
                    let results = fuseRunner.search(keywordreplies[keywordreplyId].keyword);

                    if (results.length > 0 && 0.1 > results[0].score) {
                        console.log(results[0]);
                        console.log(keywordreplies[keywordreplyId]);
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
    /**
     * @param {string} searchPattern
     * @returns {Promise<FuzzySearchUser[]>}
     */
    Fuse.prototype.search = function(searchPattern) {
        return readyPromise.then(() => {
            return fuseRunner.search(searchPattern);
        });
    };

    let instance = new Fuse();
    return instance;
})();
