/// <reference path='../../../typings/client/config.d.ts' />

window.restfulAPI = (function() {
    var jwt = '';
    var reqHeaders = new Headers();
    reqHeaders.set('Content-Type', 'application/json');

    var prefixUrl = urlConfig.apiUrl + '/api/';
    var apiUrlTable = Object.freeze({
        authentications: prefixUrl + 'authentications/',
        apps: prefixUrl + 'apps/',
        calendarsEvents: prefixUrl + 'calendars-events/',
        appsMessagers: prefixUrl + 'apps-messagers/',
        appsTickets: prefixUrl + 'apps-tickets/',
        appsKeywordreplies: prefixUrl + 'apps-keywordreplies/',
        appsTags: prefixUrl + 'apps-tags/',
        appsChatroomsMessages: prefixUrl + 'apps-chatrooms-messages/',
        appsAutoreplies: prefixUrl + 'apps-autoreplies/',
        groupsMembers: prefixUrl + 'groups-members/',
        groups: prefixUrl + 'groups/',
        users: prefixUrl + 'users/',
        appsGreetings: prefixUrl + 'apps-greetings/',
        searchUsers: prefixUrl + 'search-users/'
    });

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

    /**
     * @param {Response} res
     */
    var responseChecking = function(res) {
        if (!res.ok) {
            return Promise.reject(new Error(res.status + ' ' + res.statusText));
        }

        return res.json().then(function(resJson) {
            if (1 !== resJson.status) {
                console.error(JSON.stringify(resJson, null, 2));
                return Promise.reject(new Error(resJson.status + ' ' + resJson.msg));
            }
            return resJson;
        });
    };

    /**
     * @param {RequestInfo} reqInfo
     * @param {RequestInit} reqInit
     */
    var sendRequest = function(reqInfo, reqInit) {
        return window.fetch(reqInfo, reqInit).then(function(res) {
            return responseChecking(res);
        });
    };

    /**
     * 宣告專門處理 Chatshier App 相關的 API 類別
     */
    var AppAPI = (function() {
        function AppAPI() {
            this.urlPrefix = apiUrlTable.apps;
        }

        AppAPI.prototype.enums = Object.freeze({
            type: {
                SYSTEM: 'SYSTEM',
                CHATSHIER: 'CHATSHIER',
                LINE: 'LINE',
                FACEBOOK: 'FACEBOOK'
            }
        });

        /**
         * 取得使用者所有在 Chatshier 內設定的 App
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        AppAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得指定的使用者在 Chatshier 內設定的 App
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        AppAPI.prototype.getOne = function(appId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增 Chatshier App
         *
         * @param {string} userId - 使用者的 firebase ID
         * @param {any} postAppData - 新增的 Chatshier App 資料
         */
        AppAPI.prototype.insert = function(userId, postAppData) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(postAppData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 更新指定的 Chatshier App
         *
         * @param {string} appId - 指定的 AppId
         * @param {string} userId - 使用者的 firebase ID
         * @param {any} putAppData - 新增的 Chatshier App 資料
         */
        AppAPI.prototype.update = function(appId, userId, putAppData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(putAppData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除指定的 Chatshier App
         *
         * @param {string} appId - 指定的 AppId
         * @param {string} userId - 使用者的 firebase ID
         */
        AppAPI.prototype.remove = function(appId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppAPI;
    })();

    /**
     * 宣告專門處理 Calendar 相關的 API 類別
     */
    var CalendarAPI = (function() {
        function CalendarAPI() {
            this.urlPrefix = apiUrlTable.calendarsEvents;
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        return CalendarAPI;
    })();

    /**
     * 宣告專門處理 Messager 相關的 API 類別
     */
    var MessagerAPI = (function() {
        function MessagerAPI() {
            this.urlPrefix = apiUrlTable.appsMessagers;
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        return MessagerAPI;
    })();

    /**
     * 宣告專門處理待辦事項相關的 API 類別
     */
    var TicketAPI = (function() {
        function TicketAPI() {
            this.urlPrefix = apiUrlTable.appsTickets;
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        return TicketAPI;
    })();

    /**
     * 宣告專門處理關鍵字回覆相關的 API 類別
     */
    var KeywordreplyAPI = (function() {
        function KeywordreplyAPI() {
            this.urlPrefix = apiUrlTable.appsKeywordreplies;
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        return KeywordreplyAPI;
    })();

    /**
     * 宣告專門處理關鍵字回覆相關的 API 類別
     */
    var ComposesAPI = (function() {
        function ComposesAPI() {
            this.urlPrefix = urlConfig.apiUrl + '/api/apps-composes/';
        }

        /**
         * 取得使用者所有群發回覆資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        ComposesAPI.prototype.getAll = function(userId) {
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
         * 取得使用者某一個 App 的所有群發的資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        ComposesAPI.prototype.getOne = function(appId, userId) {
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
         * 新增一筆群發的資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newComposeData - 欲新增的群發資料
         */
        ComposesAPI.prototype.insert = function(appId, userId, newComposeData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newComposeData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 更新目標群發資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} composeId - 目標群發的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedComposeData - 已編輯後欲更新的群發資料
         */
        ComposesAPI.prototype.update = function(appId, composeId, userId, modifiedComposeData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/composes/' + composeId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedComposeData)
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        /**
         * 刪除一筆群發資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} composeId - 目標群發的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        ComposesAPI.prototype.remove = function(appId, composeId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/composes/' + composeId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return window.fetch(destUrl, reqInit).then(function(response) {
                return responseChecking(response);
            });
        };

        return ComposesAPI;
    })();

    var TagAPI = (function() {
        function TagAPI() {
            this.urlPrefix = apiUrlTable.appsTags;
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        return TagAPI;
    })();

    var ChatroomAPI = (function() {
        function ChatroomAPI(jwt) {
            this.urlPrefix = apiUrlTable.appsChatroomsMessages;
        };

        /**
         * 取得每個 App 使用者的所有聊天室資訊
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        ChatroomAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得使用者指定的 App 內的所有聊天室資訊
         *
         * @param {string} appId - 要查找的使用者的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        ChatroomAPI.prototype.getOne = function(appId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: this.reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return ChatroomAPI;
    })();

    var AuthAPI = (function() {
        function AuthAPI(jwt) {
            this.urlPrefix = apiUrlTable.authentications;
        };

        /**
         * 取得使用者的個人資料
         *
         * @param {string} userId - 使用者的 firebase ID
         * @param {string} email - 目標使用者的 email address
         */
        AuthAPI.prototype.getUsers = function(userId, email) {
            var destUrl = this.urlPrefix + 'users/' + userId + (email ? ('?email=' + email) : '');
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };
        /**
         * 模糊搜尋目標 email 的所有使用者
         *
         * @param {string} userId - 使用者的 firebase ID
         * @param {string} pattern - 目標使用者 email 搜尋字串
         */
        AuthAPI.prototype.searchUsers = function(userId, email) {
            var destUrl = this.urlPrefix + 'users/' + userId + '?' + (email ? ('email=' + email + '&') : '') + 'fuzzy=1';
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AuthAPI;
    })();

    /**
     * 宣告專門處理相關自動回覆的 API 類別
     */
    var AutoreplyAPI = (function() {
        function AutoreplyAPI() {
            this.urlPrefix = apiUrlTable.appsAutoreplies;
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
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆自動回覆資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newAutoreplyData - 欲新增的自動回覆資料
         */
        AutoreplyAPI.prototype.insert = function(appId, userId, newAutoreplyData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newAutoreplyData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 修改一筆自動回覆資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} autoreplyId - 目標自動回覆的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedAutoreplyData - 已編輯後欲更新的自動回覆資料
         */
        AutoreplyAPI.prototype.update = function(appId, userId, autoreplyId, modifiedAutoreplyData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/autoreplies/' + autoreplyId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedAutoreplyData)
            };
            return sendRequest(destUrl, reqInit);
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
            return sendRequest(destUrl, reqInit);
        };

        return AutoreplyAPI;
    })();

    var GroupsMembersAPI = (function() {
        function GroupsMembersAPI(jwt) {
            this.urlPrefix = apiUrlTable.groupsMembers;
        };

        GroupsMembersAPI.prototype.enums = Object.freeze({
            type: {
                OWNER: 'OWNER',
                ADMIN: 'ADMIN',
                WRITE: 'WRITE',
                READ: 'READ'
            }
        });

        GroupsMembersAPI.prototype.getAllGroups = function(userId) {
            var destUrl = this.urlPrefix + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        GroupsMembersAPI.prototype.insert = function(groupId, userId, groupMemberData) {
            var destUrl = this.urlPrefix + 'groups/' + groupId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(groupMemberData)
            };
            return sendRequest(destUrl, reqInit);
        };

        GroupsMembersAPI.prototype.update = function(groupId, memberId, userId, groupMemberData) {
            var destUrl = this.urlPrefix + 'groups/' + groupId + '/members/' + memberId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(groupMemberData)
            };
            return sendRequest(destUrl, reqInit);
        };

        GroupsMembersAPI.prototype.remove = function(groupId, memberId, userId) {
            var destUrl = this.urlPrefix + 'groups/' + groupId + '/members/' + memberId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return GroupsMembersAPI;
    })();

    var GroupsAPI = (function() {
        function GroupsAPI(jwt) {
            this.urlPrefix = apiUrlTable.groups;
        };

        GroupsAPI.prototype.getUserGroups = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        GroupsAPI.prototype.insert = function(userId, groupData) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(groupData)
            };
            return sendRequest(destUrl, reqInit);
        };

        GroupsAPI.prototype.update = function(groupId, userId, groupData) {
            var destUrl = this.urlPrefix + 'groups/' + groupId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(groupData)
            };
            return sendRequest(destUrl, reqInit);
        };

        return GroupsAPI;
    })();

    var UsersAPI = (function() {
        function UsersAPI(jwt) {
            this.urlPrefix = apiUrlTable.groups;
        };

        UsersAPI.prototype.getUser = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        UsersAPI.prototype.update = function(userId, userData) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(userData)
            };
            return sendRequest(destUrl, reqInit);
        };

        return UsersAPI;
    })();

    var GreetingAPI = (function() {
        function GreetingAPI() {
            this.urlPrefix = apiUrlTable.appsGreetings;
        };

        /**
         * 取得使用者所有加好友回覆資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        GreetingAPI.prototype.getAll = function(userId) {
            var destUrl = this.urlPrefix + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得使用者某一個 App 的所有加好友回覆的資料
         *
         * @param {string} appId - 目標加好友回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        GreetingAPI.prototype.getOne = function(appId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆加好友回覆資料
         *
         * @param {string} appId - 目標加好友回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newGreetingData - 欲新增的好友回覆資料
         */
        GreetingAPI.prototype.insert = function(appId, userId, newGreetingData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newGreetingData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆加好友回覆資料
         *
         * @param {string} appId - 目標加好友回覆的 App ID
         * @param {string} greetingId - 目標加好友回覆的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        GreetingAPI.prototype.remove = function(appId, userId, greetingId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/greetings/' + greetingId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };
        return GreetingAPI;
    })();

    if (window.auth && window.auth.ready) {
        // 當 firebase 登入完成後自動更新 API 需要的 JSON Web Token
        window.auth.ready.then(function() {
            setJWT(window.localStorage.getItem('jwt'));
        });
    }

    return {
        setJWT: setJWT,
        app: new AppAPI(),
        calendar: new CalendarAPI(),
        ticket: new TicketAPI(),
        messager: new MessagerAPI(),
        keywordreply: new KeywordreplyAPI(),
        tag: new TagAPI(),
        chatroom: new ChatroomAPI(),
        auth: new AuthAPI(),
        autoreply: new AutoreplyAPI(),
        groupsMembers: new GroupsMembersAPI(),
        groups: new GroupsAPI(),
        users: new UsersAPI(),
        composes: new ComposesAPI(),
        greeting: new GreetingAPI()
    };
})();
