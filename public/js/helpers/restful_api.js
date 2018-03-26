/// <reference path='../../../typings/client/config.d.ts' />

window.restfulAPI = (function() {
    var jwt = window.localStorage.getItem('jwt');
    var reqHeaders = new Headers();
    reqHeaders.set('Content-Type', 'application/json');

    var prefixUrl = urlConfig.apiUrl + '/api/';
    var apiUrlTable = Object.freeze({
        apps: prefixUrl + 'apps/',
        appsAutoreplies: prefixUrl + 'apps-autoreplies/',
        appsChatroomsMessages: prefixUrl + 'apps-chatrooms-messages/',
        appsComposes: prefixUrl + 'apps-composes/',
        appsGreetings: prefixUrl + 'apps-greetings/',
        appsMessagers: prefixUrl + 'apps-messagers/',
        appsKeywordreplies: prefixUrl + 'apps-keywordreplies/',
        appsTemplates: prefixUrl + 'apps-templates/',
        appsRichmenus: prefixUrl + 'apps-richmenus/',
        appsTags: prefixUrl + 'apps-tags/',
        appsTickets: prefixUrl + 'apps-tickets/',
        calendarsEvents: prefixUrl + 'calendars-events/',
        groupsMembers: prefixUrl + 'groups-members/',
        groups: prefixUrl + 'groups/',
        users: prefixUrl + 'users/',
        bot: prefixUrl + 'bot/'
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
    jwt && setJWT(jwt);

    /**
     * @param {Response} res
     */
    var responseChecking = function(res) {
        if (!res.ok && res.status < 500) {
            return Promise.reject(new Error(res.status + ' ' + res.statusText));
        }

        if (!res.ok && res.status >= 500) {
            return res.json().then(function(resJson) {
                return Promise.reject(resJson);
            });
        }

        return res.json().then(function(resJson) {
            if (1 !== resJson.status) {
                return Promise.reject(resJson);
            }
            return resJson;
        });
    };

    /**
     * @param {RequestInfo} reqInfo
     * @param {RequestInit|RequestInit[]} reqInit
     */
    var sendRequest = function(reqInfo, reqInit, usingRecursive) {
        usingRecursive = !!usingRecursive;

        if (reqInit instanceof Array) {
            if (usingRecursive) {
                var reqInits = reqInit;
                var resJsons = [];

                var nextPromise = function(i) {
                    if (i >= reqInits.length) {
                        return Promise.resolve(resJsons);
                    }
                    var _reqInit = reqInits[i];

                    return window.fetch(reqInfo, _reqInit).then(function(res) {
                        return responseChecking(res);
                    }).then(function(resJson) {
                        resJsons.push(resJson);
                        return nextPromise(i + 1);
                    });
                };
                return nextPromise(0);
            } else {
                return Promise.all(reqInits.map((_reqInit) => {
                    return window.fetch(reqInfo, _reqInit).then(function(res) {
                        return responseChecking(res);
                    });
                }));
            }
        }

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
        AppAPI.prototype.findAll = function(userId) {
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
        AppAPI.prototype.findOne = function(appId, userId) {
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
    var CalendarsEventsAPI = (function() {
        function CalendarsEventsAPI() {
            this.urlPrefix = apiUrlTable.calendarsEvents;
        };

        /**
         * 取得使用者所有的 calendar 事件
         *
         * @param {string} userId - 使用者的 firebase id
         */
        CalendarsEventsAPI.prototype.findAll = function(userId) {
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
        CalendarsEventsAPI.prototype.insert = function(userId, calendarData) {
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
        CalendarsEventsAPI.prototype.update = function(calendarId, eventId, userId, calendarData) {
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
        CalendarsEventsAPI.prototype.remove = function(calendarId, eventId, userId) {
            var destUrl = this.urlPrefix + 'calendars/' + calendarId + '/events/' + eventId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return CalendarsEventsAPI;
    })();

    /**
     * 宣告專門處理 Messager 相關的 API 類別
     */
    var AppsMessagersAPI = (function() {
        function AppsMessagersAPI() {
            this.urlPrefix = apiUrlTable.appsMessagers;
        }

        /**
         * 取得使用者所有在 Chatshier 內設定的 App 內的所有 Messagers
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsMessagersAPI.prototype.findAll = function(userId) {
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
        AppsMessagersAPI.prototype.findOne = function(appId, msgerId, userId) {
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
        AppsMessagersAPI.prototype.update = function(appId, msgerId, userId, msgerData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/messager/' + msgerId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(msgerData)
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsMessagersAPI;
    })();

    /**
     * 宣告專門處理待辦事項相關的 API 類別
     */
    var AppsTicketsAPI = (function() {
        function AppsTicketsAPI() {
            this.urlPrefix = apiUrlTable.appsTickets;
        }

        /**
         * 取得使用者所有設定待辦事項
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsTicketsAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
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
        AppsTicketsAPI.prototype.insert = function(appId, userId, ticketData) {
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
        AppsTicketsAPI.prototype.update = function(appId, ticketId, userId, ticketData) {
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
        AppsTicketsAPI.prototype.remove = function(appId, ticketId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tickets/' + ticketId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsTicketsAPI;
    })();

    /**
     * 宣告專門處理關鍵字回覆相關的 API 類別
     */
    var AppsKeywordrepliesAPI = (function() {
        function AppsKeywordrepliesAPI() {
            this.urlPrefix = apiUrlTable.appsKeywordreplies;
        }

        /**
         * 取得使用者所有關鍵字回覆資料
         *
         * @param {string} appId - 目標關鍵字回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsKeywordrepliesAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
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
        AppsKeywordrepliesAPI.prototype.insert = function(appId, userId, newKeywordreplyData) {
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
        AppsKeywordrepliesAPI.prototype.update = function(appId, keywordreplyId, userId, modifiedKeywordreplyData) {
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
        AppsKeywordrepliesAPI.prototype.remove = function(appId, keywordreplyId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/keywordreplies/' + keywordreplyId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsKeywordrepliesAPI;
    })();

    /**
     * 宣告專門處理關鍵字回覆相關的 API 類別
     */
    var AppsComposesAPI = (function() {
        function AppsComposesAPI() {
            this.urlPrefix = apiUrlTable.appsComposes;
        }

        /**
         * 取得使用者所有群發回覆資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsComposesAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };

            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆群發的資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {any|any[]} composes - 欲新增的群發資料
         */
        AppsComposesAPI.prototype.insert = function(appId, userId, composes, usingRecursive) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;

            var reqInit;
            if (composes instanceof Array) {
                reqInit = composes.map(function(compose) {
                    return {
                        method: 'POST',
                        headers: reqHeaders,
                        body: JSON.stringify(compose)
                    };
                });
            } else {
                reqInit = {
                    method: 'POST',
                    headers: reqHeaders,
                    body: JSON.stringify(composes)
                };
            }
            return sendRequest(destUrl, reqInit, usingRecursive);
        };

        /**
         * 更新目標群發資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} composeId - 目標群發的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {any} compose - 已編輯後欲更新的群發資料
         */
        AppsComposesAPI.prototype.update = function(appId, composeId, userId, compose) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/composes/' + composeId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(compose)
            };

            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆群發資料
         *
         * @param {string} appId - 目標群發的 App ID
         * @param {string} composeId - 目標群發的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsComposesAPI.prototype.remove = function(appId, composeId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/composes/' + composeId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };

            return sendRequest(destUrl, reqInit);
        };

        return AppsComposesAPI;
    })();

    var AppsTagsAPI = (function() {
        function AppsTagsAPI() {
            this.urlPrefix = apiUrlTable.appsTags;
        }

        AppsTagsAPI.prototype.enums = Object.freeze({
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
         * 取得使用者所有客戶分類條件資料
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsTagsAPI.prototype.findAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆 App 客戶分類條件的資料
         *
         * @param {string} appId - 目標待辦事項的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} insertTagData - 欲新增的待辦事項資料
         */
        AppsTagsAPI.prototype.insert = function(appId, userId, insertTagData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(insertTagData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 更新一筆目標 App 客戶分類條件資料
         *
         * @param {string} appId - 目標客戶分類條件所屬的 App ID
         * @param {string} tagId - 目標客戶分類條件的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedTagData - 已編輯後欲更新的客戶分類條件資料
         */
        AppsTagsAPI.prototype.update = function(appId, tagId, userId, modifiedTagData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tags/' + tagId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedTagData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆目標 App 客戶分類條件資料
         *
         * @param {string} appId - 目標客戶分類條件所屬的 App ID
         * @param {string} tagId - 目標客戶分類條件的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsTagsAPI.prototype.remove = function(appId, tagId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/tags/' + tagId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsTagsAPI;
    })();

    var AppsChatroomsMessagesAPI = (function() {
        function AppsChatroomsMessagesAPI(jwt) {
            this.urlPrefix = apiUrlTable.appsChatroomsMessages;
        };

        /**
         * 取得每個 App 使用者的所有聊天室資訊
         *
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsChatroomsMessagesAPI.prototype.findAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsChatroomsMessagesAPI;
    })();

    /**
     * 宣告專門處理相關自動回覆的 API 類別
     */

    var AppsAutorepliesAPI = (function() {
        function AppsAutorepliesAPI() {
            this.urlPrefix = apiUrlTable.appsAutoreplies;
        };

        /**
         * 取得使用者所有自動回覆資料
         *
         * @param {string} appId - 目標自動回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsAutorepliesAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
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
        AppsAutorepliesAPI.prototype.insert = function(appId, userId, newAutoreplyData) {
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
        AppsAutorepliesAPI.prototype.update = function(appId, autoreplyId, userId, modifiedAutoreplyData) {
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
        AppsAutorepliesAPI.prototype.remove = function(appId, autoreplyId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/autoreplies/' + autoreplyId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsAutorepliesAPI;
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

        GroupsMembersAPI.prototype.findAll = function(userId) {
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

        GroupsAPI.prototype.findAll = function(userId) {
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
            this.urlPrefix = apiUrlTable.users;
        };

        UsersAPI.prototype.find = function(userId, email, useFuzzy) {
            useFuzzy = !!useFuzzy;

            var destUrl = this.urlPrefix + 'users/' + userId + '?';
            destUrl += (email ? ('email=' + email + '&') : '');
            destUrl += (useFuzzy ? ('fuzzy=1') : '');

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

    var AppsGreetingsAPI = (function() {
        function AppsGreetingsAPI() {
            this.urlPrefix = apiUrlTable.appsGreetings;
        };

        /**
         * 取得使用者所有加好友回覆資料
         *
         * @param {string} appId - 目標加好友回覆的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsGreetingsAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
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
        AppsGreetingsAPI.prototype.insert = function(appId, userId, newGreetingData) {
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
        AppsGreetingsAPI.prototype.remove = function(appId, greetingId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/greetings/' + greetingId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };
        return AppsGreetingsAPI;
    })();

    /**
     * 宣告專門處理相關Template的 API 類別
     */
    var AppsTemplatesAPI = (function() {
        function AppsTemplatesAPI() {
            this.urlPrefix = apiUrlTable.appsTemplates;
        };
        /**
         * 取得使用者所有Template資料
         *
         * @param {string} appId - 目標Template的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsTemplatesAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得一筆Template資料
         *
         * @param {string} appId - 目標Template的 App ID
         * @param {string} templateId - 目標Template的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsTemplatesAPI.prototype.findOne = function(appId, templateId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/templates/' + templateId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆Template資料
         *
         * @param {string} appId - 目標Template的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} newTemplateData - 欲新增的Template資料
         */
        AppsTemplatesAPI.prototype.insert = function(appId, userId, newTemplateData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(newTemplateData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 修改一筆Template資料
         *
         * @param {string} appId - 目標Template的 App ID
         * @param {string} templateId - 目標Template的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} modifiedTemplateData - 已編輯後欲更新的Template資料
         */
        AppsTemplatesAPI.prototype.update = function(appId, templateId, userId, modifiedTemplateData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/templates/' + templateId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(modifiedTemplateData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆Template資料
         *
         * @param {string} appId - 目標Template的 App ID
         * @param {string} templateId - 目標Template的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsTemplatesAPI.prototype.remove = function(appId, templateId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/templates/' + templateId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsTemplatesAPI;
    })();

    var AppsRichmenusAPI = (function() {
        function AppsRichmenusAPI() {
            this.urlPrefix = apiUrlTable.appsRichmenus;
        };

        /**
         * 取得使用者所有Richmenu資料
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsRichmenusAPI.prototype.findAll = function(appId, userId) {
            var destUrl = this.urlPrefix + (appId ? ('apps/' + appId + '/') : '') + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得一筆Richmenu資料
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} postRichmenuData - 更新的Richmenu資料
         */
        AppsRichmenusAPI.prototype.findOne = function(appId, richmenuId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆Richmenu資料
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} postRichmenuData - 新增的Richmenu資料
         */
        AppsRichmenusAPI.prototype.insert = function(appId, userId, postRichmenuData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(postRichmenuData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 修改一筆Richmenu資料
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         * @param {string} userId - 使用者的 firebase ID
         * @param {*} putRichmenuData - 更新的Richmenu資料
         */
        AppsRichmenusAPI.prototype.update = function(appId, richmenuId, userId, putRichmenuData) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(putRichmenuData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆Richmenu資料
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         * @param {string} userId - 使用者的 firebase ID
         */
        AppsRichmenusAPI.prototype.remove = function(appId, richmenuId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };
        return AppsRichmenusAPI;
    })();

    var BotAPI = (function() {
        function BotAPI() {
            this.urlPrefix = apiUrlTable.bot;
        };
        /**
         * 取得使用者在 LINE server 的 所有Richmenu 資料
         * @param {string} appId - 目標Richmenu的 App ID
         */
        BotAPI.prototype.getRichMenuList = function(appId) {
            var destUrl = this.urlPrefix + 'apps/' + appId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得一筆在 LINE server 的 Richmenu 資料
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         */
        BotAPI.prototype.getRichMenu = function(appId, richmenuId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + 'richmenus' + richmenuId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得一筆在 LINE server 的 Richmenu 圖片
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         */
        BotAPI.prototype.getRichMenuImage = function(appId, richmenuId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + 'richmenus' + richmenuId + '/content';
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 新增一筆在 LINE server 的 Richmenu 資料
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {*} postRichmenuData - 新增的Richmenu資料
         */
        BotAPI.prototype.createRichMenu = function(appId, postRichmenuData) {
            var destUrl = this.urlPrefix + 'apps/' + appId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(postRichmenuData)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 設定 目標Richmenu 的圖片
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         * @param {*} postRichmenuImg - 目標Richmenu的 圖片
         */
        BotAPI.prototype.setRichMenuImage = function(appId, richmenuId, postRichmenuImg) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId + '/content';
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(postRichmenuImg)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 連結 目標Richmenu 與 LINE client
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         */
        BotAPI.prototype.linkRichMenuToUser = function(appId, richmenuId, senderId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId + '/senders/' + senderId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 解除 目標Richmenu 與 LINE client 的連結
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         */
        BotAPI.prototype.unlinkRichMenuFromUser = function(appId, richmenuId, senderId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId + '/senders/' + senderId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆在 LINE server 的 Richmenu 資料
         *
         * @param {string} appId - 目標Richmenu的 App ID
         * @param {string} richmenuId - 目標Richmenu的 ID
         */
        BotAPI.prototype.deleteRichMenu = function(appId, richmenuId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/richmenus/' + richmenuId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return BotAPI;
    })();

    return {
        setJWT: setJWT,
        apps: new AppAPI(),
        appsAutoreplies: new AppsAutorepliesAPI(),
        appsTemplates: new AppsTemplatesAPI(),
        appsChatroomsMessages: new AppsChatroomsMessagesAPI(),
        appsComposes: new AppsComposesAPI(),
        appsGreetings: new AppsGreetingsAPI(),
        appsMessagers: new AppsMessagersAPI(),
        appsKeywordreplies: new AppsKeywordrepliesAPI(),
        appsRichmenus: new AppsRichmenusAPI(),
        appsTags: new AppsTagsAPI(),
        appsTickets: new AppsTicketsAPI(),
        calendarsEvents: new CalendarsEventsAPI(),
        groupsMembers: new GroupsMembersAPI(),
        groups: new GroupsAPI(),
        users: new UsersAPI(),
        bot: new BotAPI()
    };
})();
