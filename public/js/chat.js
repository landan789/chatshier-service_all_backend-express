/// <reference path='../../typings/client/index.d.ts' />

const socket = io.connect(); // Socket
const LOADING_MSG_AND_ICON = "<p class='message-day'><strong><i>" + 'Loading History Messages...' + "</i></strong><span class='loadingIcon'></span></p>";
const NO_HISTORY_MSG = "<p class='message-day'><strong><i>" + '-沒有更舊的歷史訊息-' + '</i></strong></p>';
const COLOR = {
    FIND: '#ff0000',
    CLICKED: '#ccc',
    FINDBACK: '#ffff00'
};
const SCROLL = {
    HEIGHT: 90
};
const CHATSHIER = 'CHATSHIER';
const SYSTEM = 'SYSTEM';
const LINE = 'LINE';
const FACEBOOK = 'FACEBOOK';

var agentId = ''; // agent的ID
var nameList = []; // list of all users
var userProfiles = []; // array which store all user's profile
var appsData = {}; // 此變數用來裝所有的 app 資料
var tagsData = {};
var internalTagsData;
var agentIdToName;
// selectors
var $infoPanel = $('#infoPanel');
var messageInput = $('#message'); // 訊息欄
var canvas = $('#canvas'); // 聊天室空間
var infoCanvas = $('#infoCanvas'); // 個人資料空間
var ocClickShow = $('.on-click-show');
var searchBox = $('#searchBox');

var transJson = {};
window.translate.ready.then(function(json) {
    transJson = json;
});

/**
 * 處理聊天室中視窗右側待辦事項資料的控制集合，
 * 所有有關待辦事項的處理皆寫於此閉包內。
 */
var ticketTableCtrl = (function() {
    var api = window.restfulAPI;
    var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;
    var instance = new TicketTableCtrl();
    var ticketsData = null;

    var $addTicketModal = $('#add-ticket-modal');
    var $ticketInfoModal = $('#ticket_info_modal');

    // ==========
    // #region 通用函式宣告

    var priorityColor = function(priority) {
        var colors = {
            1: '#33CCFF',
            2: 'rgb(113, 180, 209)',
            3: 'rgb(233, 198, 13)',
            4: 'rgb(230, 100, 100)'
        };
        return colors[priority] ? colors[priority] : '';
    };

    var priorityNumberToText = function(priority) {
        var priorityText = {
            1: '低',
            2: '中',
            3: '高',
            4: '急'
        };
        return priorityText[priority] ? priorityText[priority] : '低';
    };

    var statusNumberToText = function(status) {
        var statusText = {
            2: '未處理',
            3: '處理中',
            4: '已解決',
            5: '已關閉'
        };
        return statusText[status] ? statusText[status] : '未知';
    };

    var showSelect = function(prop, n) {
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
        } else if ('responder' === prop) {
            html += "<option value='未指派'>請選擇</option>";
            n.map(function(agent) {
                html += '<option value=' + agent.id + '>' + agent.name + '</option>';
            });
        }
        html += '</select>';
        return html;
    };

    var displayDate = function(date) {
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
    };

    var displayDateInput = function(d) {
        d = new Date(d);
        var pad = function(n) {
            return n < 10 ? '0' + n : n;
        };
        return d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate()) + 'T' +
            pad(d.getHours()) + ':' +
            pad(d.getMinutes());
    };

    var dueDate = function(day) {
        var nowTime = Date.now();
        var dueday = Date.parse(displayDate(day));
        var hr = dueday - nowTime;
        hr /= 1000 * 60 * 60;
        return hr < 0 ? '<span class="overdue">過期</span>' : '<span class="non overdue">即期</span>';
    };

    // #endregion
    // ==========

    function TicketTableCtrl() {}

    TicketTableCtrl.prototype.show = function() {
        $('.nav li.active').removeClass('active');
        $(this).parent().addClass('active');
        $('#infoCanvas #profile').hide();
        $('#infoCanvas #todo').show();
    };

    TicketTableCtrl.prototype.ticketSearch = function() {
        var $ticketTable = $(this).parentsUntil('.ticket').last();
        var $tableRows = $ticketTable.find('.ticket-body tr');
        var searchStr = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
        $tableRows.show().filter(function() {
            var text1 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text1.indexOf(searchStr);
        }).hide();
    };

    TicketTableCtrl.prototype.loadTickets = function(appId, userId) {
        var $cardGroup = $('.card-group#' + appId);
        var $ticketTable = $cardGroup.find('.ticket-table');
        var $ticketBody = $ticketTable.find('.ticket-body');
        $ticketBody.empty();

        return api.ticket.getOne(appId, userId).then(function(resJson) {
            var appData = resJson.data;

            if (appData && appData[appId] && appData[appId].tickets) {
                ticketsData = appData[appId].tickets;

                for (var ticketId in ticketsData) {
                    var ticketData = ticketsData[ticketId];
                    if (ticketData.isDeleted) {
                        continue;
                    }

                    var dueTimeDateStr = new Date(ticketData.dueTime - timezoneGap).toISOString().split('T').shift();
                    $ticketBody.prepend(
                        '<tr id="' + ticketId + '" class="ticket-row" data-toggle="modal" data-target="#ticket_info_modal">' +
                            '<td class="status" style="border-left: 5px solid ' + priorityColor(ticketData.priority) + '">' + statusNumberToText(ticketData.status) + '</td>' +
                            '<td>' + dueTimeDateStr + '</td>' +
                            '<td>' + ((ticketData.description.length <= 10) ? ticketData.description : (ticketData.description.substring(0, 10) + '...')) + '</td>' +
                            '<td></td>' +
                        '</tr>'
                    );
                }
            }

            // 待辦事項載入完成後，由於相依的 appId 可能變更，因此將以下的事件重新綁定
            $addTicketModal.find('#form-submit').off('click').on('click', function() {
                instance.addTicket(appId);
            });

            $addTicketModal.off('show.bs.modal').on('show.bs.modal', function() {
                var messagersData = appsData[appId].messagers;
                var $messagerNameSelect = $addTicketModal.find('select#add-form-name');
                var $messagerIdElem = $addTicketModal.find('input#add-form-uid');
                var $messagerEmailElem = $addTicketModal.find('input#add-form-email');
                var $messagerPhoneElem = $addTicketModal.find('input#add-form-phone');
                var selectedId = '';

                $messagerNameSelect.empty();
                if (messagersData && Object.keys(messagersData).length > 0) {
                    for (var msgerId in messagersData) {
                        selectedId = selectedId || msgerId;
                        $messagerNameSelect.append('<option value=' + msgerId + '>' + messagersData[msgerId].name + '</option>');
                    }
                } else {
                    $messagerNameSelect.append('<option value="null">無資料</option>');
                }

                var updateInfo = function(selectedId) {
                    if (!selectedId) {
                        $messagerIdElem.prop('value', '');
                        $messagerEmailElem.prop('value', '');
                        $messagerPhoneElem.prop('value', '');
                        return;
                    }

                    var messager = messagersData[selectedId];
                    $messagerIdElem.prop('value', selectedId);
                    $messagerEmailElem.prop('value', messager.email);
                    $messagerPhoneElem.prop('value', messager.phone);
                };
                updateInfo($messagerNameSelect.val());

                $messagerNameSelect.off('change').on('change', function(ev) {
                    var messagerId = ev.target.value;
                    updateInfo(messagerId);
                });
            });

            $ticketTable.off('keyup').on('keyup', '.ticket-search-bar', instance.ticketSearch);
            $ticketBody.off('click').on('click', '.ticket-row', instance.showTicketDetail);
        });
    };

    TicketTableCtrl.prototype.showTicketDetail = function() {
        // 從觸發的元件的位置往上找到對應的表格元素
        // 由於 appId 與 messagerId 有用來設置表格屬性
        // 因此從 DOM 元素中取得待辦事項的相關數據
        var $ticketBody = $(this).parentsUntil('table').last();
        var msgerId = $ticketBody.attr('rel');

        var $cardGroup = $ticketBody.parentsUntil('#infoCanvas').last();
        var appId = $cardGroup.attr('id');

        var ticketId = $(this).attr('id');
        var ticketData = ticketsData[ticketId];

        var infoInputTable = $('.info-input-table').empty();
        var messagerData = appsData[appId].messagers[msgerId];

        $ticketInfoModal.find('#ID-num').text(ticketData.id).css('background-color', priorityColor(ticketData.priority));
        $ticketInfoModal.find('.modal-header').css('border-bottom', '3px solid ' + priorityColor(ticketData.priority));
        $ticketInfoModal.find('.modal-title').text(messagerData.name || '');

        var moreInfoHtml =
            '<tr>' +
                '<th>客戶ID</th>' +
                '<td class="edit">' + ticketData.messagerId + '</td>' +
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

        $ticketInfoModal.find('#ticket_info_modify').off('click').on('click', function() {
            instance.updateTicket(appId, ticketId);
        });

        $ticketInfoModal.find('#ticket_info_delete').off('click').on('click', function() {
            instance.deleteTicket(appId, ticketId);
        });
    };

    TicketTableCtrl.prototype.addTicket = function(appId) {
        var msgerId = $addTicketModal.find('select#add-form-name option:selected').val();
        var description = $addTicketModal.find('textarea#add_form_description').val();
        var $errorElem = $addTicketModal.find('#error');

        $errorElem.empty();
        if (!description) {
            $.notify('請輸入說明內容', { type: 'danger' });
        } else {
            var status = parseInt($addTicketModal.find('#add-form-status option:selected').val());
            var priority = parseInt($addTicketModal.find('#add-form-priority option:selected').val());

            var newTicket = {
                createdTime: Date.now(),
                description: description || '',
                dueTime: Date.now() + (86400000 * 3), // 過期時間預設為3天後
                priority: priority,
                messagerId: msgerId,
                status: status,
                updatedTime: Date.now()
            };

            return api.ticket.insert(appId, agentId, newTicket).then(function() {
                $.notify('待辦事項已新增', { type: 'success' });
                instance.loadTickets(appId, agentId);
            }).catch(function() {
                $.notify('待辦事項新增失敗，請重試', { type: 'danger' });
            }).then(function() {
                $addTicketModal.modal('hide');
            });
        }
    };

    TicketTableCtrl.prototype.updateTicket = function(appId, ticketId) {
        var modifyTable = $('#ticket_info_modal .info-input-table');
        modifyTable.find('input').blur();

        var ticketPriority = parseInt(modifyTable.find('th.priority').parent().find('td select').val());
        var ticketStatus = parseInt(modifyTable.find('th.status').parent().find('td select').val());
        var ticketDescription = modifyTable.find('th.description').parent().find('td.edit textarea').val();
        var ticketDueTime = modifyTable.find('th.time-edit').parent().find('td input').val();

        // 準備要修改的 ticket json 資料
        var modifiedTicket = {
            description: ticketDescription,
            dueTime: new Date(ticketDueTime).getTime(),
            priority: ticketPriority,
            status: ticketStatus,
            updatedTime: Date.now()
        };

        // 發送修改請求 api 至後端進行 ticket 修改
        return api.ticket.update(appId, ticketId, agentId, modifiedTicket).then(function() {
            $.notify('待辦事項已更新', { type: 'success' });
            instance.loadTickets(appId, agentId);
        }).catch(function() {
            $.notify('待辦事項更新失敗，請重試', { type: 'danger' });
        });
    };

    TicketTableCtrl.prototype.deleteTicket = function(appId, ticketId) {
        if (confirm('確認刪除表單？')) {
            return api.ticket.remove(appId, ticketId, agentId).then(function() {
                $.notify('待辦事項已刪除', { type: 'success' });
                instance.loadTickets(appId, agentId);
            }).catch(function() {
                $.notify('待辦事項刪除失敗，請重試', { type: 'danger' });
            });
        }
        return Promise.resolve();
    };

    return instance;
})();

window.auth.ready.then(function(currentUser) {
    var api = window.restfulAPI;
    agentId = auth.currentUser.uid;

    // 設定 bootstrap notify 的預設值
    // 1. 設定為顯示後2秒自動消失
    // 2. 預設位置為螢幕中間上方
    // 3. 進場與結束使用淡入淡出
    $.notifyDefaults({
        delay: 2000,
        placement: {
            from: 'top',
            align: 'center'
        },
        animate: {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
        }
    });

    // start the loading works
    $infoPanel.hide();

    // =====start chat event=====
    $(document).on('click', '.chat-app-item', showChatApp);
    $(document).on('click', '.tablinks', clickUserTablink); // 群組清單裡面選擇客戶
    $(document).on('focus', '#message', readClientMsg); // 已讀客戶訊息
    $(document).on('click', '#submitMsg', submitMsg); // 訊息送出
    ocClickShow.on('click', triggerFileUpload); // 傳圖，音，影檔功能
    $('.send-file').on('change', fileUpload); // 傳圖，音，影檔功能
    $('[data-toggle="tooltip"]').tooltip();
    messageInput.on('keydown', function(e) { // 按enter可以發送訊息
        if (13 === e.keyCode) {
            $('#submitMsg').click();
        }
    });
    // =====end chat event=====

    // =====start profile event=====
    $(document).on('click', '#show_profile', showProfile);
    $(document).on('keypress', '.user-info-td[modify="true"] input[type="text"]', userInfoKeyPress);
    $(document).on('click', '.profile-confirm button', userInfoConfirm);
    $(document).on('click', '.internal-profile-confirm button', internalConfirm);
    $(document).on('click', '.photo-choose', groupPhotoChoose);
    $(document).on('change', '.photo-ghost', groupPhotoUpload);
    // =====end profile event=====

    // =====start ticket event=====
    $(document).on('click', '#show_todo', ticketTableCtrl.show);
    // =====end ticket event=====

    // =====start utility event=====

    $(document).on('change', '.multi-select-container', multiSelectChange);
    $(document).on('click', '.dropdown-menu', function(event) {
        event.stopPropagation();
    });
    $.extend($.expr[':'], {
        'containsi': function(elem, i, match, array) {
            return (elem.textContent || elem.innerText || '').toLowerCase().indexOf((match[3] || '').toLowerCase()) >= 0;
        }
    });
    // =====end utility event=====

    // ==========
    // #region 準備聊天室初始化資料區塊
    var socketDataPromise = new Promise(function(resolve) {
        socket.emit('request chat init data', {
            id: agentId
        }, resolve);
    });

    var appsDataPromise = api.chatshierApp.getAll(agentId);

    Promise.all([socketDataPromise, appsDataPromise]).then(function(promiseResults) {
        var socketData = promiseResults[0];
        var apiData = promiseResults[1].data;
        appsData = {};
        tagsData = {};

        // 過濾 API 資料裡已經刪除的 app 資料
        for (var appId in apiData) {
            var appData = apiData[appId];
            if (appData.isDeleted) {
                continue;
            }

            appsData[appId] = appData;
            tagsData[appId] = {};

            // 過濾已經刪除的 tag 資料
            if (appData.tags) {
                for (var tagId in appData.tags) {
                    var tagData = appData.tags[tagId];
                    if (tagData.isDeleted) {
                        continue;
                    }
                    tagsData[appId][tagId] = tagData;
                }
            }
        }

        return {
            internalChatData: socketData.internalChatData,
            appsData: appsData,
            tagsData: tagsData
        };
    }).then(function(initData) {
        if (initData.reject) {
            $.notify(initData.reject);
            return;
        }

        responseInternalChatData(initData.internalChatData);
        responseUserAppIds(initData.appsData);
    });
    // #endregion
    // ==========

    // ==========start initialize function========== //

    function responseUserAppIds(appsData) {
        if (!appsData) {
            if ('1' !== window.sessionStorage.notifyModal) { // 網頁refresh不會出現errorModal(但另開tab會)
                $('#notifyModal').modal('show');
                window.sessionStorage.notifyModal = 1;
            }
            return;
        }

        appGroupSort(appsData);
        responseChatData(appsData);
    }

    function appGroupSort(appsData) {
        var $chatApp = $('#chat_App');

        for (var appId in appsData) {
            var item = appsData[appId];

            switch (item.type) {
                case LINE:
                    var lineStr =
                        '<div class="chat-app-item" id="LINE" open="true" data-toggle="tooltip" data-placement="right" title="' + item.name + '" rel="' + appId + '">' +
                            '<img class="software-icon" src="http://informatiekunde.dilia.be/sites/default/files/uploads/logo-line.png">' +
                            '<div class="unread-count"></div>' +
                        '</div>';
                    $chatApp.prepend(lineStr);
                    break;
                case FACEBOOK:
                    var fbStr =
                        '<div class="chat-app-item" id="FB" open="true" data-toggle="tooltip" data-placement="right" title="' + item.name + '" rel="' + appId + '">' +
                            '<img class="software-icon" src="https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png">' +
                            '<div class="unread-count"></div>' +
                        '</div>';
                    $chatApp.prepend(fbStr);
                    break;
            }
        }
    }

    function responseChatData(apps) {
        for (var appId in apps) {
            var appData = apps[appId];
            var chatroomsData = appData.chatrooms;

            for (var msgerId in appData.messagers) {
                var messager = appData.messagers[msgerId];
                var chatData = {
                    profile: messager,
                    obj: chatroomsData[messager.chatroom_id],
                    userId: msgerId,
                    appId: appId
                };

                pushChatroom(chatData);
                pushProfile(chatData);
            }
        }
    } // end of responseChatData

    function responseHistoryMsg(data) {
        let msgContent = $('#' + data.userId + '-content' + '[rel="' + data.channelId + '"]');
        let originHeight = msgContent[0].scrollHeight;
        msgContent.find('.message:first').remove();
        msgContent.find('.message-day:lt(3)').remove();
        msgContent.prepend(historyMsgToStr(data.messages));
        let nowHeight = msgContent[0].scrollHeight;
        msgContent.animate({
            scrollTop: nowHeight - originHeight
        }, 0);
        if (msgContent.attr('data-position') > 0) msgContent.prepend(LOADING_MSG_AND_ICON);
        else msgContent.prepend(NO_HISTORY_MSG);
    }

    function responseInternalChatData(data) {
        if (!data) { return; }

        internalTagsData = data.internalTagsData;
        agentIdToName = data.agentIdToName;
        for (var i in data.data) {
            pushInternalMsg(data.data[i]); // 聊天記錄
            pushInternalInfo(data.data[i].Profile);
        }
    }

    function pushChatroom(data) {
        let profile = data.profile;
        nameList.push(data.userId + data.appId); // make a name list of all chated user
        userProfiles[data.appId] = profile;

        if (!(data && data.obj && Object.keys(data.obj).length > 0)) {
            return;
        }

        let historyMsg = data.obj.messages;
        let historyMsgStr = '';
        if (Object.keys(historyMsg).length < 10) {
            historyMsgStr += NO_HISTORY_MSG; // history message string head
        }
        historyMsgStr += historyMsgToStr(historyMsg);
        $('#user-rooms').append('<option value="' + data.userId + '">' + profile.name + '</option>'); // new a option in select bar

        // 左邊的客戶清單排列
        let lastMsg = historyMsg[Object.keys(historyMsg)[Object.keys(historyMsg).length - 1]];
        let lastMsgStr = lastMsgToStr(lastMsg);
        let tablinkHtml =
            '<b><button class="tablinks"' + 'name="' + data.appId + '" rel="' + data.userId + '">' +
                '<div class="img-holder">' +
                    '<img src="' + profile.photo + '" alt="無法顯示相片" />' +
                '</div>' +
                '<div class="msg-holder">' +
                    '<span class="clientName">' + profile.name + '</span>' + lastMsgStr +
                '</div>';

        if ((profile.unRead > 0) && (profile.unRead <= 99)) {
            tablinkHtml += '<div class="chsr unread-msg badge badge-pill" style="display:block;">' + profile.unRead + '</div>';
        } else if (profile.unRead > 99) {
            tablinkHtml += '<div class="chsr unread-msg badge badge-pill" style="display:block;">' + '99+' + '</div>';
        } else {
            tablinkHtml += '<div class="chsr unread-msg badge badge-pill" style="display:none;">' + profile.unRead + '</div>';
        }
        tablinkHtml += '</button></b><hr/>';

        $('#clients').append(tablinkHtml);

        // if (typeof(profile.VIP等級) === "string" && profile.VIP等級 !== "未選擇") {
        //     $('#vip_list').prepend(tablinkHtml);
        // } else {
        //     $('#clients').append(tablinkHtml);
        // }

        // 中間聊天室
        canvas.append( // push string into canvas
            '<div id="' + data.appId + '" rel="' + data.userId + '" class="tabcontent">' +
                "<div id='" + data.appId + "-content' rel='" + data.userId + "' class='messagePanel'>" + historyMsgStr + '</div>' +
            '</div>'
        ); // close append

        // if (data.position != 0) $('#' + data.appId + '-content' + '[rel="' + data.userId + '"]').on('scroll', function() {
        //     detecetScrollTop($(this));
        // });
    } // end of pushChatroom

    function historyMsgToStr(messages) {
        let returnStr = '';
        let nowDateStr = '';
        let prevTime = 0;

        for (let i in messages) {
            if (undefined === messages[i].text || null === messages[i].text || '' === messages[i].text) {
                switch (messages[i].type) {
                    case 'image':
                        let imageUrl = messages[i].src;
                        messages[i].text = '<img src="' + imageUrl + '" style="width: 100%; max-width: 500px;" />';
                        break;
                    case 'audio':
                        let audioUrl = messages[i].src;
                        messages[i].text = '<audio controls><source src="' + audioUrl + '" type="audio/mp4"></audio>';
                        break;
                    case 'video':
                        let videoUrl = messages[i].src;
                        messages[i].text = '<video controls><source src="' + videoUrl + '" type="video/mp4"></video>';
                        break;
                    case 'sticker':
                        let stickerUrl = messages[i].src;
                        messages[i].text = '<img src="' + stickerUrl + '" style="width: 100%; max-width: 200px;" />';
                        break;
                    case 'location':
                        let locationUrl = messages[i].src;
                        messages[i].text = '<a target="_blank" href="' + locationUrl + '">location</a>';
                        break;
                }
            }
            // this loop plus date info into history message, like "----Thu Aug 01 2017----"
            let d = new Date(messages[i].time).toDateString(); // get msg's date
            if (d !== nowDateStr) {
                // if (now msg's date != previos msg's date), change day
                nowDateStr = d;
                returnStr += "<p class='message-day'><strong>" + nowDateStr + '</strong></p>'; // plus date info
            }
            if (messages[i].time - prevTime > 15 * 60 * 1000) {
                // if out of 15min section, new a section
                returnStr += "<p class='message-day'><strong>" + toDateStr(messages[i].time) + '</strong></p>'; // plus date info
            }
            prevTime = messages[i].time;
            if (SYSTEM === messages[i].from || CHATSHIER === messages[i].from || 'agent' === messages[i].owner) {
                // plus every history msg into string
                returnStr += toAgentStr(messages[i].text, messages[i].time);
            } else returnStr += toUserStr(messages[i].text, messages[i].time);
        }
        return returnStr;
    } // end of historyMsgToStr

    function pushProfile(data) {
        var messager = data.profile;
        infoCanvas.append(
            '<div class="card-group" id="' + data.appId + '" rel="' + data.userId + '">' +
                '<div class="card-body table-responsive" id="profile">' +
                    '<div class="photo-container">' +
                        '<img src="' + messager.photo + '" alt="無法顯示相片" style="width:128px;height:128px;" />' +
                    '</div>' +
                    loadPanelProfile(data.appId, messager) +
                    '<div class="profile-confirm text-center">' +
                        '<button type="button" class="btn btn-info">確認</button>' +
                    '</div>' +
                '</div>' +
                '<div class="card-body" id="ticket" style="display:none;"></div>' +
                '<div class="card-body" id="todo" style="display:none; ">' +
                    '<div class="ticket">' +
                        '<table class="ticket-table">' +
                            '<thead>' +
                                '<tr>' +
                                    '<th class="sortable">狀態</th>' +
                                    '<th class="sortable">到期</th>' +
                                    '<th>' +
                                        '<input type="text" class="ticket-search-bar" id="exampleInputAmount" placeholder="搜尋" />' +
                                    '</th>' +
                                    '<th>' +
                                        '<a id="' + data.userId + '-modal" data-toggle="modal" data-target="#add-ticket-modal">' +
                                            '<span class="fa fa-plus fa-fw"></span>新增待辦' +
                                        '</a>' +
                                    '</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody class="ticket-body" rel="' + data.userId + '"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    } // end of pushProfile

    function loadPanelProfile(appId, messager) {
        var table = $.parseHTML('<table class="table table-hover panel-table"></table>');
        var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;

        var customTags = messager.custom_tags || {};
        var fetchCustomTags = function(tagId) {
            for (var cTagId in customTags) {
                if (customTags[cTagId].tag_id === tagId) {
                    return customTags[cTagId].value;
                }
            }
            return '';
        };

        var tdHtmlBuilder = function(tagId, tagData) {
            var setsTypeEnums = api.tag.enums.setsType;
            var readonly = tagData.type === api.tag.enums.type.SYSTEM;
            var tagValue = '';

            if (tagData.type === api.tag.enums.type.CUSTOM) {
                tagValue = fetchCustomTags(tagId);
            } else {
                tagValue = messager[tagData.alias] || '';
            }

            switch (tagData.setsType) {
                case setsTypeEnums.SELECT:
                    return '<td class="user-info-td" alias="' + tagData.alias + '" type="' + tagData.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<select class="form-control td-inner" value="' + tagValue + '">' +
                            (function(sets) {
                                var opts = '<option value="">未選擇</option>';
                                for (var i in sets) {
                                    opts += '<option value="' + sets[i] + '" ' + (sets[i] === tagValue ? 'selected' : '') + '>' + (transJson[sets[i]] || sets[i]) + '</option>';
                                }
                                return opts;
                            })(tagData.sets) +
                        '</select>' +
                    '</td>';
                case setsTypeEnums.MULTI_SELECT:
                    tagValue = (tagValue instanceof Array) ? tagValue : [];

                    return '<td class="user-info-td" alias="' + tagData.alias + '" type="' + tagData.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<div class="btn-group btn-block td-inner">' +
                            '<button class="btn btn-default btn-block" data-toggle="dropdown" aria-expanded="false">' +
                                '<span class="caret"></span>' +
                            '</button>' +
                            '<ul class="multi-select-container dropdown-menu">' +
                                (function(sets) {
                                    var checkboxes = '';
                                    for (var i in sets) {
                                        checkboxes += '<li><input type="checkbox" value="' + sets[i] + '"' + (tagValue[i] ? ' checked="true"' : '') + '">' + sets[i] + '</li>';
                                    }
                                    return checkboxes;
                                })(tagData.sets) +
                            '</ul>' +
                        '</div>' +
                    '</td>';
                case setsTypeEnums.CHECKBOX:
                    return '<td class="user-info-td" alias="' + tagData.alias + '" type="' + tagData.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<input class="td-inner" type="checkbox"' + (tagValue ? ' checked="true"' : '') + (readonly ? ' disabled' : '') + '/>' +
                    '</td>';
                case setsTypeEnums.DATE:
                    tagValue = tagValue || 0;
                    var tagDateStr = new Date(tagValue - timezoneGap).toISOString().split('.').shift();
                    return '<td class="user-info-td" alias="' + tagData.alias + '" type="' + tagData.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<input class="form-control td-inner" type="datetime-local" value="' + tagDateStr + '" ' + (readonly ? 'readonly disabled' : '') + '/>' +
                    '</td>';
                case setsTypeEnums.TEXT:
                case setsTypeEnums.NUMBER:
                default:
                    return '<td class="user-info-td" alias="' + tagData.alias + '" type="' + tagData.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<input class="form-control td-inner" type="text" placeholder="尚未輸入" value="' + tagValue + '" ' + (readonly ? 'readonly disabled' : '') + '/>' +
                    '</td>';
            }
        };

        // 呈現標籤資料之前先把標籤資料設定的順序排列
        var tagKeys = Object.keys(tagsData[appId]);
        tagKeys.sort(function(a, b) {
            return tagsData[appId][a].order - tagsData[appId][b].order;
        });

        var messagerProfileHtml = '';
        for (var i in tagKeys) {
            var tagId = tagKeys[i];
            var tagData = tagsData[appId][tagId];
            messagerProfileHtml +=
                '<tr id="' + tagId + '">' +
                    '<th class="user-info-th" alias="' + tagData.alias + '">' + (transJson[tagData.text] || tagData.text) + '</th>' +
                    tdHtmlBuilder(tagId, tagData) +
                '</tr>';
        }
        $(table).append(messagerProfileHtml);
        return $(table)[0].outerHTML;
    }

    function pushInternalMsg(data) {
        let historyMsg = data.Messages;
        let profile = data.Profile;
        let historyMsgStr = '';
        historyMsgStr += internalHistoryMsgToStr(historyMsg);
        // end of history message
        $('#user-rooms').append('<option value="' + profile.userId + '">' + profile.name + '</option>'); //new a option in select bar
        let lastMsg = historyMsg[historyMsg.length - 1];
        let lastMsgStr = lastMsgToStr(lastMsg);
        if (profile.unRead > 0) {
            $('#clients').append("<b><button style='text-align:left' class='tablinks'" + "name='" + profile.roomId + "' rel='internal'" + "data-avgTime='" + profile.avgChat + "' " + "data-totalTime='" + profile.totalChat + "' " + "data-chatTimeCount='" + profile.chatTimeCount + "' " + "data-firstTime='" + profile.firstChat + "' " + "data-recentTime='" + lastMsg.time + "' >" + "<div class='img-holder'>" + "<img src='" + profile.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + profile.roomName + "</span>" + lastMsgStr + "</div>" + "<div class='chsr unread-msg badge badge-pill' style='display:block;'>" + profile.unRead + "</div>" + "</button><hr/></b>"); //new a tablinks
        } else {
            $('#clients').append("<b><button style='text-align:left' class='tablinks'" + "name='" + profile.roomId + "' rel='internal'" + "data-avgTime='" + profile.avgChat + "' " + "data-totalTime='" + profile.totalChat + "' " + "data-chatTimeCount='" + profile.chatTimeCount + "' " + "data-firstTime='" + profile.firstChat + "' " + "data-recentTime='" + lastMsg.time + "' >" + "<div class='img-holder'>" + "<img src='" + profile.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + profile.roomName + "</span>" + lastMsgStr + "</div>" + "<div class='chsr unread-msg badge badge-pill' style='display:none;'>" + profile.unRead + "</div>" + "</button><hr/></b>"); //new a tablinks
        }
        // 依照不同的channel ID做分類
        canvas.append( //push string into canvas
            '<div id="' + profile.roomId + '" rel="internal" class="tabcontent"style="display: none;">' + "<div id='" + profile.roomId + "-content' rel='internal' class='messagePanel' data-position='" + 0 + "'>" + historyMsgStr + "</div>" + "</div>"
        ); // close append
        nameList.push("internal" + profile.roomId); //make a name list of all chated user
        userProfiles[profile.roomId] = profile;
    } // end of pushInternalMsg
    function internalHistoryMsgToStr(messages) {
        let returnStr = "";
        let nowDateStr = "";
        let prevTime = 0;
        for (let i in messages) {
            messages[i].name = agentIdToName[messages[i].agentId];
            //this loop plus date info into history message, like "----Thu Aug 01 2017----"
            let d = new Date(messages[i].time).toDateString(); //get msg's date
            if (d != nowDateStr) {
                //if (now msg's date != previos msg's date), change day
                nowDateStr = d;
                returnStr += "<p class='message-day' style='text-align: center'><strong>" + nowDateStr + "</strong></p>"; //plus date info
            }
            if (messages[i].time - prevTime > 15 * 60 * 1000) {
                //if out of 15min section, new a section
                returnStr += "<p class='message-day' style='text-align: center'><strong>" + toDateStr(messages[i].time) + "</strong></p>"; //plus date info
            }
            prevTime = messages[i].time;
            if (messages[i].agentId == agentId) {
                //plus every history msg into string
                returnStr += toAgentStr(messages[i].message, messages[i].time);
            } else returnStr += toUserStr(messages[i].message, messages[i].time);
        }
        return returnStr;
    } // end of internalHistoryMsgToStr
    function pushInternalInfo(profile) {
        let photoHtml = "<div class='photo-container' rel='" + profile.photo + "'><input type='file' class='photo-ghost' style='visibility:hidden; height:0'>" + '<img class="photo-choose" src="' + profile.photo + '" alt="無法顯示相片" style="width:auto;height:128px;">' + "</div>";
        infoCanvas.append('<div class="card-group" id="' + profile.roomId + '-info" rel="internal-info">' + '<div class="card-body" id="profile">' + photoHtml + loadInternalPanelProfile(profile) + '<div class="internal-profile-confirm">' + '<button type="button" class="btn btn-info pull-right" id="confirm">Confirm</button>' + '</div>' + '</div></div>');
    } // end of pushInternalInfo
    function loadInternalPanelProfile(profile) {
        let html = "<table class='panel-table'>";
        for (let i in internalTagsData) {
            let name = internalTagsData[i].name;
            let type = internalTagsData[i].type;
            let set = internalTagsData[i].set;
            let modify = internalTagsData[i].modify;
            let data = profile[name];
            let tdHtml = "";
            if (type === 'text') {
                if (data) {
                    tdHtml = '<p class="td-inner">' + data + '</p>';
                } else {
                    tdHtml = '<p class="td-inner">尚未輸入</p>';
                }
            } else if (type === "time") {
                if (modify) tdHtml = '<input type="datetime-local" class="td-inner" ';
                else tdHtml = '<input type="datetime-local" class="td-inner" readonly ';
                if (data) {
                    d = new Date(data);
                    tdHtml += 'value="' + d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + 'T' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + '"';
                }
                tdHtml += ' ></input>';
            } else if (type === 'single-select') {
                if (modify) tdHtml = '<select class="td-inner">';
                else tdHtml = '<select class="td-inner" disabled>';
                if (!data) tdHtml += '<option selected="selected" > 未選擇 </option>';
                else tdHtml += '<option> 未選擇 </option>';
                if (name == "owner") {
                    for (let id in agentIdToName) {
                        if (id != data) tdHtml += '<option value="' + id + '">' + agentIdToName[id] + '</option>';
                        else tdHtml += '<option value="' + id + '" selected="selected">' + agentIdToName[id] + '</option>';
                    }
                } else {
                    for (let j in set) {
                        if (set[j] != data) tdHtml += '<option value="' + set[j] + '">' + set[j] + '</option>';
                        else tdHtml += '<option value="' + set[j] + '" selected="selected">' + set[j] + '</option>';
                    }
                }
                tdHtml += '</select>';
            } else if (type === 'multi-select') {
                tdHtml = '<div class="btn-group td-inner">';
                if (modify === true) tdHtml += '<button type="button" data-toggle="dropdown" aria-expanded="false">';
                else tdHtml += '<button type="button" data-toggle="dropdown" aria-expanded="false" disabled>';
                if (!data) data = "";
                if (name == "agent") {
                    let selected = data.split(',');
                    let names = selected.map(function(e) {
                        return agentIdToName[e];
                    });
                    if (names.length == Object.keys(agentIdToName).length) tdHtml += '<span class="multi-select-text" rel="' + data + '">' + "全選" + '</span>';
                    else tdHtml += '<span class="multi-select-text" rel="' + data + '">' + names.join(',') + '</span>';
                    tdHtml += '<b class="caret"></b></button>' + '<ul class="multi-select-container dropdown-menu">';
                    for (let id in agentIdToName) {
                        if (selected.indexOf(id) != -1) tdHtml += '<li><input type="checkbox" value="' + id + '" checked>' + agentIdToName[id] + '</li>';
                        else tdHtml += '<li><input type="checkbox" value="' + id + '">' + agentIdToName[id] + '</li>';
                    }
                } else {
                    let selected = data.split(',');
                    if (selected.length == set.length) tdHtml += '<span class="multi-select-text">' + "全選" + '</span>';
                    else tdHtml += '<span class="multi-select-text">' + data + '</span>';
                    tdHtml += '<b class="caret"></b></button>' + '<ul class="multi-select-container dropdown-menu">';
                    for (let j in set) {
                        if (selected.indexOf(set[j]) != -1) tdHtml += '<li><input type="checkbox" value="' + set[j] + '" checked>' + set[j] + '</li>';
                        else tdHtml += '<li><input type="checkbox" value="' + set[j] + '">' + set[j] + '</li>';
                    }
                }
                tdHtml += '</ul></div>';
            }
            html += '<tr>' + '<th class="user-info-th" id="' + name + '">' + name + '</th>' + '<td class="user-info-td" id="' + name + '" type="' + type + '" set="' + set + '" modify="' + modify + '">' + tdHtml + '</td>';
        }
        html += "</table>";
        return html;
    } // end of loadInternalPanelProfile
    // ==========end initialize function========== //

    // =====start socket function=====
    socket.on(SOCKET_MESSAGE.SEND_MESSAGE_SERVER_EMIT_CLIENT_ON, (appsChatroomsMessages) => {
        let appId = Object.keys(appsChatroomsMessages)[0]; // appsChatroomsMessages第一層的key就是App ID
        let chatrooms = appsChatroomsMessages[appId].chatrooms; // Chatroom 物件
        let messages = {}; // 訊息的物件
        let chatroomsMessages = {};
        let userIdArr = [];

        for (let chatroomId in chatrooms) {
            chatroomsMessages.messages = chatrooms[chatroomId].messages;
            userIdArr = Object.values(chatrooms[chatroomId].messages).filter((message) => (message.messager_id !== ''));
        }
        let Uid = userIdArr[0].messager_id; // 必須要先foreach chatrooms才可以找到User ID
        if (!Uid) {
            return;
        }
        let totalMessages = Object.keys(chatroomsMessages.messages).length - $('#' + appId + '[rel="' + Uid + '"] .message').length; // 撈下來的聊天數跟現在聊天室的訊息數差別
        for (let i = totalMessages; i > 0; i--) {
            let msgKey = Object.keys(chatroomsMessages.messages)[Object.keys(chatroomsMessages.messages).length - i];
            messages[msgKey] = chatroomsMessages.messages[msgKey];
        }

        let msgKeys = Object.keys(messages);
        if (0 === msgKeys.length) {
            return;
        }

        return Promise.all(msgKeys.map(function(msgKey) {
            let message = Object.assign({}, messages[msgKey]);

            switch (message.type) {
                case 'text':
                    break;
                case 'image':
                    let imageUrl = message.src;
                    message.text = '<img src="' + imageUrl + '" style="width: 100%; max-width: 500px;" />';
                    break;
                case 'audio':
                    let audioUrl = message.src;
                    message.text = '<audio controls><source src="' + audioUrl + '" type="audio/mp4"></audio>';
                    break;
                case 'video':
                    let videoUrl = message.src;
                    message.text = '<video controls><source src="' + videoUrl + '" type="video/mp4"></video>';
                    break;
                case 'sticker':
                    let stickerUrl = message.src;
                    message.text = '<img src="' + stickerUrl + '" style="width: 100%; max-width: 200px;" />';
                    break;
                case 'location':
                    let locationUrl = message.src;
                    message.text = '<a target="_blank" href="' + locationUrl + '">location</a>';
                    break;
            }

            return api.messager.getOne(appId, Uid, agentId).then((resJson) => {
                var messager = resJson.data;
                var $room = $('.chat-app-item[rel="' + appId + '"]');

                if ($room.length !== 0) {
                    displayMessage(messager, message, Uid, appId); // update 聊天室
                    displayClient(messager, message, Uid, appId); // update 客戶清單
                    displayInfo(messager, message, Uid, appId);
                    if (-1 === nameList.indexOf(Uid + appId)) {
                        nameList.push(Uid + appId);
                    }
                }
            });
        }));
    });
    socket.on('new internal message', (data) => {
        let $room = $('.tablinks-area .tablinks[name="' + data.roomId + '"]');
        if ($room.length !== 0) {
            displayMessageInternal(data.sendObj, data.roomId);
            displayClientInternal(data.sendObj, data.roomId);
        }
    });
    socket.on('new user profile', function(data) {
        userProfiles[data.userId] = data;
        pushProfile({
            'Profile': data
        });
    });
    socket.on('autoreplies', (data) => {
        var sendObj = data.sendObj;
        var msgText = sendObj.msgText;
        var userId = data.userId;
        var appId = data.appId;
        let str = toAgentStr(msgText, Date.now());
        $('#' + userId + '-content' + "[rel='" + appId + "']").append(str); // push message into right canvas
        $('#' + userId + '-content' + "[rel='" + appId + "']").scrollTop($('#' + userId + '-content' + '[rel="' + appId + '"]')[0].scrollHeight); // scroll to down
        $('[name="' + userId + '"][rel="' + appId + '"] #msg').html(toTimeStr(Date.now()) + loadMessageInDisplayClient(msgText));
        messageInput.val('');
    });
    socket.on('post followMessage to chat', (data) => {
        var userId = data.userId; // 平台使用者的appId
        var appId = data.appId; // line打過來的userId
        var msgText = data.followMessage;
        for (let i in msgText) {
            let str = toAgentStr(msgText[i], Date.now());
            $('#' + userId + '-content' + "[rel='" + appId + "']").append(str); // push message into right canvas
            $('#' + userId + '-content' + "[rel='" + appId + "']").scrollTop($('#' + userId + '-content' + '[rel="' + appId + '"]')[0].scrollHeight); // scroll to down
            $('[name="' + userId + '"][rel="' + appId + '"] #msg').html(toTimeStr(Date.now()) + loadMessageInDisplayClient(msgText[i]));
            messageInput.val('');
        }
    });
    //=====end socket function=====

    //=====start chat function=====
    function showChatApp() {
        let str;
        let thisRel = $(this).attr('rel');
        if (thisRel === 'All') {
            $('.tablinks-area').find('b').show();
        } else if (thisRel === 'unread') {
            $('.tablinks-area').find('.unread-msg').each(function(index, el) {
                if ($(this).text() === '0') {
                    $(this).parent().parent().hide();
                } else {
                    $(this).parent().parent().show();
                }
            });
        } else if (thisRel === 'assigned') {
            $('.tablinks-area').find('b').hide();
            $('.td-inner .multi-button .multi-select-text').each(function(index, el) {
                str = $(this).attr('rel').split(',');
                let rel = str.length === 1 && str[0] === '' ? $(this).attr('rel') : str;
                if (rel !== '') {
                    let id = $(this).parent().parent().parent().parent().parent().parent().parent().parent().attr('id');
                    let newId = id.substring(0, id.indexOf('-'));
                    $('.tablinks[name="' + newId + '"]').parent().show();
                }
            });
        } else if (thisRel === 'unassigned') {
            $('.tablinks-area').find('b').hide();
            $('.td-inner .multi-button .multi-select-text').each(function(index, el) {
                str = $(this).attr('rel').split(',');
                let rel = str.length === 1 && str[0] === '' ? $(this).attr('rel') : str;
                if (rel === '') {
                    let id = $(this).parent().parent().parent().parent().parent().parent().parent().parent().attr('id');
                    let newId = id.substring(0, id.indexOf('-'));
                    $('.tablinks[name="' + newId + '"]').parent().show();
                }
            });
        } else {
            $('.tablinks-area').find('b').hide();
            $('.tablinks-area').find('[name="' + thisRel + '"]').parent().show();
        }
    }

    function clickUserTablink() {
        let appId = $(this).attr('name');
        let msgId = $(this).attr('rel');
        $('#send-message').show();
        $infoPanel.show();
        if (msgId === 'internal') {
            $('#show_todo').hide();
        } else {
            $('#show_todo').show();
        }
        ticketTableCtrl.loadTickets(appId, agentId);

        $(".tablinks#selected").removeAttr('id').css("background-color", ''); // selected tablinks change, clean prev's color
        $(this).attr('id', 'selected').css("background-color", COLOR.CLICKED); // clicked tablinks color
        if ($(this).find('.unread-msg').text() !== '0') { // 如果未讀的話
            $(this).find('.unread-msg').text('0').hide(); // 已讀 把未讀的區塊隱藏
            $(this).find("#msg").css("font-weight", "normal"); // 取消未讀粗體
            socket.emit('read message', {
                msgId,
                appId
            }); //tell socket that this user isnt unRead
        }
        $('#user-rooms').val(appId); //change value in select bar
        $("#" + appId + "-info" + "[rel='" + msgId + "-info']").show().siblings().hide(); // show it, and close others
        $("#" + appId + "[rel='" + msgId + "']").show().siblings().hide(); // show it, and close others
        $("#" + appId + "[rel='" + msgId + "']" + '>#' + appId + '-content' + '[rel="' + msgId + '"]').scrollTop($('#' + appId + '-content' + '[rel="' + msgId + '"]')[0].scrollHeight); //scroll to down
        let clientName = $(this).find('.clientName').text();
        $('#prof-nick').text(clientName);
    } // end of clickUserTablink
    function detecetScrollTop(ele) {
        if (ele.scrollTop() === 0) {
            let tail = parseInt(ele.attr('data-position'));
            let head = parseInt(ele.attr('data-position')) - 20;
            if (head < 0) head = 0;
            let request = {
                userId: ele.parent().attr('id'),
                channelId: ele.parent().attr('rel'),
                head: head,
                tail: tail
            };
            if (head === 0) ele.off('scroll');
            ele.attr('data-position', head);
            socket.emit('upload history msg from front', request, responseHistoryMsg);
        }
    } // end of detecetScrollTop
    function readClientMsg() {
        let userId = $('.tablinks#selected').attr('name'); // ID
        let channelId = $('.tablinks#selected').attr('rel'); // channelId
        $('.tablinks#selected').find('.unread-msg').text('0').hide();
        socket.emit("read message", {
            channelId: channelId,
            userId: userId
        }); //tell socket that this user isnt unRead
    } //end of readClientMsg
    function submitMsg(e) {
        e.preventDefault();
        let vendorId = auth.currentUser.uid;
        let email = auth.currentUser.email;
        let appId = $(this).parent().parent().siblings('#canvas').find('[style="display: block;"]').attr('id'); // 客戶的聊天室ID
        let userId = $(this).parent().parent().siblings('#canvas').find('[style="display: block;"]').attr('rel'); // 客戶的user ID
        let msgStr = messageInput.val();
        if (userId !== undefined || appId !== undefined) {
            if (appId == "internal") {
                messageInput.val('');
                let sendObj = {
                    agentId: auth.currentUser.uid,
                    time: Date.now(),
                    message: msgStr
                };
                socket.emit('send internal message', {
                    sendObj: sendObj,
                    roomId: appId
                });
            } else {
                var getAppsInfo = new Promise((resolve, reject) => {
                    database.ref('users/' + vendorId).once('value', data => {
                        if (data.val() !== null) {
                            let user = data.val();
                            let str = toAgentStr(msgStr, Date.now());
                            $('#' + appId + '-content' + "[rel='" + userId + "']").append(str); // push message into right canvas
                            $('#' + appId + '-content' + "[rel='" + userId + "']").scrollTop($('#' + appId + '-content' + '[rel="' + userId + '"]')[0].scrollHeight); //scroll to down
                            $('[name="' + appId + '"][rel="' + userId + '"] #msg').html(toTimeStr(Date.now()) + loadMessageInDisplayClient(msgStr));
                            messageInput.val('');
                            resolve();
                        } else {
                            reject('vendor not found!')
                        }
                    });
                });

                getAppsInfo
                    .then(() => {
                        return new Promise((resolve, reject) => {
                            database.ref('apps').once('value', data => {
                                if (data.val() === null) {
                                    reject('data is empty');
                                } else {
                                    let appsInfo = data.val();
                                    resolve(appsInfo);
                                }
                            });
                        });
                    })
                    .then(data => {
                        let info = data;
                        return new Promise((resolve, reject) => {
                            database.ref('users/' + vendorId + '/app_ids').once('value', data => {
                                let userApps = data.val();
                                let sendObj = {};
                                if (userApps === null) {
                                    reject('vendor does not have apps setup');
                                } else {
                                    let hashId = userApps;

                                    hashId.map((item) => {
                                        if (item === appId) {
                                            resolve(item);
                                        }
                                    });
                                }
                            });
                        });
                    })
                    .then((data) => {
                        let appId = data;
                        return database.ref('apps/' + appId).once('value');
                    })
                    .then((snap) => {
                        let apps = snap.val();
                        return new Promise((resolve, reject) => {
                            let obj = {
                                ...apps,
                                msg: msgStr,
                                msgTime: Date.now(),
                                clientId: userId,
                                textType: 'text'
                            }
                            resolve(obj);
                        });
                    })
                    .then((data) => {
                        return new Promise((resolve, reject) => {
                            socket.emit(SOCKET_MESSAGE.SEND_MESSAGE_CLIENT_EMIT_SERVER_ON, { appId, userId, data });
                            resolve();
                        });
                    })
                    .catch(reason => {

                    });
            }
        }
    } // end of submitMsg
    function triggerFileUpload(e) {
        var eId = $(this).data('id');
        $('#' + eId).trigger('click');
    }

    function fileUpload() {
        var $contentPanel = $(this).parent().parent().parent().parent();
        var $chat = $contentPanel.find('#canvas').find('div[style="display: block;"]');
        var appId = $chat.attr('id');
        var userId = $chat.attr('rel');
        if (0 < this.files.length) {
            let proceed = Promise.resolve();
            var file = this.files[0];
            var self = this;
            var storageRef = firebase.storage().ref();
            var fileRef = storageRef.child(file.lastModified + '_' + file.name);
            let apps;
            proceed.then(() => {
                return database.ref('apps/' + appId).once('value');
            }).then((snap) => {
                apps = snap.val();
                return new Promise((resolve, reject) => {
                    resolve();
                });
            }).then(() => {
                return fileRef.put(file);
            }).then(function(snapshot) {
                let url = snapshot.downloadURL;
                var textType = $(self).data('type');
                return new Promise((resolve, reject) => {
                    formatUrl(textType, url, (msg) => {
                        var appType = 'string' === typeof(userId) && userId.startsWith('U') ? LINE : FACEBOOK;
                        let str = toAgentStr(msg, Date.now());
                        $('#' + appId + '-content' + "[rel='" + userId + "']").append(str);
                        $('#' + appId + '-content' + "[rel='" + userId + "']").scrollTop($('#' + appId + '-content' + '[rel="' + userId + '"]')[0].scrollHeight);
                        $('[name="' + appId + '"][rel="' + userId + '"] #msg').html(toTimeStr(Date.now()) + loadMessageInDisplayClient(msg));
                        messageInput.val('');
                        var data = {
                            ...apps,
                            msg: '',
                            url: url,
                            textType: textType,
                            type: appType,
                            msgTime: Date.now()
                        };
                        resolve(data);
                    });
                });
            }).then((data) => {
                socket.emit(SOCKET_MESSAGE.SEND_MESSAGE_CLIENT_EMIT_SERVER_ON, { appId, userId, data });
            }).catch(() => {});
        }
    }

    function formatUrl(type, url, callback) {
        let msg;
        switch (type) {
            case 'image':
                msg = '<img src="' + url + '" style="width: 100%; max-width: 500px;"/>';
                callback(msg);
                break;
            case 'audio':
                msg = '<audio controls><source src="' + url + '" type="audio/mpeg"/></audio>';
                callback(msg);
                break;
            case 'video':
                msg = '<video controls><source src="' + url + '" type="video/mp4"></video>';
                callback(msg);
                break;
        }
    }

    function displayInfo(messager, message, userId, appId) {
        let chats = message;
        if (-1 === nameList.indexOf(userId + appId)) {
            infoCanvas.append(
                '<div class="card-group" id="' + appId + '" rel="' + userId + '">' +
                    '<div class="card-body alice-blue" id="profile">' +
                        "<div class='photo-container'>" +
                            '<img src="' + messager.photo + '" alt="無法顯示相片" style="width:128px;height:128px;" />' +
                        '</div>' +
                        loadPanelProfile(appId, messager) +
                        '<div class="profile-confirm">' +
                            '<button type="button" class="btn btn-info pull-right" id="confirm">確認</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card-body" id="ticket" style="display:none; "></div>' +
                    '<div class="card-body" id="todo" style="display:none;">' +
                        '<div class="ticket">' +
                            '<table class="ticket-table">' +
                                '<thead>' +
                                    '<tr>' +
                                        '<th class="sortable">狀態</th>' +
                                        '<th class="sortable">到期</th>' +
                                        '<th><input type="text" class="ticket-search-bar" id="exampleInputAmount" value="" placeholder="搜尋"/></th>' +
                                        '<th>' +
                                            '<a id="' + userId + '-modal" data-toggle="modal" data-target="#add-ticket-modal">' +
                                                '<span class="fa fa-plus fa-fw"></span>新增待辦' +
                                            '</a>' +
                                        '</th>' +
                                    '</tr>' +
                                '</thead>' +
                                '<tbody class="ticket-body" rel="' + userId + '"></tbody>' +
                            '</table>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        }
    }

    function displayMessage(messager, message, userId, appId) {
        let chats = message;
        if (nameList.indexOf(userId + appId) !== -1) { // if its chated user
            let str;
            let designated_chat_room_msg_time = $("#" + appId + "-content" + "[rel='" + userId + "']").find(".message:last").attr('rel');
            if (chats.time - designated_chat_room_msg_time >= 900000) { // 如果現在時間多上一筆聊天記錄15分鐘
                $("#" + appId + "-content" + "[rel='" + userId + "']").append('<p class="message-day"><strong>-新訊息-</strong></p>');
            }
            if (chats.from === SYSTEM || chats.from === CHATSHIER) str = toAgentStr(chats.text, chats.time);
            else str = toUserStr(chats.text, chats.time);
            $("#" + appId + "-content" + "[rel='" + userId + "']").append(str); //push message into right canvas
            $('#' + appId + '-content' + "[rel='" + userId + "']").scrollTop($('#' + appId + '-content' + '[rel="' + userId + '"]')[0].scrollHeight); //scroll to down
        } else { //if its new user
            let historyMsgStr = NO_HISTORY_MSG;
            if (chats.from === "SYSTEM" || chats.from === "CHATSHIER") historyMsgStr += toAgentStr(chats.text, '');
            else historyMsgStr += toUserStr(chats.text, chats.time);
            canvas.append( //new a canvas
                '<div id="' + appId + '" rel="' + userId + '" class="tabcontent">' + '<div id="' + appId + '-content" rel="' + userId + '" class="messagePanel">' + historyMsgStr + '</div></div>'
            ); // close append
            $('#user-rooms').append('<option value="' + appId + '">' + chats.name + '</option>'); //new a option in select bar
        }
    } // end of displayMessage

    function displayClient(messager, message, userId, appId) {
        let chats = message;
        if (-1 === nameList.indexOf(userId + appId)) {
            let tablinkHtml = "<b><button class='tablinks'" + "name='" + appId + "' rel='" + userId + "'><div class='img-holder'>" + "<img src='" + messager.photo + "' alt='無法顯示相片'>" + "</div>" + "<div class='msg-holder'>" + "<span class='clientName'>" + messager.name + '</span><br><div id="msg"></div></div>';
            $('.tablinks-area #new-user-list').prepend(tablinkHtml);
        }
        let target = $('.tablinks-area').find(".tablinks[name='" + appId + "'][rel='" + userId + "']");
        let currentUnread = messager.unRead;
        let $msgElem = target.find('#msg');

        if (chats.text.startsWith('<a') || chats.text.startsWith('<audio') || chats.text.startsWith('<video')) { // 判斷客戶傳送的是檔案，貼圖還是文字
            $msgElem.html(toTimeStr(chats.time) + '檔案');
        } else if (chats.text.startsWith('<img')) {
            $msgElem.html(toTimeStr(chats.time) + '圖檔');
        } else {
            $msgElem.html(toTimeStr(chats.time) + loadMessageInDisplayClient(chats.text));
        }
        target.attr('data-recentTime', chats.time);

        // update tablnks's last msg
        let $unreadMsgElem = target.find('.unread-msg');
        if (chats.from === SYSTEM || chats.from === CHATSHIER) {
            $unreadMsgElem.html('0').css('display', 'none');
        } else if (currentUnread > 99) {
            $unreadMsgElem.html('99+').css('display', 'block');
        } else {
            $unreadMsgElem.html(currentUnread).css('display', currentUnread ? 'block' : 'none'); // 未讀訊息數顯示出來
        }

        let ele = target.parents('b'); // buttons to b
        ele.remove();
        $('.tablinks-area>#clients').prepend(ele);
    } // end of displayClient
    //=====end chat function=====

    //=====start profile function=====
    function showProfile() {
        $('.nav li.active').removeClass('active');
        $(this).parent().addClass('active');
        $("#infoCanvas #profile").show();
        $("#infoCanvas #todo").hide();
    }

    // function userInfoClick() {
    //     let val = $(this).text(); //抓目前的DATA
    //     let td = $(this).parents('.user-info-td');
    //     td.html('<input class="td-inner" type="text" value="' + val + '"></input>'); //把element改成input，放目前的DATA進去
    //     td.find('input').select(); //自動FOCUS該INPUT
    // }

    function userInfoKeyPress(e) {
        let code = (e.keyCode ? e.keyCode : e.which);
        if (13 === code) {
            $(this).blur(); // 如果按了ENTER就離開此INPUT，觸發on blur事件
        }
    }

    // function userInfoBlur() {
    //     let val = $(this).val() || '尚未輸入'; // 抓INPUT裡的資料
    //     $(this).parent().html('<p class="td-inner">' + val + '</p>'); // 將INPUT元素刪掉，把資料直接放上去
    // }

    function userInfoConfirm() {
        if (confirm('確定要更新對話者的個人資料嗎？')) {
            $('#infoCanvas').scrollTop(0);
            var messagerUiData = {
                custom_tags: []
            };
            var $tds = $(this).parents('.card-group').find('.panel-table tbody td');

            $tds.each(function() {
                var $td = $(this);
                var tagId = $td.parentsUntil('tbody').last().attr('id');

                var alias = $td.attr('alias');
                var setsType = $td.attr('type');
                var setsTypeEnums = api.tag.enums.setsType;

                // 此欄位不允許編輯的話，不處理資料
                if ('true' !== $td.attr('modify')) {
                    return;
                }

                var value = '';
                var $tdDataElem = $td.find('.td-inner');
                switch (setsType) {
                    case setsTypeEnums.NUMBER:
                        value = parseInt($tdDataElem.val(), 10);
                        break;
                    case setsTypeEnums.DATE:
                        value = $tdDataElem.val();
                        value = value ? new Date(value).getTime() : 0;
                        break;
                    case setsTypeEnums.CHECKBOX:
                        value = $tdDataElem.prop('checked');
                        break;
                    case setsTypeEnums.MULTI_SELECT:
                        var checkVals = [];
                        var $checkboxes = $tdDataElem.find('input[type="checkbox"]');
                        $checkboxes.each(function() {
                            checkVals.push($(this).prop('checked'));
                        });
                        value = checkVals;
                        break;
                    case setsTypeEnums.TEXT:
                    case setsTypeEnums.SELECT:
                    default:
                        value = $tdDataElem.val();
                        break;
                }

                if (value !== null && value !== undefined) {
                    if (alias) {
                        messagerUiData[alias] = value;
                    } else {
                        // 沒有別名的屬性代表是自定義的標籤資料
                        // 將資料推入堆疊中
                        messagerUiData.custom_tags.push({
                            tag_id: tagId,
                            value: value
                        });
                    }
                }
            });

            // 如果有可編輯的資料有變更再發出更新請求
            if (Object.keys(messagerUiData).length > 0) {
                var appId = $(this).parents('.card-group').attr('id');
                var msgerId = $(this).parents('.card-group').attr('rel');

                return api.messager.update(appId, msgerId, agentId, messagerUiData).then(function() {
                    // 將成功更新的資料覆蓋前端本地端的全域 app 資料
                    appsData[appId].messagers[msgerId] = Object.assign(appsData[appId].messagers[msgerId], messagerUiData);
                    $.notify('用戶資料更新成功', { type: 'success' });
                }).catch(function() {
                    $.notify('用戶資料更新失敗，請重試', { type: 'danger' });
                });
            }
        }
        return Promise.resolve();
    }
    // =====end profile function=====

    // =====start internal function=====
    function displayMessageInternal(data, roomId) {
        let str;
        let designated_chat_room_msg_time = $("#" + data.roomId + "-content" + "[rel='internal']").find(".message:last").attr('rel');
        if (data.time - designated_chat_room_msg_time >= 900000) { // 如果現在時間多上一筆聊天記錄15分鐘
            $("#" + data.roomId + "-content" + "[rel='internal']").append('<p class="message-day" style="text-align: center"><strong>-新訊息-</strong></p>');
        }
        if (data.agentId == agentId) str = toAgentStr(data.message, data.time);
        else str = toUserStr(data.message, data.time);
        $("#" + data.roomId + "-content" + "[rel='internal']").append(str); //push message into right canvas
        $('#' + data.roomId + '-content' + "[rel='internal']").scrollTop($('#' + data.roomId + '-content' + '[rel="internal"]')[0].scrollHeight); //scroll to down
    } // end of displayMessageInternal

    function displayClientInternal(data, roomId) {
        let target = $('.tablinks-area').find(".tablinks[name='" + data.roomId + "'][rel='internal']");
        if (data.message.startsWith('<a')) { // 判斷客戶傳送的是檔案，貼圖還是文字
            target.find("#msg").html(toTimeStr(data.time) + '檔案'); // 未讀訊息字體變大
        } else if (data.message.startsWith('<img')) {
            target.find("#msg").html(toTimeStr(data.time) + '檔案'); // 未讀訊息字體變大
        } else {
            target.find("#msg").html(toTimeStr(data.time) + loadMessageInDisplayClient(data.message)); // 未讀訊息字體變大
        }
        target.find('.unread-msg').html(data.unRead).css("display", "block"); // 未讀訊息數顯示出來
        target.attr("data-recentTime", data.time);
        // update tablnks's last msg
        target.find('.unread-msg').html(data.unRead).css("display", "none");
        let ele = target.parents('b'); //buttons to b
        ele.remove();
        $('.tablinks-area>#clients').prepend(ele);
    } // end of displayClientInternal
    function groupPhotoChoose() {
        let container = $(this).parents('.photo-container');
        container.find('.photo-ghost').click();
    }

    function groupPhotoUpload() {
        if (0 < this.files.length) {
            let fileContainer = $(this).parents('.photo-container');
            let img = fileContainer.find('img');

            let file = this.files[0];
            let storageRef = firebase.storage().ref();
            let fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function(snapshot) {
                let url = snapshot.downloadURL;
                img.attr('src', url);
            });
        }
    }

    function internalConfirm() {
        let method = $(this).attr('id');
        if (method === "confirm") {
            if (confirm("Are you sure to change profile?")) {
                let cardGroup = $(this).parents('.card-group');
                let roomId = cardGroup.attr('id');
                roomId = roomId.substr(0, roomId.length - 5);
                let photo = cardGroup.find('.photo-choose');
                let data = {
                    roomId: roomId,
                    photo: photo.attr('src')
                };
                let tds = cardGroup.find('.panel-table tbody td');
                tds.each(function() {
                    let prop = $(this).attr('id');
                    let type = $(this).attr('type');
                    let value;
                    if (type === "text") value = $(this).find('.td-inner').text();
                    else if (type === "time") value = $(this).find('.td-inner').val();
                    else if (type === "single-select") value = $(this).find('.td-inner').val();
                    else if (type === "multi-select") value = $(this).find('.multi-select-text').attr('rel');
                    if (!value) value = "";
                    data[prop] = value;
                });
                socket.emit('update internal profile', data);
            }
        }
    }
    //=====end internal function

    //=====start searchBox change func=====
    var $tablinks = [];
    var $panels = [];
    var $clientNameOrTexts = [];
    searchBox.on('keypress', function(e) {
        let count = 0;
        $tablinks = [];
        $panels = [];
        $clientNameOrTexts = [];
        let code = (e.keyCode ? e.keyCode : e.which);
        if (code != 13) return;
        let searchStr = $(this).val().toLowerCase();
        if (searchStr === "") {
            $('#search-right').addClass('invisible');
            displayAll();
            $('.tablinks').each(function() {
                let id = $(this).attr('name');
                let room = $(this).attr('rel');
                let panel = $("div #" + id + "-content[rel='" + room + "']");
                panel.find(".message").each(function() {
                    $(this).find('.content').removeClass('found');
                });
            });
        } else {

            $('.tablinks').each(function() {
                $self = $(this);
                let id = $(this).attr('name');
                let room = $(this).attr('rel');
                let panel = $("div #" + id + "-content[rel='" + room + "']");
                let color = "";
                let display = false;

                // 客戶名單搜尋
                $(this).find('.clientName').each(function() {
                    let text = $(this).text();
                    if (text.toLowerCase().indexOf(searchStr) != -1) {
                        if (0 === count) {
                            $self.trigger('click');
                        }
                        $tablinks.push($self);
                        $panels.push(null);
                        $clientNameOrTexts.push(null);
                        count += 1;
                        $(this).find('.content').addClass('found');
                        display = true;
                    } else {
                        $(this).find('.content').removeClass('found');

                    }
                });
                // 聊天室搜尋
                panel.find(".message").each(function() {
                    let text = $(this).find('.content').text();
                    var $content = $(this).find('.content');
                    if (text.toLowerCase().indexOf(searchStr) != -1) {
                        // displayMessage match的字標黃
                        if (0 === count) {
                            $self.trigger('click');
                            var top = $(this).offset().top;
                            panel.scrollTop(top + SCROLL.HEIGHT);
                        }
                        $tablinks.push($self);
                        $panels.push(panel);
                        $clientNameOrTexts.push($(this));
                        count += 1;
                        $(this).find('.content').addClass('found');
                        // displayClient顯示"找到訊息"並標紅
                        display = true;

                        $('[name="' + id + '"][rel="' + room + '"]').find('#msg').css('color', COLOR.FIND).text("找到訊息");
                    } else {
                        $(this).find('.content').removeClass('found');

                    }
                });

                if (1 <= count) {
                    $('#this-number').html(1);
                    $('#total-number').html(count);
                    $('#search-right').removeClass('invisible');
                    $(this).css('color', color);
                }


                if (display === false) {
                    $(this).css('display', 'none');
                } else {
                    $(this).css('display', 'block');
                }

            });
        }
    });
    $('div.search .glyphicon-chevron-up').on('click', (e) => {
        var i = Number($('#this-number').html());
        var total = Number($('#total-number').html());
        if (Number(i) <= 1) {
            i = total;
        } else {
            i -= 　1;
        }
        var $panel = $panels[(i - 1)];
        var $tablink = $tablinks[(i - 1)];
        $tablink.trigger('click');
        if (null !== $clientNameOrTexts[(i - 1)]) {
            var $clientNameOrText = $clientNameOrTexts[(i - 1)];
            var top = $clientNameOrText.offset().top;
            $panel.scrollTop(top + SCROLL.HEIGHT);
        }
        $('#this-number').html(Number(i));
    });
    $('div.search .glyphicon-chevron-down').on('click', (e) => {
        var i = Number($('#this-number').html());
        var total = Number($('#total-number').html());
        if (Number(i) >= total) {
            i = 1;
        } else {
            i += 　1;
        }
        var $panel = $panels[(i - 1)];
        var $tablink = $tablinks[(i - 1)];
        $tablink.trigger('click');
        if (null !== $clientNameOrTexts[(i - 1)]) {
            var $clientNameOrText = $clientNameOrTexts[(i - 1)];
            var top = $clientNameOrText.offset().top;
            $panel.scrollTop(top + SCROLL.HEIGHT);
        }
        $('#this-number').html(Number(i));

    });

    function displayAll() {
        $('.tablinks').each(function() {
            $(this).css('display', 'block');
            $(this).css('background-color', '');
            $(this).attr('id', '');
            let id = $(this).attr('name');
            let rel = $(this).attr('rel');
            $(this).find('#msg').text($("div #" + id + "-content" + "[rel='" + rel + "']" + " .message:last").find('.content').text().trim()).css('color', 'black');
            $("div #" + id + "-content" + "[rel='" + rel + "']" + " .message").find('.content').css({
                "color": "black",
                "background-color": "#b5e7a0"
            });
            $(this).find('.clientName').css({
                "color": "black",
                "background-color": ""
            });
        });
    } // end of displayAll
    function sortUsers(ref, up_or_down, operate) {
        let arr = $('#clients b');
        for (let i = 0; i < arr.length - 1; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                let a = arr.eq(i).children(".tablinks").attr("data-" + ref) - '0';
                let b = arr.eq(j).children(".tablinks").attr("data-" + ref) - '0';
                if (up_or_down === operate(a, b)) {
                    let tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
        }
        $('#clients').append(arr);
    } //end of sortUsers
    //=====end searchBox change func=====

    //=====start utility function
    function toAgentStr(msg, time) {
        if (msg.startsWith("<a") || msg.startsWith("<img") || msg.startsWith("<audio") || msg.startsWith("<video")) {
            return '<p class="message" rel="' + time + '" style="text-align: right;line-height:250%" title="' + toDateStr(time) + '"><span  class="send-time">' + toTimeStr(time) + '</span><span class="content stikcer">  ' + msg + '</span><strong></strong><br/></p>';
        } else {
            return '<p class="message" rel="' + time + '" style="text-align: right;line-height:250%" title="' + toDateStr(time) + '"><span  class="send-time">' + toTimeStr(time) + '</span><span class="content words">  ' + msg + '</span><strong></strong><br/></p>';
        }
    } // end of toAgentStr
    function toUserStr(msg, time) {
        if (msg.startsWith("<a") || msg.startsWith("<img") || msg.startsWith("<audio") || msg.startsWith("<video")) {
            return '<p style="line-height:250%" class="message" rel="' + time + '" title="' + toDateStr(time) + '"><strong></strong><span class="content sticker">  ' + msg + '</span><span class="send-time">' + toTimeStr(time) + '</span><br/></p>';
        } else {
            return '<p style="line-height:250%" class="message" rel="' + time + '" title="' + toDateStr(time) + '"><strong></strong><span class="content words">  ' + msg + '</span><span class="send-time">' + toTimeStr(time) + '</span><br/></p>';
        }
    } // end of toUserStr
    function lastMsgToStr(msg) {
        if (msg.text.startsWith('<a') || msg.text.startsWith('<video') || msg.text.startsWith('<audio')) {
            return '<br><div id="msg">' + toTimeStr(msg.time) + '客戶傳送檔案</div>';
        } else if (msg.text.startsWith('<img')) {
            return '<br><div id="msg">' + toTimeStr(msg.time) + '客戶傳送圖檔</div>';
        } else {
            return '<br><div id="msg">' + toTimeStr(msg.time) + loadMessageInDisplayClient(msg.text) + '</div>';
        }
    }

    function loadMessageInDisplayClient(msg) {
        if (msg.length > 10) {
            let newMsg = msg.substr(0, 10) + '...';
            return newMsg;
        } else {
            return msg;
        }
    } // end of loadMessageInDisplayClient

    function toDateStr(input) {
        let str = " ";
        let date = new Date(input);
        str += date.getFullYear() + '/' + addZero(date.getMonth() + 1) + '/' + addZero(date.getDate()) + ' ';
        let week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        str += week[date.getDay()] + ' ' + addZero(date.getHours()) + ':' + addZero(date.getMinutes());
        return str;
    } // end of toDateStr

    function toTimeStr(input) {
        let date = new Date(input);
        let dateStr = " (" + addZero(date.getHours()) + ':' + addZero(date.getMinutes()) + ") ";
        return dateStr;
    } // end of toTimeStr

    function toTimeStrMinusQuo(input) {
        let date = new Date(input);
        return addZero(date.getHours()) + ':' + addZero(date.getMinutes());
    } // end of toTimeStrMinusQuo

    function multiSelectChange() {
        let valArr = [];
        let textArr = [];
        let boxes = $(this).find('input');
        boxes.each(function() {
            if ($(this).is(':checked')) {
                valArr.push($(this).val());
                textArr.push($(this).parents('li').text());
            }
        });
        valArr = valArr.join(',');
        if (textArr.length === boxes.length) textArr = "全選";
        else textArr = textArr.join(',');
        $(this).parent().find($('.multi-select-text')).text(textArr).attr('rel', valArr);
    } // end of multiSelectChange

    function addZero(val) {
        return val < 10 ? '0' + val : val;
    } // end of addZero

    // =====end utility function
}); // document ready close
