window.restfulAPI = (function() {
    var jwt = '';
    var reqHeaders = new Headers();
    reqHeaders.set('Content-Type', 'application/json');

    /**
     * 設定 API 驗證身份所需的 JSON Web Token
     *
     * @param {string} value
     */
    var setJWT = function(value) {
        jwt = value;
        reqHeaders.set('Authorization', jwt);
    };

    var responseChecking = function(res) {
        return Promise.resolve().then(function() {
            if (!res.ok) {
                return Promise.reject(new Error(res.status + ' ' + res.statusText));
            }
            return res.json();
        }).then(function(resJson) {
            if (1 !== resJson.status) {
                return Promise.reject(new Error(resJson.status + ' ' + resJson.msg));
            }
            return resJson;
        });
    };

    /**
     * 宣告專門處理 Chatshier App 相關的 API 類別
     */
    var ChatshierAppAPI = (function() {
        var urlPrefix = urlConfig.apiUrl + '/api/apps/';
        function ChatshierAppAPI() {}

        /**
         * 取得使用者所有在 Chatshier 內設定的 App
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        ChatshierAppAPI.prototype.getAll = function(userId) {
            var destUrl = urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return ChatshierAppAPI;
    })();

    /**
     * 宣告專門處理 Messager 相關的 API 類別
     */
    var MessagerAPI = (function() {
        var urlPrefix = urlConfig.apiUrl + '/api/apps-messagers/';
        function MessagerAPI() {}

        /**
         * 取得使用者所有在 Chatshier 內設定的 App 內的所有 Messagers
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        MessagerAPI.prototype.getAll = function(userId) {
            var destUrl = urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 取得指定 AppId 內使用者的所有 Messagers
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        MessagerAPI.prototype.getOne = function(appId, userId) {
            var destUrl = urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return MessagerAPI;
    })();

    /**
     * 宣告專門處理待辦事項相關的 API 類別
     */
    var TicketAPI = (function() {
        var urlPrefix = urlConfig.apiUrl + '/api/apps-tickets/';
        function TicketAPI() {}

        /**
         * 取得使用者所有設定待辦事項
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        TicketAPI.prototype.getAll = function(userId) {
            var destUrl = urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 取得使用者某一個 App 的待辦事項
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        TicketAPI.prototype.getOne = function(appId, userId) {
            var destUrl = urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 新增一筆待辦事項資料
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newTicketData - 欲新增的待辦事項資料
         */
        TicketAPI.prototype.insert = function(appId, userId, newTicketData) {
            var destUrl = urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newTicketData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 更新目標待辦事項資料
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} ticketId - 目標待辦事項的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedTicketData - 已編輯後欲更新的待辦事項資料
         */
        TicketAPI.prototype.update = function(appId, ticketId, userId, modifiedTicketData) {
            var destUrl = urlPrefix + 'apps/' + appId + '/tickets/' + ticketId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedTicketData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 刪除一筆待辦事項資料
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} ticketId - 目標待辦事項的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        TicketAPI.prototype.remove = function(appId, ticketId, userId) {
            var destUrl = urlPrefix + 'apps/' + appId + '/tickets/' + ticketId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return TicketAPI;
    })();

    /**
     * 宣告專門處理關鍵字回覆相關的 API 類別
     */
    var KeywordreplyAPI = (function() {
        var urlPrefix = urlConfig.apiUrl + '/api/apps-keywordreplies/';
        function KeywordreplyAPI() {}

        /**
         * 取得使用者所有關鍵字回覆資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        KeywordreplyAPI.prototype.getAll = function(userId) {
            var destUrl = urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 取得使用者某一個 App 的所有關鍵字回覆的資料
         *
         * @param {string} appId - 目標關鍵字回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        KeywordreplyAPI.prototype.getOne = function(appId, userId) {
            var destUrl = urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 新增一筆關鍵字回覆的資料
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newKeywordreplyData - 欲新增的待辦事項資料
         */
        KeywordreplyAPI.prototype.insert = function(appId, userId, newKeywordreplyData) {
            var destUrl = urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newKeywordreplyData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 更新目標關鍵字回覆資料
         *
         * @param {string} appId - 目標關鍵字回覆的 App ID
         * @param {string} keywordreplyId - 目標關鍵字回覆的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedKeywordreplyData - 已編輯後欲更新的關鍵字回覆資料
         */
        KeywordreplyAPI.prototype.update = function(appId, keywordreplyId, userId, modifiedKeywordreplyData) {
            var destUrl = urlPrefix + 'apps/' + appId + '/keywordreplies/' + keywordreplyId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedKeywordreplyData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 刪除一筆關鍵字回覆資料
         *
         * @param {string} appId - 目標關鍵字回覆的 App ID
         * @param {string} keywordreplyId - 目標關鍵字回覆的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        KeywordreplyAPI.prototype.remove = function(appId, keywordreplyId, userId) {
            var destUrl = urlPrefix + 'apps/' + appId + '/keywordreplies/' + keywordreplyId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return KeywordreplyAPI;
    })();

    if (window.auth) {
        // 當 firebase 登入完成後自動更新 API 需要的 JSON Web Token
        window.auth.ready.then(function() {
            setJWT(window.localStorage.getItem('jwt'));
        });
    }

    return {
        setJWT: setJWT,
        chatshierApp: new ChatshierAppAPI(),
        ticket: new TicketAPI(),
        messager: new MessagerAPI(),
        keywordreply: new KeywordreplyAPI()
    };
})();
