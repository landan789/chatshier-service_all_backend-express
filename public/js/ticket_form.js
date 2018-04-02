/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var apps = {};
    var appsAgents = {};
    var consumers = {};
    var groups = {};
    var users = {};
    var api = window.restfulAPI;

    var CHATSHIER = 'CHATSHIER';

    var jqDoc = $(document);
    var $appSelectElem = $('select#add-form-app');
    var $consumerSelectElem = $('select#add-form-name');
    var $platformUidElem = $('input#add-form-uid');
    var $consumerEmailElem = $('input#add-form-email');
    var $consumerPhoneElem = $('input#add-form-phone');
    var $assignedSelectElem = $('select#assigned-name');

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    jqDoc.on('click', '#add-form-submit', submitAdd); // 新增 ticket
    jqDoc.on('click', '#add-form-goback', function() { location.href = '/ticket'; }); // 返回 ticket
    loadUserAllApps();

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
            api.apps.findAll(userId),
            api.consumers.findAll(userId),
            api.users.find(userId),
            api.groups.findAll(userId)
        ]).then(function(respJsons) {
            apps = respJsons.shift().data;
            consumers = respJsons.shift().data;
            users = respJsons.shift().data;
            groups = respJsons.shift().data;

            $appSelectElem.empty();

            for (var appId in apps) {
                var app = apps[appId];
                if (CHATSHIER === app.type) {
                    delete apps[appId];
                    continue;
                }

                // 準備各個 app 的指派人清單
                // 由於每個 app 可能隸屬於不同的群組
                // 因此指派人清單必須根據 app 所屬的群組分別建立清單
                appsAgents[appId] = { agents: {} };
                for (var groupId in groups) {
                    var group = groups[groupId];
                    if (0 <= group.app_ids.indexOf(appId)) {
                        for (var memberId in group.members) {
                            var memberUserId = group.members[memberId].user_id;
                            appsAgents[appId].agents[memberUserId] = {
                                name: users[memberUserId].name,
                                email: users[memberUserId].email
                            };
                        }
                    }
                }

                $appSelectElem.append('<option value=' + appId + '>' + app.name + '</option>');
            }

            if (0 === Object.keys(apps).length) {
                $appSelectElem.append('<option value="">無資料</option>');
            } else {
                var selectedAppId = $appSelectElem.find('option:selected').val();
                updateConsumerInfoElems(consumers, appsAgents[selectedAppId].agents);
            }

            // 啟用選取器選取的事件
            $appSelectElem.on('change', function(ev) {
                var appId = ev.target.value;
                updateConsumerInfoElems(consumers, appsAgents[appId].agents);
            });
        });
    }

    /**
     * 根據輸入的清單更新客戶的資訊於 view 上顯示
     *
     * @param {any} consumers
     */
    function updateConsumerInfoElems(consumers, agents) {
        $consumerSelectElem.empty();
        if (consumers && Object.keys(consumers).length > 0) {
            for (var consumerId in consumers) {
                var consumer = consumers[consumerId];
                $consumerSelectElem.append('<option value=' + consumer.platformUid + '>' + consumer.name + '</option>');
            }
        } else {
            $consumerSelectElem.append('<option value="">無資料</option>');
        }

        $assignedSelectElem.empty();
        if (agents && Object.keys(agents).length > 0) {
            for (var agentUserId in agents) {
                var agent = agents[agentUserId];
                $assignedSelectElem.append('<option value=' + agentUserId + '>' + agent.name + '</option>');
            }
        } else {
            $assignedSelectElem.append('<option value="">無資料</option>');
        }

        var updateInfo = function(selectedUid) {
            if (!selectedUid) {
                $platformUidElem.prop('value', '');
                $consumerEmailElem.prop('value', '');
                $consumerPhoneElem.prop('value', '');
                return;
            }

            var consumer = consumers[selectedUid];
            if (consumer) {
                $platformUidElem.prop('value', selectedUid);
                $consumerEmailElem.prop('value', consumer.email);
                $consumerPhoneElem.prop('value', consumer.phone);
            }
        };
        updateInfo($consumerSelectElem.val());

        // 重新建立事件
        $consumerSelectElem.off('change').on('change', function(ev) {
            var platformUid = ev.target.value;
            updateInfo(platformUid);
        });
    }

    function submitAdd() {
        var $submitBtn = $(this);

        var platformUid = $platformUidElem.val();
        // var consumerName = $consumerSelectElem.find('option:selected').text();
        // var consumerEmail = $consumerEmailElem.val();
        // var consumerPhone = $consumerPhoneElem.val();
        var appId = $appSelectElem.find('option:selected').val();
        var $errorElem = $('#error');
        var $formUname = $('#add-form-name');
        var $formDescription = $('#add-form-description');
        var description = $formDescription.val();
        var assignedId = $assignedSelectElem.find('option:selected').val();

        // 驗證用正規表達式
        // var emailReg = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>().,;\s@"]+\.{0,1})+[^<>().,;:\s@"]{2,})$/;
        // var phoneReg = /\b[0-9]+\b/;

        $errorElem.empty();
        if (!appId) {
            $errorElem.append('請選擇App');
            window.setTimeout(function() {
                $errorElem.empty();
            }, 3000);
        // } else if (!emailReg.test(consumerEmail)) {
        //     $errorElem.append('請輸入正確的email格式');

        //     var formEmail = $('#form-email');
        //     formEmail.css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         $errorElem.empty();
        //         formEmail.css('border', '1px solid #ccc');
        //     }, 3000);
        // } else if (!phoneReg.test(consumerPhone)) {
        //     $errorElem.append('請輸入正確的電話格式');

        //     var formPhone = $('#form-phone');
        //     formPhone.css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         $errorElem.empty();
        //         formPhone.css('border', '1px solid #ccc');
        //     }, 3000);
        // } else if (!consumerName) {
        //     $errorElem.append('請輸入客戶姓名');
        //     $('#add-form-name').css('border', '1px solid red');
        //     window.setTimeout(function() {
        //         $errorElem.empty();
        //         $('#add-form-name').css('border', '1px solid #ccc');
        //     }, 3000);
        } else if (!platformUid) {
            $errorElem.append('請選擇目標客戶');

            $formUname.css('border', '1px solid red');
            window.setTimeout(function() {
                $errorElem.empty();
                $formUname.css('border', '1px solid #ccc');
            }, 3000);
        } else if (!assignedId) {
            $errorElem.append('請選擇指派人');

            $formUname.css('border', '1px solid red');
            window.setTimeout(function() {
                $errorElem.empty();
                $formUname.css('border', '1px solid #ccc');
            }, 3000);
        } else if (!description) {
            $errorElem.append('請輸入說明內容');

            $formDescription.css('border', '1px solid red');
            window.setTimeout(function() {
                $errorElem.empty();
                $formDescription.css('border', '1px solid #ccc');
            }, 3000);
        } else {
            var status = parseInt($('#add-form-status option:selected').val());
            var priority = parseInt($('#add-form-priority option:selected').val());

            var newTicket = {
                description: description || '',
                dueTime: Date.now() + (86400000 * 3), // 過期時間預設為3天後
                priority: priority,
                platformUid: platformUid,
                status: status,
                assigned_id: assignedId
            };

            $submitBtn.attr('disabled', true);
            return api.appsTickets.insert(appId, userId, newTicket).then(function() {
                $submitBtn.removeAttr('disabled');
                window.location.href = '/ticket'; // 返回 ticket 清單頁
            });
        }
    }
})();
