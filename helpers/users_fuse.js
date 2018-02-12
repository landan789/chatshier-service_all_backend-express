module.exports = (function() {
    const admin = require('firebase-admin');
    const Fuse = require('fuse.js');

    /** @type {Fuse} */
    let fuseRunner = null;
    /** @type {FuzzySearchUser[]} */
    let usersList = [];
    let instance = new UsersFuzzySearch();

    /** @type {Fuse.FuseOptions} */
    let fuseOptions = {
        // 搜尋的關鍵字須遵守大小寫
        caseSensitive: false,
        // // 回傳的陣列物件中會包含模糊指數數據 score
        // includeScore: true,
        // 搜尋結果須進行排序 (稍微增加處理時間)
        shouldSort: true,
        // 比對結果的模糊指數須小於此值
        // 越接近 0.0 代表越須完全符合搜尋樣本
        // 越接近 1.0 代表模糊搜尋結果越多
        threshold: 0.2,
        location: 0,
        distance: 100,
        // 輸入搜尋的文字最大長度
        maxPatternLength: 32,
        // 輸入的搜尋樣本字串長度須大於此值
        minMatchCharLength: 2,
        keys: [
            'displayName',
            'email'
        ]
    };

    let readyPromise = admin.auth().listUsers().then((usersResult) => {
        usersList = usersResult.users.map((user) => {
            return {
                user_id: user.uid,
                displayName: user.displayName,
                email: user.email
            };
        });
        fuseRunner = new Fuse(usersList, fuseOptions);
    });

    function UsersFuzzySearch() {}

    /**
     * @param {string} userId
     * @param {any} user
     * @returns {boolean}
     */
    UsersFuzzySearch.prototype.updateUser = function(userId, user) {
        if (!(userId && user)) {
            return false;
        }

        for (let i = 0; i < usersList.length; i++) {
            if (userId === usersList[i].user_id) {
                usersList[i].displayName = user.name;
                usersList[i].email = user.email;
                fuseRunner = new Fuse(usersList, fuseOptions);
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
        fuseRunner = new Fuse(usersList, fuseOptions);
        return true;
    };

    /**
     * @param {string} searchPattern
     * @returns {Promise<FuzzySearchUser[]>}
     */
    UsersFuzzySearch.prototype.search = function(searchPattern) {
        return readyPromise.then(() => {
            return fuseRunner.search(searchPattern);
        });
    };

    return instance;
})();
