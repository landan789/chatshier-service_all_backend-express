/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var apps = {};
    var appsAgents = {};
    var appsConsumers = {};
    var appsChatroomsMessagers = {};
    var appsTickets = {};
    var consumers = {};
    var groups = {};
    var users = {};

    var CHATSHIER = 'CHATSHIER';
    var api = window.restfulAPI;
    var selectedTicket = null;

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    var $jqDoc = $(document);
    var $ticketBody = $('.ticket-body');
    var $ticketEditModal = $('#ticketEditModal');
    var $ticketAddModal = $('#ticketAddModal');

    $jqDoc.on('click', '#ticketAdd', addTicket);
    $ticketBody.on('click', '.ticket-row', showTicketDetail);
    $ticketEditModal.on('click', '#ticket_info_modify', updateTicket);
    $ticketAddModal.on('show.bs.modal', showAddTicketModal);
    $ticketAddModal.on('click', '#addTicketBtn', addTicket);

    $('#ticket_info_delete').click(function() {
        var alertWarning = $('#alert-warning');

        alertWarning.find('p').html('是否要刪除表單?');
        alertWarning.show();
        alertWarning.find('#yes').off('click').on('click', function() {
            alertWarning.hide();

            return api.appsTickets.remove(selectedTicket.appId, selectedTicket.ticketId, userId).then(function() {
                var alertDanger = $('#alert-danger');
                alertDanger.children('span').text('表單已刪除');
                window.setTimeout(function() {
                    alertDanger.show();
                    window.setTimeout(function() { alertDanger.hide(); }, 3000);
                }, 1000);
                return loadTable();
            });
        });

        alertWarning.find('#no').off('click').on('click', function() {
            alertWarning.hide();
        });
    });

    // ===========
    // 搜尋過濾功能
    $('#ticket_search_bar').keyup(function() {
        var $content = $('.ticket-body tr');
        var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
        $content.show().filter(function() {
            var text1 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text1.indexOf(val);
        }).hide();
    });
    // ===========

    // ===========
    // 點擊表單名稱進行排序功能
    var $ticketTableHeaders = $('.main .ticket thead tr th');
    $ticketTableHeaders.on('click', function(ev) {
        sortCloseTable(ev.target.cellIndex);
    });
    // ===========

    Promise.all([
        api.apps.findAll(userId),
        api.appsChatroomsMessagers.findAll(userId),
        api.consumers.findAll(userId),
        api.users.find(userId),
        api.groups.findAll(userId)
    ]).then(function(respJsons) {
        apps = respJsons.shift().data;
        appsChatroomsMessagers = respJsons.shift().data;
        consumers = respJsons.shift().data;
        users = respJsons.shift().data;
        groups = respJsons.shift().data;

        for (var appId in apps) {
            var app = apps[appId];
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

            if (CHATSHIER === app.type || !appsChatroomsMessagers[appId]) {
                continue;
            }

            // 利用各個 chatroom 裡的 messager 將 consumer 與 app 建立關聯
            var chatrooms = appsChatroomsMessagers[appId].chatrooms;
            appsConsumers[appId] = { consumers: {} };
            for (var chatroomId in chatrooms) {
                var messagers = chatrooms[chatroomId].messagers;
                for (var messagerId in messagers) {
                    var messager = messagers[messagerId];
                    if (CHATSHIER === messager.type) {
                        continue;
                    }
                    var consumer = Object.assign({}, consumers[messager.platformUid]);
                    consumer.phone = messager.phone;
                    consumer.email = messager.email;
                    appsConsumers[appId].consumers[messager.platformUid] = consumer;
                }
            }
        }
    }).then(function() {
        return loadTable();
    });

    function loadTable() {
        $ticketBody.empty();

        // 取得所有的 appId tickets
        return api.appsTickets.findAll('', userId).then(function(resJson) {
            appsTickets = resJson.data;

            for (var appId in appsTickets) {
                var tickets = appsTickets[appId].tickets;

                // 批次處理每個 tickets 的 app 資料
                for (var ticketId in tickets) {
                    var ticket = tickets[ticketId];
                    var consumer = consumers[ticket.platformUid] || {};
                    var agent = appsAgents[appId].agents[ticket.assigned_id];

                    // 將每筆 ticket 資料反映於 html DOM 上
                    $ticketBody.append(
                        '<tr app-id=' + appId + ' ticket-id="' + ticketId + '" class="ticket-row" data-toggle="modal" data-target="#ticketEditModal">' +
                            '<td style="border-left: 5px solid ' + priorityColor(ticket.priority) + '">' + (consumer.name || '') + '</td>' +
                            '<td id="description">' + ticket.description + '</td>' +
                            '<td id="status" class="status">' + statusNumberToText(ticket.status) + '</td>' +
                            '<td id="priority" class="priority">' + priorityNumberToText(ticket.priority) + '</td>' +
                            '<td id="time">' + toLocalTimeString(ticket.dueTime) + '</td>' +
                            '<td id="assigened">' + (agent ? agent.name : '無') + '</td>' +
                            '<td>' + dueDate(ticket.dueTime) + '</td>' +
                        '</tr>');
                }
            }
        });
    }

    function showSelect(prop, n, val) {
        var i = 0;
        var html = "<select class='selected form-control'>";
        if ('priority' === prop) {
            html += '<option value=' + n + '>' + priorityNumberToText(n) + '</option>';
            for (i = 1; i < 5; i++) {
                if (i === n) continue;
                html += '<option value=' + i + '>' + priorityNumberToText(i) + '</option>';
            }
        } else if ('status' === prop) {
            html += '<option value=' + n + '>' + statusNumberToText(n) + '</option>';
            for (i = 2; i < 6; i++) {
                if (i === n) continue;
                html += '<option value=' + i + '>' + statusNumberToText(i) + '</option>';
            }
        } else if ('assigned' === prop) {
            if (0 === Object.keys(n).length) {
                html += '<option value="">無資料</option>';
            } else {
                for (var agentUserId in n) {
                    var agent = n[agentUserId];
                    html += '<option value="' + agentUserId + '"' + (agentUserId === val ? ' selected="true"' : '') + '>' + agent.name + '</option>';
                }
            }
        }
        html += '</select>';
        return html;
    }

    /**
     * 顯示 ticket 更多資訊
     */
    function showTicketDetail() {
        var appId = $(this).attr('app-id');
        var ticketId = $(this).attr('ticket-id');
        var ticket = appsTickets[appId].tickets[ticketId];
        var consumer = consumers[ticket.platformUid];
        selectedTicket = Object.assign({}, ticket);
        selectedTicket.appId = appId;
        selectedTicket.ticketId = ticketId;

        var infoInputTable = $('.info-input-table').empty();
        var $ticketEditModal = $('#ticketEditModal');
        $ticketEditModal.find('.id-number').css('background-color', priorityColor(ticket.priority));
        $ticketEditModal.find('.modal-header').css('border-bottom', '3px solid ' + priorityColor(ticket.priority));

        var moreInfoHtml =
            '<tr>' +
                '<th>客戶姓名</th>' +
                '<td>' + (consumer.name || '') + '</td>' +
            '</tr>' +
            '<tr>' +
                '<th class="priority">優先</th>' +
                '<td class="form-group">' + showSelect('priority', ticket.priority) + '</td>' +
            '</tr>' +
            '<tr>' +
                '<th class="status">狀態</th>' +
                '<td class="form-group">' + showSelect('status', ticket.status) + '</td>' +
            '</tr>' +
            '<tr>' +
                '<th class="description">描述</th>' +
                '<td class="form-group">' +
                    '<textarea class="form-control">' + ticket.description + '</textarea>' +
                '</td>' +
            '</tr>' +
            '<tr class="assigned">' +
                '<th>指派人</th>' +
                '<td class="form-group">' + showSelect('assigned', appsAgents[appId].agents, ticket.assigned_id) + '</td>' +
            '</tr>' +
            '<tr>' +
                '<th class="time-edit">到期時間' + dueDate(ticket.dueTime) + '</th>' +
                '<td class="form-group">' +
                    '<input class="display-date-input form-control" type="datetime-local" value="' + displayDateInput(ticket.dueTime) + '">' +
                '</td>' +
            '</tr>' +
            '<tr>' +
                '<th>建立日期</th>' +
                '<td>' + displayDate(ticket.createdTime) + '</td>' +
            '</tr>' +
            '<tr>' +
                '<th>最後更新</th>' +
                '<td>' + displayDate(ticket.updatedTime) + '</td>' +
            '</tr>';
        infoInputTable.append(moreInfoHtml);
    }

    function showAddTicketModal() {
        var $descriptionElem = $ticketAddModal.find('textarea#add_form_description');
        $descriptionElem.val('');
        reloadAddTicketApps();
    }

    function reloadAddTicketApps() {
        var $appSelectElem = $ticketAddModal.find('select#add-form-app');
        $appSelectElem.empty().off('change');

        for (var appId in apps) {
            var _app = apps[appId];
            if (CHATSHIER === _app.type) {
                continue;
            }
            $appSelectElem.append('<option value=' + appId + '>' + _app.name + '</option>');
        }

        if (0 === Object.keys(apps).length) {
            $appSelectElem.append('<option value="">無資料</option>');
            return;
        }

        var selectedAppId = $appSelectElem.find('option:selected').val();
        reloadAddTicketConsumers(selectedAppId);

        $appSelectElem.on('change', function(ev) {
            var appId = ev.target.value;
            reloadAddTicketConsumers(appId);
        });
    }

    function reloadAddTicketConsumers(appId) {
        var $assignedSelectElem = $ticketAddModal.find('select#assigned-name');
        var $consumerSelectElem = $ticketAddModal.find('select#add-form-name');
        var $platformUidElem = $ticketAddModal.find('input#add-form-uid');
        var $messagerEmailElem = $ticketAddModal.find('input#add-form-email');
        var $messagerPhoneElem = $ticketAddModal.find('input#add-form-phone');

        $assignedSelectElem.empty();
        $consumerSelectElem.empty().off('change');
        $platformUidElem.val('');
        $messagerEmailElem.val('');
        $messagerPhoneElem.val('');

        if (!appId) {
            $assignedSelectElem.append('<option value="">無資料</option>');
            $consumerSelectElem.append('<option value="">無資料</option>');
            return;
        }

        var app = apps[appId];
        if (appsConsumers[appId] && Object.keys(appsConsumers[appId].consumers).length > 0) {
            var consumers = appsConsumers[appId].consumers;
            for (var _platformUid in consumers) {
                var _consumer = consumers[_platformUid];
                if (_consumer.type !== app.type) {
                    continue;
                }
                $consumerSelectElem.append('<option value=' + _consumer.platformUid + '>' + _consumer.name + '</option>');
            }
        } else {
            $consumerSelectElem.append('<option value="">無資料</option>');
        }

        if (appsAgents[appId] && Object.keys(appsAgents[appId].agents).length > 0) {
            var agents = appsAgents[appId].agents;
            for (var agentId in agents) {
                var agent = agents[agentId];
                $assignedSelectElem.append('<option value=' + agentId + '>' + agent.name + '</option>');
            }
        } else {
            $assignedSelectElem.append('<option value="">無資料</option>');
        }

        var refreshConsumer = function(platformUid) {
            if (platformUid && appsConsumers[appId] && appsConsumers[appId].consumers[platformUid]) {
                var consumer = appsConsumers[appId].consumers[platformUid];
                $platformUidElem.val(platformUid);
                $messagerEmailElem.val(consumer.email);
                $messagerPhoneElem.val(consumer.phone);
            }
        };

        refreshConsumer($consumerSelectElem.find('option:selected').val());
        $consumerSelectElem.on('change', function(ev) {
            var platformUid = ev.target.value;
            refreshConsumer(platformUid);
        });
    }

    function displayDate(date) {
        var origin = new Date(date);
        origin = origin.getTime();
        var gmt8 = new Date(origin);
        var yy = gmt8.getFullYear();
        var MM = (gmt8.getMonth() + 1) < 10 ? '0' + (gmt8.getMonth() + 1) : (gmt8.getMonth() + 1);
        var dd = gmt8.getDate();
        var hh = gmt8.getHours() < 10 ? '0' + gmt8.getHours() : gmt8.getHours();
        var mm = gmt8.getMinutes() < 10 ? '0' + gmt8.getMinutes() : gmt8.getMinutes();
        var ss = gmt8.getSeconds() < 10 ? '0' + gmt8.getSeconds() : gmt8.getSeconds();
        return yy + '/' + MM + '/' + dd + ' ' + hh + ':' + mm + ':' + ss;
    }

    function dueDate(day) {
        var html = '';
        var nowTime = Date.now();
        var dueday = Date.parse(displayDate(day));
        var hr = dueday - nowTime;
        hr /= 1000 * 60 * 60;
        // hr = Math.round(hr) ;
        // return hr ;
        if (hr < 0) {
            html = '<span class="overdue">過期</span>';
        } else {
            html = '<span class="non overdue">即期</span>';
        }
        return html;
    } // end of dueDate

    function displayDateInput(d) {
        d = new Date(d);

        function pad(n) { return n < 10 ? '0' + n : n; }
        return d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate()) + 'T' +
            pad(d.getHours()) + ':' +
            pad(d.getMinutes());
    } // end of displayDate

    function toLocalTimeString(millisecond) {
        var date = new Date(millisecond);
        var localDate = date.toLocaleDateString();
        var localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var localTimeString = localDate + localTime;
        return localTimeString;
    }

    function addTicket(ev) {
        var $appSelectElem = $ticketAddModal.find('select#add-form-app');
        var $assignedSelectElem = $ticketAddModal.find('select#assigned-name');
        var $platformUidElem = $ticketAddModal.find('input#add-form-uid');
        var $descriptionElem = $ticketAddModal.find('textarea#add_form_description');

        var platformUid = $platformUidElem.val();
        var appId = $appSelectElem.find('option:selected').val();
        var description = $descriptionElem.val();
        var assignedId = $assignedSelectElem.find('option:selected').val();
        var assignedName = $assignedSelectElem.find('option:selected').text();

        if (!appId) {
            $.notify('請選擇 APP', { type: 'warning' });
        } else if (!platformUid) {
            $.notify('請選擇目標客戶', { type: 'warning' });
        } else if (!assignedId) {
            $.notify('請選擇指派人', { type: 'warning' });
        } else if (!description) {
            $.notify('請輸入描述內容', { type: 'warning' });
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

            var $submitBtn = $(ev.target);
            $submitBtn.attr('disabled', true);
            return api.appsTickets.insert(appId, userId, newTicket).then(function() {
                $submitBtn.removeAttr('disabled');
                $.notify('待辦事項已新增，指派人: ' + assignedName, { type: 'success' });
                return loadTable();
            }).catch(function() {
                $.notify('待辦事項新增失敗，請重試', { type: 'danger' });
            }).then(function() {
                $ticketAddModal.modal('hide');
            });
        }
    }

    /**
     * 在 ticket 更多訊息中，進行修改 ticket 動作
     */
    function updateTicket() {
        var $modifyTable = $ticketEditModal.find('.info-input-table');
        $modifyTable.find('input').blur();

        var ticketPriority = parseInt($modifyTable.find('th.priority').parent().find('td select').val());
        var ticketStatus = parseInt($modifyTable.find('th.status').parent().find('td select').val());
        var ticketDescription = $modifyTable.find('th.description').parent().find('td textarea').val();
        var ticketDueTime = $modifyTable.find('th.time-edit').parent().find('td input').val();

        var $assignedElem = $modifyTable.find('tr.assigned select option:selected');
        var assignedId = $assignedElem.val();
        var assignedName = $assignedElem.text();

        // 準備要修改的 ticket json 資料
        var modifiedTicket = {
            description: ticketDescription,
            dueTime: new Date(ticketDueTime).getTime(),
            priority: ticketPriority,
            status: ticketStatus,
            assigned_id: assignedId
        };

        // 發送修改請求 api 至後端進行 ticket 修改
        return api.appsTickets.update(selectedTicket.appId, selectedTicket.ticketId, userId, modifiedTicket).then(function() {
            var alertSuccess = $('#alert-success');
            alertSuccess.children('span').text('表單已更新，指派人: ' + assignedName);
            window.setTimeout(function() {
                alertSuccess.show();
                window.setTimeout(function() { alertSuccess.hide(); }, 3000);
            }, 1000);
            return loadTable();
        }).catch(function() {
            var alertDanger = $('#alert-danger');
            alertDanger.children('span').text('表單更新失敗，請重試').show();
            window.setTimeout(function() { alertDanger.hide(); }, 4000);
        });
    }

    function priorityColor(priority) {
        var colors = {
            1: '#33ccff',
            2: 'rgb(113, 180, 209)',
            3: 'rgb(233, 198, 13)',
            4: 'rgb(230, 100, 100)'
        };
        return colors[priority] ? colors[priority] : '';
    }

    function statusNumberToText(status) {
        var statusText = {
            2: '未處理',
            3: '處理中',
            4: '已解決',
            5: '已關閉'
        };
        return statusText[status] ? statusText[status] : '未知';
    }

    function priorityNumberToText(priority) {
        var priorityText = {
            1: '低',
            2: '中',
            3: '高',
            4: '急'
        };
        return priorityText[priority] ? priorityText[priority] : '低';
    }

    // =========[SORT CLOSE]=========
    function sortCloseTable(n) {
        var table = $ticketBody;
        var rows;
        var switching = true;
        var i;
        var x;
        var y;
        var shouldSwitch;
        var dir = 'asc'; // Set the sorting direction to ascending:
        var switchcount = 0;

        // Make a loop that will continue until
        // no switching has been done:
        while (switching) {
            // start by saying: no switching is done:
            switching = false;
            rows = table.find('tr');
            // Loop through all table rows (except the
            // first, which contains table headers):
            for (i = 0; i < (rows.length - 1); i++) {
                // start by saying there should be no switching:
                shouldSwitch = false;
                // Get the two elements you want to compare,
                // one from current row and one from the next:
                x = rows[i].childNodes[n];
                y = rows[i + 1].childNodes[n];
                // check if the two rows should switch place,
                // based on the direction, asc or desc:
                if ('asc' === dir) {
                    if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        // if so, mark as a switch and break the loop:
                        shouldSwitch = true;
                        break;
                    }
                } else if ('desc' === dir) {
                    if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                        // if so, mark as a switch and break the loop:
                        shouldSwitch = true;
                        break;
                    }
                }
            }
            if (shouldSwitch) {
                // If a switch has been marked, make the switch
                // and mark that a switch has been done:
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
                // Each time a switch is done, increase this count by 1:
                switchcount++;
            } else {
                // If no switching has been done AND the direction is "asc",
                // set the direction to "desc" and run the while loop again.
                if (0 === switchcount && 'asc' === dir) {
                    dir = 'desc';
                    switching = true;
                }
            }
        }
    };
})();
