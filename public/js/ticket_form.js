
/**
 * 宣告專門處理 Ticket 相關的 API 類別
 */
var TicketAPI = (function() {
    var responseChecking = function(response) {
        return Promise.resolve().then(function() {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then(function(respJson) {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    /**
     * TicketAPI 建構子
     *
     * @param {*} jwt - API 傳輸時必須攜帶的 json web token
     */
    function TicketAPI(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得使用者所有設定待辦事項
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    TicketAPI.prototype.getAll = function(userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 取得使用者某一個 App 的待辦事項
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} userId - 使用者的 firebase ID
     */
    TicketAPI.prototype.getOne = function(ticketAppId, userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 新增一筆待辦事項資料
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} userId - 使用者的 firebase ID
     * @param {*} newTicketData - 欲新增的待辦事項資料
     */
    TicketAPI.prototype.insert = function(ticketAppId, userId, newTicketData) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/users/' + userId;
        var reqInit = {
            method: 'POST',
            headers: this.reqHeaders,
            body: JSON.stringify(newTicketData)
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 更新目標待辦事項資料
     *
     * @param {*} ticketAppId - 目標待辦事項的 App ID
     * @param {*} ticketId - 目標待辦事項的 ID
     * @param {*} userId - 使用者的 firebase ID
     * @param {*} modifiedTicketData - 已編輯後欲更新的待辦事項資料
     */
    TicketAPI.prototype.update = function(ticketAppId, ticketId, userId, modifiedTicketData) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/tickets/' + ticketId + '/users/' + userId;
        var reqInit = {
            method: 'PUT',
            headers: this.reqHeaders,
            body: JSON.stringify(modifiedTicketData)
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 刪除一筆待辦事項資料
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} ticketId - 目標待辦事項的 ID
     * @param {string} userId - 使用者的 firebase ID
     */
    TicketAPI.prototype.remove = function(ticketAppId, ticketId, userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/tickets/' + ticketId + '/users/' + userId;
        var reqInit = {
            method: 'DELETE',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    return TicketAPI;
})();

/**
 * 宣告專門處理 Chatshier App 相關的 API 類別
 */
var ChatshierAppAPI = (function() {
    var responseChecking = function(response) {
        return Promise.resolve().then(function() {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then(function(respJson) {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    /**
     * ChatshierAppAPI 建構子
     *
     * @param {*} jwt - API 傳輸時必須攜帶的 json web token
     */
    function ChatshierAppAPI(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得使用者所有在 Chatshier 內設定的 App
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    ChatshierAppAPI.prototype.getAll = function(userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    /**
     * 取得使用者所有在 Chatshier 內設定的 App 內的所有 Messagers
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    ChatshierAppAPI.prototype.getAllMessagers = function(userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-messagers/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
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
    ChatshierAppAPI.prototype.getAllMessagersByAppId = function(appId, userId) {
        var destUrl = urlConfig.apiUrl + '/api/apps-messagers/apps/' + appId + '/users/' + userId;
        var reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then(function(response) {
            return responseChecking(response);
        });
    };

    return ChatshierAppAPI;
})();

(function() {
    var userId = '';
    var appsData = {};
    var appsMessagersData = {};

    var chatshierAppAPI = new ChatshierAppAPI(null);
    var ticketAPI = new TicketAPI(null);
    var jqDoc = $(document);

    var $appSelectElem = $('select#add-form-app');
    var $messagerSelectElem = $('select#add-form-name');
    var $messagerIdElem = $('input#add-form-uid');
    var $messagerEmailElem = $('input#add-form-email');
    var $messagerPhoneElem = $('input#add-form-phone');

    // ======================
    // urlConfig undefined error handle
    !urlConfig && (urlConfig = {});
    !urlConfig.apiUrl && (urlConfig.apiUrl = window.location.origin); // 預設 website 與 api server 為同一網域
    // ======================

    auth.ready.then(function(currentUser) {
        userId = currentUser.uid; // 儲存全域用變數 userId
        ticketAPI.jwt = chatshierAppAPI.jwt = window.localStorage.getItem('jwt');
        ticketAPI.reqHeaders.set('Authorization', ticketAPI.jwt);
        chatshierAppAPI.reqHeaders.set('Authorization', chatshierAppAPI.jwt);

        jqDoc.on('click', '#add-form-submit', submitAdd); // 新增 ticket
        jqDoc.on('click', '#add-form-goback', function() { location.href = '/ticket'; }); // 返回 ticket
        loadUserAllApps();
    });

    /**
     * 載入使用者所有的 app 清單，將清單儲存至選擇器中，供使用者選取
     */
    function loadUserAllApps() {
        if (!$appSelectElem) {
            return Promise.resolve();
        }

        // 先取消選取器選取的事件
        $appSelectElem.off('change');

        return Promise.all([
            chatshierAppAPI.getAll(userId),
            chatshierAppAPI.getAllMessagers(userId)
        ]).then(function(respJsons) {
            appsData = respJsons[0].data;
            $appSelectElem.empty();
            if (appsData && Object.keys(appsData).length > 0) {
                // 確定取回來的資料有數據，重新配置選取器內的選項資料
                appsMessagersData = respJsons[1].data;

                for (var appId in appsData) {
                    $appSelectElem.append('<option value=' + appId + '>' + appsData[appId].name + '</option>');
                }

                var selectedId = $appSelectElem.find('option:selected').val();
                updateMessagerInfoElems(appsMessagersData[selectedId]);
            } else {
                $appSelectElem.append('<option value="">無資料</option>');
            }

            // 啟用選取器選取的事件
            $appSelectElem.on('change', function(ev) {
                var appId = ev.target.value;
                updateMessagerInfoElems(appsMessagersData[appId]);
            });
        });
    }

    /**
     * 根據輸入的清單更新客戶的資訊於 view 上顯示
     *
     * @param {any} messagerData
     */
    function updateMessagerInfoElems(messagerData) {
        if (!$messagerSelectElem) {
            return;
        }

        $messagerSelectElem.empty();
        if (messagerData && Object.keys(messagerData).length > 0) {
            for (var messagerId in messagerData) {
                $messagerSelectElem.append('<option value=' + messagerId + '>' + messagerData[messagerId].name + '</option>');
            }
        } else {
            $messagerSelectElem.append('<option value="">無資料</option>');
        }

        var updateInfo = function(selectedId) {
            if (!selectedId) {
                $messagerIdElem.prop('value', '');
                $messagerEmailElem.prop('value', '');
                $messagerPhoneElem.prop('value', '');
                return;
            }

            var messagerInfo = messagerData[selectedId];
            $messagerIdElem.prop('value', selectedId);
            $messagerEmailElem.prop('value', messagerInfo.email);
            $messagerPhoneElem.prop('value', messagerInfo.telephone);
        };
        updateInfo($messagerSelectElem.val());

        // 重新建立事件
        $messagerSelectElem.off('change').on('change', function(ev) {
            var messagerId = ev.target.value;
            updateInfo(messagerId);
        });
    }

    function submitAdd() {
        var messagerId = $messagerIdElem.val();
        // var messagerName = $messagerSelectElem.find('option:selected').text();
        // var messagerEmail = $messagerEmailElem.val();
        // var messagerPhone = $messagerPhoneElem.val();
        var errorElem = $('#error');
        var ticketAppId = $appSelectElem.find('option:selected').val();

        // 驗證用正規表達式
        // var emailReg = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>().,;\s@"]+\.{0,1})+[^<>().,;:\s@"]{2,})$/;
        // var phoneReg = /\b[0-9]+\b/;

        errorElem.empty();
        if (!ticketAppId) {
            errorElem.append('請選擇App');
            window.setTimeout(function() {
                errorElem.empty();
            }, 3000);
        // } else if (!emailReg.test(messagerEmail)) {
        //     errorElem.append('請輸入正確的email格式');

        //     var formEmail = $('#form-email');
        //     formEmail.css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         errorElem.empty();
        //         formEmail.css('border', '1px solid #ccc');
        //     }, 3000);
        // } else if (!phoneReg.test(messagerPhone)) {
        //     errorElem.append('請輸入正確的電話格式');

        //     var formPhone = $('#form-phone');
        //     formPhone.css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         errorElem.empty();
        //         formPhone.css('border', '1px solid #ccc');
        //     }, 3000);
        // } else if (!messagerId) {
        //     errorElem.append('請輸入clientId');

        //     var formSubject = $('#form-subject');
        //     formSubject.css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         errorElem.empty();
        //         formSubject.css('border', '1px solid #ccc');
        //     }, 3000);
        // } else if (!messagerName) {
        //     errorElem.append('請輸入客戶姓名');
        //     $('#add-form-name').css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         errorElem.empty();
        //         $('#add-form-name').css('border', '1px solid #ccc');
        //     }, 3000);
        } else if (!$('#add-form-description').val()) {
            errorElem.append('請輸入說明內容');
            $('#add-form-description').css('border', '1px solid red');
            window.setTimeout(function() {
                errorElem.empty();
                $('#add-form-description').css('border', '1px solid #ccc');
            }, 3000);
        } else {
            var status = parseInt($('#add-form-status option:selected').val());
            var priority = parseInt($('#add-form-priority option:selected').val());
            // var ownerAgent = $('#add-form-agents option:selected').val();
            var description = $('#add-form-description').val();

            var nowTime = Date.now();
            var dueTime = nowTime + 86400000 * 3; // 過期時間預設為3天後

            var newTicket = {
                createdTime: nowTime,
                description: description || '',
                dueTime: dueTime,
                priority: priority,
                messagerId: messagerId,
                status: status,
                updatedTime: nowTime
            };

            return ticketAPI.insert(ticketAppId, userId, newTicket).then(function() {
                window.location.href = '/ticket'; // 返回 ticket 清單頁
            });
        }
    }
})();
