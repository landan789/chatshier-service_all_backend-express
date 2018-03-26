/// <reference path='../../typings/client/index.d.ts' />

(function() {
    $('#loading').fadeOut();

    var ticketInfo = {};
    var messagersData = {};
    var appsAgents = {};

    var api = window.restfulAPI;
    var lastSelectedTicket = null;

    var $jqDoc = $(document);
    var $ticketBody = null;

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $ticketBody = $('.ticket-body');

    // 等待 firebase 登入完成後，再進行 ticket 資料渲染處理
    $jqDoc.on('click', '.ticket-body .ticket-row', showTicketDetail); // 查看待辦事項細節
    $jqDoc.on('click', '#ticket_info_modify', modifyTicket); // 修改待辦事項
    // $jqDoc.on('click', '.edit', showInput);
    // $jqDoc.on('click', '.inner-text', function(event) {
    //     event.stopPropagation();
    // });
    $jqDoc.on('focusout', '.inner-text', hideInput);
    $jqDoc.on('keypress', '.inner-text', function(e) {
        if (13 === e.which) $(this).blur();
    });

    $('#ticket_info_delete').click(function() {
        var alertWarning = $('#alert-warning');

        alertWarning.find('p').html('是否要刪除表單?');
        alertWarning.show();
        alertWarning.find('#yes').off('click').on('click', function() {
            alertWarning.hide();

            return api.appsTickets.remove(lastSelectedTicket.ticketAppId, lastSelectedTicket.ticketId, userId).then(function() {
                loadTable();

                var alertDanger = $('#alert-danger');
                alertDanger.children('span').text('表單已刪除');
                window.setTimeout(function() {
                    alertDanger.show();
                    window.setTimeout(function() { alertDanger.hide(); }, 3000);
                }, 1000);
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

    loadTable();

    function loadTable() {
        $ticketBody.empty();

        var asyncLoadTasks = [
            api.appsTickets.findAll('', userId)
        ];

        // 如果沒有載入過 Messagers 才進行載入動作
        if (0 === Object.keys(messagersData).length) {
            asyncLoadTasks.push(api.appsMessagers.findAll(userId));
        }

        // 取得所有的 appId tickets
        return Promise.all(asyncLoadTasks).then(function(respJsons) {
            if (!respJsons) {
                return;
            }

            if (respJsons[1] && 0 === Object.keys(messagersData).length) {
                // 把此用戶的所有 App 裡的所有 Messagers 製成一份 ID 對應的清單
                var appsMessagersData = respJsons[1].data;
                for (var appId in appsMessagersData) {
                    var messagers = appsMessagersData[appId].messagers;
                    for (var messagerId in messagers) {
                        messagersData[messagerId] = messagers[messagerId];
                    }
                }
            }

            var appsTicketsData = respJsons[0].data || {};
            return Promise.resolve().then(function() {
                if (0 === Object.keys(appsAgents).length) {
                    let appIds = Object.keys(appsTicketsData);
                    return getAppsAgents(appIds);
                }
                return appsAgents;
            }).then(function(appsAgents) {
                for (var ticketAppId in appsTicketsData) {
                    var tickets = appsTicketsData[ticketAppId].tickets;

                    // 批此處理每個 tickets 的 app 資料
                    for (var ticketId in tickets) {
                        var ticketData = tickets[ticketId];
                        if (ticketData.isDeleted) {
                            // 如果此 ticket 已被標注刪除，則忽略不顯示
                            continue;
                        }
                        ticketData.ticketId = ticketId;
                        ticketData.ticketAppId = ticketAppId;
                        ticketInfo[ticketId] = ticketData;
                        var messagerInfo = messagersData[ticketData.messager_id] || {};
                        var agent = appsAgents[ticketAppId][ticketData.assigned_id];

                        // 將每筆 ticket 資料反映於 html DOM 上
                        $ticketBody.append(
                            '<tr app-id=' + ticketAppId + ' id="' + ticketId + '" class="ticket-row" data-toggle="modal" data-target="#ticket_info_modal">' +
                            '<td style="border-left: 5px solid ' + priorityColor(ticketData.priority) + '">' + (messagerInfo.name || '') + '</td>' +
                            '<td id="description">' + ticketData.description + '</td>' +
                            '<td id="status" class="status">' + statusNumberToText(ticketData.status) + '</td>' +
                            '<td id="priority" class="priority">' + priorityNumberToText(ticketData.priority) + '</td>' +
                            '<td id="time">' + ToLocalTimeString(ticketData.dueTime) + '</td>' +
                            '<td id="assigened">' + (agent ? agent.name : '無') + '</td>' +
                            '<td>' + dueDate(ticketData.dueTime) + '</td>' +
                            '</tr>');
                    }
                }
            });
        }).catch(function(error) {
            if ('401 Unauthorized' === error.message) {
                // 只有在 promise reject 會收到 401，代表 firebase 登入失敗，等待 100ms 後重新執行
                window.setTimeout(function() { loadTable(); }, 100);
            }
        });
    }

    // function showInput() {
    //     var prop = $(this).parent().children("th").attr("class");
    //     var original = $(this).text();
    //     if (prop.indexOf('due date') != -1) {
    //         var day = new Date(original);
    //         day = Date.parse(day) + 8 * 60 * 60 * 1000;
    //         day = new Date(day);
    //         // console.log(day);
    //         $(this).html("<input type='datetime-local' class='inner-text' value='" + day.toJSON().substring(0, 23) + "'></input>");
    //     } else if (prop == 'description') {
    //         $(this).html("<textarea  class='inner-text form-control'>" + original + "</textarea>");
    //     } else {
    //         $(this).html("<input type='text' class='inner-text' value='" + original + "' autofocus>");
    //     }
    // }

    function hideInput() {
        var change = $(this).val();
        if ('datetime-local' === $(this).attr('type')) {
            $(this).parent().html(displayDate(change));
        }
        $(this).parent().html("<textarea class='inner-text form-control'>" + change + '</textarea>');
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
                for (var agentId in n) {
                    html += '<option value="' + agentId + '"' + (agentId === val ? ' selected="true"' : '') + '>' + n[agentId].name + '</option>';
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
        var ticketId = $(this).attr('id');
        var ticketData = ticketInfo[ticketId];
        lastSelectedTicket = ticketData;

        var infoInputTable = $('.info-input-table').empty();
        var messagerInfo = messagersData[ticketData.messager_id] || {};
        $('#ID-num').css('background-color', priorityColor(ticketData.priority));
        $('.modal-header').css('border-bottom', '3px solid ' + priorityColor(ticketData.priority));

        var moreInfoHtml =
            '<tr>' +
            '<th>客戶姓名</th>' +
            '<td class="edit">' + (messagerInfo.name || '') + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th class="priority">優先</th>' +
            '<td class="form-group">' + showSelect('priority', ticketData.priority) + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th class="status">狀態</th>' +
            '<td class="form-group">' + showSelect('status', ticketData.status) + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th class="description">描述</th>' +
            '<td class="edit form-group">' +
            '<textarea class="inner-text form-control">' + ticketData.description + '</textarea>' +
            '</td>' +
            '</tr>' +
            '<tr class="assigned">' +
            '<th>指派人</th>' +
            '<td class="form-group">' + showSelect('assigned', appsAgents[appId], ticketData.assigned_id) + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th class="time-edit">到期時間' + dueDate(ticketData.dueTime) + '</th>' +
            '<td class="form-group">' +
            '<input class="display-date-input form-control" type="datetime-local" value="' + displayDateInput(ticketData.dueTime) + '">' +
            '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>建立日期</th>' +
            '<td>' + displayDate(ticketData.createdTime) + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>最後更新</th>' +
            '<td>' + displayDate(ticketData.updatedTime) + '</td>' +
            '</tr>';
        infoInputTable.append(moreInfoHtml);
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

    function ToLocalTimeString(millisecond) {
        var date = new Date(millisecond);
        var localDate = date.toLocaleDateString();
        var localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var localTimeString = localDate + localTime;
        return localTimeString;
    }

    /**
     * 在 ticket 更多訊息中，進行修改 ticket 動作
     */
    function modifyTicket() {
        var $modifyTable = $('#ticket_info_modal .info-input-table');
        $modifyTable.find('input').blur();

        var ticketPriority = parseInt($modifyTable.find('th.priority').parent().find('td select').val());
        var ticketStatus = parseInt($modifyTable.find('th.status').parent().find('td select').val());
        var ticketDescription = $modifyTable.find('th.description').parent().find('td.edit textarea').val();
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
        return api.appsTickets.update(lastSelectedTicket.ticketAppId, lastSelectedTicket.ticketId, userId, modifiedTicket).then(function() {
            loadTable();

            var alertSuccess = $('#alert-success');
            alertSuccess.children('span').text('表單已更新，指派人: ' + assignedName);
            window.setTimeout(function() {
                alertSuccess.show();
                window.setTimeout(function() { alertSuccess.hide(); }, 3000);
            }, 1000);
        }).catch(function() {
            var alertDanger = $('#alert-danger');
            alertDanger.children('span').text('表單更新失敗，請重試').show();
            window.setTimeout(function() { alertDanger.hide(); }, 4000);
        });
    }

    function priorityColor(priority) {
        var colors = {
            1: '#33CCFF',
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

    function getAppsAgents(appIds) {
        if ('string' === typeof appIds && appsAgents[appIds]) {
            return Promise.resolve(appsAgents[appIds]);
        }

        if (!(appIds instanceof Array)) {
            appIds = [appIds];
        }

        return Promise.all([
            api.groups.findAll(userId),
            api.users.find(userId)
        ]).then(function(resJsons) {
            var groups = resJsons.shift().data;
            var groupUsers = resJsons.shift().data;
            var agents = {};

            for (var i in appIds) {
                var appId = appIds[i];
                for (var groupId in groups) {
                    var group = groups[groupId];

                    if (group.app_ids.indexOf(appId)) {
                        for (var memberId in group.members) {
                            var memberUserId = group.members[memberId].user_id;
                            if (!agents[memberUserId]) {
                                agents[memberUserId] = {
                                    name: groupUsers[memberUserId].name,
                                    email: groupUsers[memberUserId].email
                                };
                            }
                        }
                    }
                }

                appsAgents[appId] = agents;
            }
            return appsAgents;
        });
    }
})();
