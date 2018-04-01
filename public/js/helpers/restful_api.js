/// <reference path='../../../typings/client/config.d.ts' />

window.restfulAPI = (function() {
    var jwt = window.localStorage.getItem('jwt');
    var reqHeaders = new Headers();
    reqHeaders.set('Content-Type', 'application/json');

    var apiDatabaseUrl = urlConfig.apiUrl + '/api/database/';
    var apiSignUrl = urlConfig.apiUrl + '/api/sign/';
    var apiUrlTable = Object.freeze({
        apps: apiDatabaseUrl + 'apps/',
        appsAutoreplies: apiDatabaseUrl + 'apps-autoreplies/',
        appsChatrooms: apiDatabaseUrl + 'apps-chatrooms/',
        appsChatroomsMessagers: apiDatabaseUrl + 'apps-chatrooms-messagers/',
        appsComposes: apiDatabaseUrl + 'apps-composes/',
        appsGreetings: apiDatabaseUrl + 'apps-greetings/',
        appsKeywordreplies: apiDatabaseUrl + 'apps-keywordreplies/',
        appsTemplates: apiDatabaseUrl + 'apps-templates/',
        appsRichmenus: apiDatabaseUrl + 'apps-richmenus/',
        appsFields: apiDatabaseUrl + 'apps-fields/',
        appsTickets: apiDatabaseUrl + 'apps-tickets/',
        calendarsEvents: apiDatabaseUrl + 'calendars-events/',
        consumers: apiDatabaseUrl + 'consumers/',
        groupsMembers: apiDatabaseUrl + 'groups-members/',
        groups: apiDatabaseUrl + 'groups/',
        users: apiDatabaseUrl + 'users/',
        signRefresh: apiSignUrl + 'refresh/'
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
    var ConsumersAPI = (function() {
        function ConsumersAPI() {
            this.urlPrefix = apiUrlTable.consumers;
        }

        /**
         * 取得使用者所有 consumer
         *
         * @param {string} userId
         */
        ConsumersAPI.prototype.findAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 取得指定的 consumer 資料
         *
         * @param {string} appId - 目標 messager 的 App ID
         * @param {string} platformUid
         * @param {string} userId
         */
        ConsumersAPI.prototype.findOne = function(platformUid, userId) {
            var destUrl = this.urlPrefix + 'consumers/' + platformUid + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 更新指定 consumer 資料
         *
         * @param {string} platformUid
         * @param {string} userId
         * @param {any} consumer - 欲更新的 consumer 資料
         */
        ConsumersAPI.prototype.update = function(platformUid, userId, consumer) {
            var destUrl = this.urlPrefix + 'consumers/' + platformUid + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(consumer)
            };
            return sendRequest(destUrl, reqInit);
        };

        return ConsumersAPI;
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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

    var AppsFieldsAPI = (function() {
        function AppsFieldsAPI() {
            this.urlPrefix = apiUrlTable.appsFields;
        }

        AppsFieldsAPI.prototype.enums = Object.freeze({
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
         * @param {string} userId
         */
        AppsFieldsAPI.prototype.findAll = function(userId) {
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
         * @param {string} appId - 目標的 App ID
         * @param {string} userId
         * @param {*} field - 欲新增的資料
         */
        AppsFieldsAPI.prototype.insert = function(appId, userId, field) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(field)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 更新一筆目標 App 客戶分類條件資料
         *
         * @param {string} appId - 目標客戶分類條件所屬的 App ID
         * @param {string} fieldId - 目標客戶分類條件的 ID
         * @param {string} userId
         * @param {*} field - 已編輯後欲更新的客戶分類條件資料
         */
        AppsFieldsAPI.prototype.update = function(appId, fieldId, userId, field) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/fields/' + fieldId + '/users/' + userId;
            var reqInit = {
                method: 'PUT',
                headers: reqHeaders,
                body: JSON.stringify(field)
            };
            return sendRequest(destUrl, reqInit);
        };

        /**
         * 刪除一筆目標 App 客戶分類條件資料
         *
         * @param {string} appId - 目標客戶分類條件所屬的 App ID
         * @param {string} fieldId - 目標客戶分類條件的 ID
         * @param {string} userId
         */
        AppsFieldsAPI.prototype.remove = function(appId, fieldId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/fields/' + fieldId + '/users/' + userId;
            var reqInit = {
                method: 'DELETE',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsFieldsAPI;
    })();

    var AppsChatroomsAPI = (function() {
        function AppsChatroomsAPI(jwt) {
            this.urlPrefix = apiUrlTable.appsChatrooms;
        };

        /**
         * 取得每個 App 使用者的所有聊天室資訊
         *
         * @param {string} userId
         */
        AppsChatroomsAPI.prototype.findAll = function(userId) {
            var destUrl = this.urlPrefix + 'users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsChatroomsAPI;
    })();

    var AppsChatroomsMessagersAPI = (function() {
        function AppsChatroomsMessagersAPI(jwt) {
            this.urlPrefix = apiUrlTable.appsChatroomsMessagers;
        };

        /**
         * @param {string} appId
         * @param {string} chatroomId
         * @param {string} messagerId
         * @param {string} userId
         */
        AppsChatroomsMessagersAPI.prototype.findOne = function(appId, chatroomId, messagerId, userId) {
            var destUrl = this.urlPrefix + 'apps/' + appId + '/chatrooms/' + chatroomId + '/messagers/' + messagerId + '/users/' + userId;
            var reqInit = {
                method: 'GET',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };

        return AppsChatroomsMessagersAPI;
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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
         * @param {string} userId
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

    var SignAPI = (function() {
        function SignAPI() {
        };
        SignAPI.prototype.refresh = function(userId) {
            var destUrl = apiUrlTable.signRefresh + 'users/' + userId;
            var reqInit = {
                method: 'POST',
                headers: reqHeaders
            };
            return sendRequest(destUrl, reqInit);
        };
        return SignAPI;
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
        appsChatrooms: new AppsChatroomsAPI(),
        appsChatroomsMessagers: new AppsChatroomsMessagersAPI(),
        appsComposes: new AppsComposesAPI(),
        appsGreetings: new AppsGreetingsAPI(),
        appsKeywordreplies: new AppsKeywordrepliesAPI(),
        appsRichmenus: new AppsRichmenusAPI(),
        appsFields: new AppsFieldsAPI(),
        appsTickets: new AppsTicketsAPI(),
        calendarsEvents: new CalendarsEventsAPI(),
        consumers: new ConsumersAPI(),
        groupsMembers: new GroupsMembersAPI(),
        groups: new GroupsAPI(),
        users: new UsersAPI(),
        sign: new SignAPI()
    };
})();
