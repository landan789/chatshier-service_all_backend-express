/// <reference path='../../../typings/client/config.d.ts' />

window.restfulAPI = (function() {
    var jwt = '';
    var reqHeaders = new Headers();
    reqHeaders.set('Content-Type', 'application/json');

    // ======================
    // urlConfig undefined error handle
    !window.urlConfig && (window.urlConfig = {});
    !window.urlConfig.apiUrl && (window.urlConfig.apiUrl = window.location.origin); // 預設 website 與 api server 為同一網域
    // ======================

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
        function ChatshierAppAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps/';
        }

        /**
         * 取得使用者所有在 Chatshier 內設定的 App
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        ChatshierAppAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
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
     * 宣告專門處理 Calendar 相關的 API 類別
     */
    var CalendarAPI = (function() {
        function CalendarAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/calendars-events/';
        };

        /**
         * 取得使用者所有的 calendar 事件
         *
         * @param {string} userId - 使用者的 firebase id
         */
        CalendarAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 插入一筆 calendar 事件
         *
         * @param {string} calendarId - 識別不同行事曆的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} calendarData - 要進行插入的 calendar 事件資料
         */
        CalendarAPI.prototype.insert = function(userId, calendarData) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(calendarData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 更新一筆指定的 calendar 事件
         *
         * @param {string} calendarId - 識別不同行事曆的 ID
         * @param {string} eventId - calendar 的事件ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} calendarData - 要進行更新的 calendar 事件資料
         */
        CalendarAPI.prototype.update = function(calendarId, eventId, userId, calendarData) {
            var destUrl = this.urlPrefix + 'calendars/' + calendarId + '/events/' + eventId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(calendarData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 移除一筆指定的 calendar 事件
         *
         * @param {string} calendarId - 識別不同行事曆的 ID
         * @param {string} eventId - calendar 的事件ID
         * @param {string} userId - 要進行更新的 calendar 事件資料
         */
        CalendarAPI.prototype.remove = function(calendarId, eventId, userId) {
            var destUrl = this.urlPrefix + 'calendars/' + calendarId + '/events/' + eventId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return CalendarAPI;
    })();

    /**
     * 宣告專門處理 Messager 相關的 API 類別
     */
    var MessagerAPI = (function() {
        function MessagerAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-messagers/';
        }

        /**
         * 取得使用者所有在 Chatshier 內設定的 App 內的所有 Messagers
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        MessagerAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
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
         * @param {string} appId - 目標 messager 的 App ID
         * @param {string} msgerId - 目標 messager ID
         * @param {string} userId - 使用者的 firebase ID
         */
        MessagerAPI.prototype.getOne = function(appId, msgerId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/messager/' + msgerId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 更新指定 AppId 內的 messager 資料
         *
         * @param {string} appId - 目標 messager 的 App ID
         * @param {string} msgerId - 目標 messager ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {any} msgerData - 欲更新的 messager 資料
         */
        MessagerAPI.prototype.update = function(appId, msgerId, userId, msgerData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/messager/' + msgerId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(msgerData)
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
        function TicketAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-tickets/';
        }

        /**
         * 取得使用者所有設定待辦事項
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        TicketAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
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
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
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
         * @param {*} ticketData - 欲新增的待辦事項資料
         */
        TicketAPI.prototype.insert = function(appId, userId, ticketData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(ticketData)
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
         * @param {*} ticketData - 已編輯後欲更新的待辦事項資料
         */
        TicketAPI.prototype.update = function(appId, ticketId, userId, ticketData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tickets/' + ticketId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(ticketData)
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
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tickets/' + ticketId + '/users/' + userId;
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
        function KeywordreplyAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-keywordreplies/';
        }

        /**
         * 取得使用者所有關鍵字回覆資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        KeywordreplyAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
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
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
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
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
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
            var destUrl = this.urlPrefix + 'apps/' + appId + '/keywordreplies/' + keywordreplyId + '/users/' + userId;
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
            var destUrl = this.urlPrefix + 'apps/' + appId + '/keywordreplies/' + keywordreplyId + '/users/' + userId;
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

    var TagAPI = (function() {
        function TagAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-tags/';
        }

        TagAPI.prototype.enums = Object.freeze({
            type: {
                SYSTEM: 'SYSTEM',
                DEFAULT: 'DEFAULT',
                CUSTOM: 'CUSTOM'
            },
            setsType: {
                TEXT: 'TEXT',
                NUMBER: 'NUMBER',
                DATE: 'DATE',
                SELECT: 'SELECT',
                MULTI_SELECT: 'MULTI_SELECT',
                CHECKBOX: 'CHECKBOX'
            }
        });

        /**
         * 取得使用者所有標籤資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        TagAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 新增一筆 App 標籤的資料
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} insertTagData - 欲新增的待辦事項資料
         */
        TagAPI.prototype.insert = function(appId, userId, insertTagData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(insertTagData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 更新一筆目標 App 標籤資料
         *
         * @param {string} appId - 目標標籤所屬的 App ID
         * @param {string} tagId - 目標標籤的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedTagData - 已編輯後欲更新的標籤資料
         */
        TagAPI.prototype.update = function(appId, tagId, userId, modifiedTagData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tags/' + tagId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedTagData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 刪除一筆目標 App 標籤資料
         *
         * @param {string} appId - 目標標籤所屬的 App ID
         * @param {string} tagId - 目標標籤的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        TagAPI.prototype.remove = function(appId, tagId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tags/' + tagId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return TagAPI;
    })();

    var ChatroomAPI = (function() {
        function ChatroomAPI(jwt) {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-chatrooms-messages/';
        };

        /**
         * 取得每個 App 使用者的所有聊天室資訊
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        ChatroomAPI.prototype.getAllMessages = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 取得使用者指定的 App 內的所有聊天室資訊
         *
         * @param {string} appId - 要查找的使用者的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        ChatroomAPI.prototype.getAllMessagesByAppId = function(appId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: this.reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return ChatroomAPI;
    })();

    /**
     * 宣告專門處理相關自動回覆的 API 類別
     */
    var AutoreplyAPI = (function() {
        function AutoreplyAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-autoreplies/';
        };

        /**
         * 取得使用者所有自動回覆資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        AutoreplyAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 取得使用者某一個 App 的所有自動回覆的資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AutoreplyAPI.prototype.getOne = function(appId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 新增一筆自動回覆資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newAutoreplyData - 欲新增的待辦事項資料
         */
        AutoreplyAPI.prototype.insert = function(appId, userId, newAutoreplyData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newAutoreplyData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 修改一筆自動回覆資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} autoreplyId - 目標自動回覆的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedAutoreplyData - 已編輯後欲更新的關鍵字回覆資料
         */
        AutoreplyAPI.prototype.update = function(appId, userId, autoreplyId, modifiedAutoreplyData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/autoreplies/' + autoreplyId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedAutoreplyData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 刪除一筆自動回覆資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} autoreplyId - 目標自動回覆的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AutoreplyAPI.prototype.remove = function(appId, userId, autoreplyId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/autoreplies/' + autoreplyId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };
        return AutoreplyAPI;
    })();

    if (window.auth) {
        // 當 firebase 登入完成後自動更新 API 需要的 JSON Web Token
        window.auth.ready.then(function() {
            setJWT(window.localStorage.getItem('jwt'));
        });
    }

    return {
        chatshierApp: new ChatshierAppAPI(),
        calendar: new CalendarAPI(),
        ticket: new TicketAPI(),
        messager: new MessagerAPI(),
        keywordreply: new KeywordreplyAPI(),
        tag: new TagAPI(),
        chatroom: new ChatroomAPI(),
        autoreply: new AutoreplyAPI(),
        setJWT: setJWT
    };
})();
