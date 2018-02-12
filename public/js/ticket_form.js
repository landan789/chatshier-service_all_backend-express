/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var userId = '';
    var appsData = {};
    var appsMessagersData = {};
    var api = window.restfulAPI;

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
            api.app.getAll(userId),
            api.messager.getAll(userId)
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
                updateMessagerInfoElems(appsMessagersData[selectedId].messagers);
            } else {
                $appSelectElem.append('<option value="">無資料</option>');
            }

            // 啟用選取器選取的事件
            $appSelectElem.on('change', function(ev) {
                var appId = ev.target.value;
                updateMessagerInfoElems(appsMessagersData[appId].messagers);
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
            $messagerSelectElem.append('<option value="null">無資料</option>');
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
            $messagerPhoneElem.prop('value', messagerInfo.phone);
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

            return api.ticket.insert(ticketAppId, userId, newTicket).then(function() {
                window.location.href = '/ticket'; // 返回 ticket 清單頁
            });
        }
    }
})();