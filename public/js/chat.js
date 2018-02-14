/// <reference path='../../typings/client/index.d.ts' />

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

var SOCKET_NAMESPACE = '/chatshier';

var userId = '';
var chatroomList = []; // list of all users
var userProfiles = []; // array which store all user's profile
var appsData = {}; // 此變數用來裝所有的 app 資料
var appsMessagersData = {};
var appsChatroomsData = {};
var appsTagsData = {};
var groupsData = {};
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
        var $cardGroup = $('.card-group[app-id="' + appId + '"]');
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
                        '<tr ticket-id="' + ticketId + '" class="ticket-row" data-toggle="modal" data-target="#ticket_info_modal">' +
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
                var messagersData = appsMessagersData[appId].messagers;
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
        var msgerId = $ticketBody.attr('messager-id');

        var $cardGroup = $ticketBody.parentsUntil('#infoCanvas').last();
        var appId = $cardGroup.attr('app-id');

        var ticketId = $(this).attr('ticket-id');
        var ticketData = ticketsData[ticketId];

        var infoInputTable = $('.info-input-table').empty();
        var messagerData = appsMessagersData[appId].messagers[msgerId];

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
            var status = parseInt($addTicketModal.find('#add-form-status option:selected').val(), 10);
            var priority = parseInt($addTicketModal.find('#add-form-priority option:selected').val(), 10);

            var newTicket = {
                createdTime: Date.now(),
                description: description || '',
                dueTime: Date.now() + (86400000 * 3), // 過期時間預設為3天後
                priority: priority,
                messagerId: msgerId,
                status: status,
                updatedTime: Date.now()
            };

            return api.ticket.insert(appId, userId, newTicket).then(function() {
                $.notify('待辦事項已新增', { type: 'success' });
                instance.loadTickets(appId, userId);
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

        var ticketPriority = parseInt(modifyTable.find('th.priority').parent().find('td select').val(), 10);
        var ticketStatus = parseInt(modifyTable.find('th.status').parent().find('td select').val(), 10);
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
        return api.ticket.update(appId, ticketId, userId, modifiedTicket).then(function() {
            $.notify('待辦事項已更新', { type: 'success' });
            instance.loadTickets(appId, userId);
        }).catch(function() {
            $.notify('待辦事項更新失敗，請重試', { type: 'danger' });
        });
    };

    TicketTableCtrl.prototype.deleteTicket = function(appId, ticketId) {
        if (confirm('確認刪除表單？')) {
            return api.ticket.remove(appId, ticketId, userId).then(function() {
                $.notify('待辦事項已刪除', { type: 'success' });
                instance.loadTickets(appId, userId);
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
    userId = window.auth.currentUser.uid;

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

    // 攜帶欲 appId 向伺服器端註冊依據
    // 使伺服器端可以針對特定 app 發送 socket 資料
    var chatshierSocket = io(SOCKET_NAMESPACE);
    chatshierSocket.once('connect', function() {
        bindingSocketEvents(chatshierSocket);
    });

    // start the loading works
    $infoPanel.hide();

    // =====start chat event=====
    $(document).on('click', '.chat-app-item', showChatApp);
    $(document).on('click', '.tablinks', clickUserTablink); // 群組清單裡面選擇客戶
    $(document).on('focus', '#message', readClientMsg); // 已讀客戶訊息
    $(document).on('click', '#submitMsg', submitMessage); // 訊息送出
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
    Promise.all([
        api.groups.getUserGroups(userId),
        api.app.getAll(userId),
        api.chatroom.getAll(userId),
        api.messager.getAll(userId),
        api.tag.getAll(userId)
    ]).then(function(promiseResults) {
        groupsData = promiseResults.shift().data;
        appsData = promiseResults.shift().data;
        appsChatroomsData = promiseResults.shift().data;
        appsMessagersData = promiseResults.shift().data;
        appsTagsData = promiseResults.shift().data;

        // 過濾 API 資料裡已經刪除的 app 資料
        for (var appId in appsData) {
            var appData = appsData[appId];
            if (appData.isDeleted) {
                delete appsData[appId];
                delete appsChatroomsData[appId];
                delete appsMessagersData[appId];
                delete appsTagsData[appId];
                continue;
            }
            chatshierSocket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId);

            // 過濾已經刪除的 chatroom 資料
            for (var chatroomId in appsChatroomsData[appId].chatrooms) {
                var chatroomData = appsChatroomsData[appId].chatrooms[chatroomId];
                if (chatroomData.isDeleted) {
                    delete appsChatroomsData[appId].chatrooms[chatroomId];
                }
            }

            // 過濾已經刪除的 tag 資料
            for (var tagId in appsTagsData[appId].tags) {
                var tagData = appsTagsData[appId].tags[tagId];
                if (tagData.isDeleted) {
                    delete appsTagsData[appId].tags[tagId];
                }
            }
        }
    }).then(function() {
        responseUserAppIds(appsData);
    });
    // #endregion
    // ==========

    // ==========start initialize function========== //

    /**
     * @param {SocketIOClient.Socket} socket
     */
    function bindingSocketEvents(socket) {
        (function keepConnection() {
            return new Promise(function(resolve) {
                socket.once(SOCKET_EVENTS.DISCONNECT, resolve);
            }).then(function() {
                console.info('=== chatroom disconnected ===');
                socket.once(SOCKET_EVENTS.RECONNECT, function() {
                    console.info('=== chatroom reconnected ===');
                    for (let appId in appsData) {
                        socket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId);
                    }
                    return keepConnection();
                });
            });
        })();

        socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, function(data) {
            /** @type {ChatshierChatSocketInterface} */
            var socketBody = data;

            var appId = socketBody.appId;
            var appName = appsData[appId].name;
            var chatroomId = socketBody.chatroomId;
            var messagerId = socketBody.messagerId;
            var message = socketBody.message;

            // 如果是 LINE 的訊息，要根據 LINE 平台的訊息格式轉換資料
            if (LINE === socketBody.appType) {
                switch (message.type) {
                    case 'text':
                        break;
                    case 'image':
                        var imageUrl = message.src;
                        message.text = '<img src="' + imageUrl + '" style="width: 100%; max-width: 500px;" />';
                        break;
                    case 'audio':
                        var audioUrl = message.src;
                        message.text = '<audio controls><source src="' + audioUrl + '" type="audio/mp4"></audio>';
                        break;
                    case 'video':
                        var videoUrl = message.src;
                        message.text = '<video controls><source src="' + videoUrl + '" type="video/mp4"></video>';
                        break;
                    case 'sticker':
                        var stickerUrl = message.src;
                        message.text = '<img src="' + stickerUrl + '" style="width: 100%; max-width: 200px;" />';
                        break;
                    case 'location':
                        var locationUrl = message.src;
                        message.text = '<a target="_blank" href="' + locationUrl + '">location</a>';
                        break;
                }
            }

            return Promise.resolve().then(function() {
                var _messager = appsMessagersData[appId].messagers[messagerId];
                if (_messager) {
                    _messager.unRead++;
                    return _messager;
                }

                // 如果此 messager 沒有在清單內，代表可能是在聊天過程中，中途加入群組的
                // 因此拿著此 messgerId 向 server 查詢此人資料
                // 查詢完後儲存至本地端，下次就無需再查詢
                return api.messager.getOne(appId, messagerId, userId).then(function(resJson) {
                    let _appsMessagersData = resJson.data;
                    _messager = _appsMessagersData[appId].messagers[messagerId];
                    appsMessagersData[appId].messagers[messagerId] = _messager;
                    return _messager;
                });
            }).then(function(messager) {
                displayMessage(messager, message, chatroomId, appId); // update 聊天室
                displayClient(messager, message, chatroomId, appId, appName); // update 客戶清單
                displayInfo(messager, message, chatroomId, appId);
                if (-1 === chatroomList.indexOf(chatroomId + appId)) {
                    chatroomList.push(chatroomId + appId);
                }
            });
        });

        socket.on(SOCKET_EVENTS.UPDATE_MESSAGER_TO_CLIENT, function(data) {
            var appId = data.appId;
            var msgerId = data.messageId;
            var messager = data.messager;
            appsMessagersData[appId].messagers[msgerId] = messager;

            // 更新 UI 資料
            var $profileCard = $('.card-group[app-id="' + appId + '"][messager-id="' + msgerId + '"]');
            $profileCard.find('.panel-table').remove();
            var newProfileNode = $.parseHTML(loadPanelProfile(appId, messager));
            $(newProfileNode.shift()).appendTo($profileCard.find('.photo-container'));
        });
    }

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
            var appData = appsData[appId];

            var buildHtml = function(type, imgSrc) {
                var html =
                    '<div class="chat-app-item" app-type="' + type + '" open="true" data-toggle="tooltip" data-placement="right" title="' + appData.name + '" rel="' + appId + '">' +
                        '<img class="software-icon" src="' + imgSrc + '">' +
                        '<div class="unread-count"></div>' +
                    '</div>';
                return html;
            };

            var appItem = '';
            switch (appData.type) {
                case LINE:
                    appItem = buildHtml(appData.type, 'http://informatiekunde.dilia.be/sites/default/files/uploads/logo-line.png');
                    break;
                case FACEBOOK:
                    appItem = buildHtml(appData.type, 'https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png');
                    break;
            }
            $chatApp.prepend(appItem);
        }
    }

    function responseChatData(apps) {
        for (var appId in apps) {
            var appMessagersData = appsMessagersData[appId];
            var appName = apps[appId].name;
            var appType = apps[appId].type;

            // 計算每個聊天室內有多少 messager
            var chatroomMessagers = {};
            for (var msgerId in appMessagersData.messagers) {
                var msgerChatroomId = appMessagersData.messagers[msgerId].chatroom_id;
                if (!chatroomMessagers[msgerChatroomId]) {
                    chatroomMessagers[msgerChatroomId] = [];
                }
                chatroomMessagers[msgerChatroomId].push(msgerId);
            }

            for (var chatroomId in chatroomMessagers) {
                var requireData = {
                    appId: appId,
                    name: appName,
                    type: appType,
                    chatroom: appsChatroomsData[appId].chatrooms[chatroomId] || {},
                    chatroomId: chatroomId
                };

                switch (appType) {
                    // 由於屬於特定平台 app 的 messager 只會有一位
                    // 因此陣列裡只會有一個
                    case LINE:
                    case FACEBOOK:
                        var _msgerId = chatroomMessagers[chatroomId].shift();
                        var messager = appsMessagersData[appId].messagers[_msgerId];
                        requireData.profile = messager;
                        requireData.userId = userId;
                        requireData.messagerId = _msgerId;

                        createChatroom(requireData);
                        createProfilePanel(requireData);
                        break;
                    // Profile UI 部分改顯示為聊天室資訊而非對話者的資訊
                    default:
                        requireData.profile = {
                            name: apps[appId].name,
                            photo: '/image/group-icon.png'
                        };
                        requireData.messagerId = requireData.userId = userId;
                        createChatroom(requireData);
                        // createProfilePanel(requireData);
                        break;
                }
            }
        }
    }

    function responseHistoryMsg(data) {
        var msgContent = $('#' + data.userId + '-content' + '[rel="' + data.channelId + '"]');
        var originHeight = msgContent[0].scrollHeight;
        msgContent.find('.message:first').remove();
        msgContent.find('.message-day:lt(3)').remove();
        msgContent.prepend(historyMsgToStr(data.messages));
        var nowHeight = msgContent[0].scrollHeight;
        msgContent.animate({
            scrollTop: nowHeight - originHeight
        }, 0);
        if (msgContent.attr('data-position') > 0) msgContent.prepend(LOADING_MSG_AND_ICON);
        else msgContent.prepend(NO_HISTORY_MSG);
    }

    function createChatroom(requireData) {
        var profile = requireData.profile;
        var appName = requireData.name;
        var appType = requireData.type;
        chatroomList.push(requireData.appId + requireData.chatroomId); // make a name list of all chated user
        userProfiles[requireData.appId] = profile;

        if (!(requireData && requireData.chatroom)) {
            return;
        }

        var historyMsg = requireData.chatroom.messages || {};
        var historyMsgKeys = Object.keys(historyMsg);
        var historyMsgStr = '';
        if (historyMsgKeys.length < 10) {
            historyMsgStr += NO_HISTORY_MSG; // history message string head
        }
        historyMsgStr += historyMsgToStr(historyMsg);
        $('#user-rooms').append('<option value="' + requireData.chatroomId + '">' + profile.name + '</option>'); // new a option in select bar

        // 左邊的客戶清單排列
        var lastMsg = historyMsg[historyMsgKeys[historyMsgKeys.length - 1]];
        var lastMsgStr = lastMsgToStr(lastMsg);

        var buildHtml = function(imgSrc) {
            var unReadStr = profile.unRead > 99 ? '99+' : '' + profile.unRead;
            var html =
                '<button class="tablinks"' + 'app-id="' + requireData.appId + '" chatroom-id="' + requireData.chatroomId + '" app-type="' + appType + '">' +
                    '<div class="img-holder">' +
                        '<img src="' + profile.photo + '" alt="無法顯示相片" />' +
                        '<img class="small-software-icon" src="' + imgSrc + '">' +
                    '</div>' +
                    '<div class="msg-holder">' +
                        '<b><span class="clientName">' + profile.name + '</span>' + lastMsgStr + '</b>' +
                    '</div>' +
                    '<div class="appName"><snap>' + appName + '</snap></div>' +
                    '<div class="chsr unread-msg badge badge-pill' + (!profile.unRead ? ' hide' : '') + '">' + unReadStr + '</div>' +
                '</button>' +
                '<hr/>';
            return html;
        };

        var tablinkHtml = '';
        switch (appType) {
            case LINE:
                tablinkHtml = buildHtml('http://informatiekunde.dilia.be/sites/default/files/uploads/logo-line.png');
                break;
            case FACEBOOK:
                tablinkHtml = buildHtml('https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png');
                break;
            case CHATSHIER:
                tablinkHtml = buildHtml('/image/logo.png');
                break;
        }
        $('#clients').append(tablinkHtml);

        // if (typeof(profile.VIP等級) === "string" && profile.VIP等級 !== "未選擇") {
        //     $('#vip_list').prepend(tablinkHtml);
        // } else {
        //     $('#clients').append(tablinkHtml);
        // }

        // 中間聊天室
        canvas.append(
            '<div app-id="' + requireData.appId + '" chatroom-id="' + requireData.chatroomId + '" class="tabcontent">' +
                '<div class="messagePanel">' + historyMsgStr + '</div>' +
            '</div>'
        );

        // if (data.position != 0) $('#' + data.appId + '-content' + '[rel="' + data.chatroomId + '"]').on('scroll', function() {
        //     detecetScrollTop($(this));
        // });
    }

    function historyMsgToStr(messages) {
        var returnStr = '';
        var nowDateStr = '';
        var prevTime = 0;

        for (var i in messages) {
            if (!messages[i].text) {
                switch (messages[i].type) {
                    case 'image':
                        var imageUrl = messages[i].src;
                        messages[i].text = '<img src="' + imageUrl + '" style="width: 100%; max-width: 500px;" />';
                        break;
                    case 'audio':
                        var audioUrl = messages[i].src;
                        messages[i].text = '<audio controls><source src="' + audioUrl + '" type="audio/mp4"></audio>';
                        break;
                    case 'video':
                        var videoUrl = messages[i].src;
                        messages[i].text = '<video controls><source src="' + videoUrl + '" type="video/mp4"></video>';
                        break;
                    case 'sticker':
                        var stickerUrl = messages[i].src;
                        messages[i].text = '<img src="' + stickerUrl + '" style="width: 100%; max-width: 200px;" />';
                        break;
                    case 'location':
                        var locationUrl = messages[i].src;
                        messages[i].text = '<a target="_blank" href="' + locationUrl + '">location</a>';
                        break;
                }
            }
            // this loop plus date info into history message, like "----Thu Aug 01 2017----"
            var d = new Date(messages[i].time).toDateString(); // get msg's date
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
                returnStr += generateMessageHtml(messages[i].text, messages[i].time, true);
            } else {
                returnStr += generateMessageHtml(messages[i].text, messages[i].time, false);
            }
        }
        return returnStr;
    } // end of historyMsgToStr

    function createProfilePanel(requireData) {
        var messager = requireData.profile;

        infoCanvas.append(
            '<div class="card-group" app-id="' + requireData.appId + '" user-id="' + requireData.userId + '" messager-id="' + requireData.messagerId + '">' +
                '<div class="card-body table-responsive" id="profile">' +
                    '<div class="photo-container">' +
                        '<img src="' + messager.photo + '" alt="無法顯示相片" style="width:128px;height:128px;" />' +
                    '</div>' +
                    loadPanelProfile(requireData.appId, messager) +
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
                                        '<input type="text" class="ticket-search-bar" placeholder="搜尋" />' +
                                    '</th>' +
                                    '<th>' +
                                        '<a class="modal-toggler" messager-id="' + requireData.messagerId + '" data-toggle="modal" data-target="#add-ticket-modal">' +
                                            '<span class="fa fa-plus fa-fw"></span>新增待辦' +
                                        '</a>' +
                                    '</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody class="ticket-body" messager-id="' + requireData.messagerId + '"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }

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
        var tagKeys = Object.keys(appsTagsData[appId].tags);
        tagKeys.sort(function(a, b) {
            return appsTagsData[appId].tags[a].order - appsTagsData[appId].tags[b].order;
        });

        var messagerProfileHtml = '';
        for (var i in tagKeys) {
            var tagId = tagKeys[i];
            var tagData = appsTagsData[appId].tags[tagId];
            messagerProfileHtml +=
                '<tr id="' + tagId + '">' +
                    '<th class="user-info-th" alias="' + tagData.alias + '">' + (transJson[tagData.text] || tagData.text) + '</th>' +
                    tdHtmlBuilder(tagId, tagData) +
                '</tr>';
        }
        $(table).append(messagerProfileHtml);
        return $(table)[0].outerHTML;
    }

    // ==========end initialize function========== //

    // =====start chat function=====
    function showChatApp() {
        var selectRel = $(this).attr('rel');
        var $tablinksArea = $('#user .tablinks-area');
        var $allTablinks = $tablinksArea.find('.tablinks');
        var str = '';

        if ('all' === selectRel) {
            $allTablinks.show();
        } else if ('group' === selectRel) {
            $allTablinks.hide();
            $tablinksArea.find('.tablinks[app-type="' + CHATSHIER + '"]').show();
        } else if ('unread' === selectRel) {
            $tablinksArea.find('.unread-msg').each(function() {
                var $unReadElem = $(this);
                var $tablinkWrapper = $unReadElem.parentsUntil('.list-group').last();

                if (!parseInt($unReadElem.text(), 10)) {
                    $tablinkWrapper.hide();
                } else {
                    $tablinkWrapper.show();
                }
            });
        } else if ('assigned' === selectRel) {
            $allTablinks.hide();
            $('.td-inner .multi-button .multi-select-text').each(function(index, el) {
                str = $(this).attr('rel').split(',');
                var rel = (1 === str.length && !str[0]) ? $(this).attr('rel') : str;
                if (rel !== '') {
                    var id = $(this).parent().parent().parent().parent().parent().parent().parent().parent().attr('id');
                    var newId = id.substring(0, id.indexOf('-'));
                    $tablinksArea.find('.tablinks[app-id="' + newId + '"]').show();
                }
            });
        } else if ('unassigned' === selectRel) {
            $allTablinks.hide();
            $('.td-inner .multi-button .multi-select-text').each(function(index, el) {
                str = $(this).attr('rel').split(',');
                var rel = (1 === str.length && !str[0]) ? $(this).attr('rel') : str;
                if (!rel) {
                    var id = $(this).parent().parent().parent().parent().parent().parent().parent().parent().attr('id');
                    var newId = id.substring(0, id.indexOf('-'));
                    $tablinksArea.find('.tablinks[app-id="' + newId + '"]').show();
                }
            });
        } else {
            $allTablinks.hide();
            $tablinksArea.find('.tablinks[app-id="' + selectRel + '"]').show();
        }
    }

    function clickUserTablink() {
        var $userTablink = $(this);
        var $ticketTodoPanel = $('#show_todo');
        var $messageInputPanel = $('#send-message');

        var appId = $userTablink.attr('app-id');
        var chatroomId = $userTablink.attr('chatroom-id');
        var appType = $userTablink.attr('app-type');

        $('.tablinks.selected').removeClass('selected').css('background-color', '');
        $userTablink.addClass('selected').css('background-color', COLOR.CLICKED);

        ticketTableCtrl.loadTickets(appId, userId);

        var $unReadElem = $userTablink.find('.unread-msg');
        if (parseInt($unReadElem.text(), 10)) {
            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                appType: appsData[appId].type,
                chatroomId: chatroomId,
                userId: userId
            });

            for (let messagerId in appsMessagersData[appId].messagers) {
                appsMessagersData[appId].messagers[messagerId].unRead = 0;
            }

            // 如果有未讀的話，將未讀數設為0之後，把未讀的區塊隱藏
            $userTablink.find('#msg').css('font-weight', 'normal'); // 取消未讀粗體
            $unReadElem.text('0').hide();
        }

        var clientName = $(this).find('.clientName').text();
        $('#prof-nick').text(clientName);
        $('#user-rooms').val(appId);

        // 將聊天室訊息面板顯示，並將 scroll 滑至最下方
        var $messageWrapper = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $messagePanel = $messageWrapper.find('.messagePanel');
        var $profilePanel = $('.card-group[app-id="' + appId + '"]');
        $messageWrapper.show().siblings().hide();
        $messagePanel.scrollTop($messagePanel.prop('scrollHeight'));
        $profilePanel.show().siblings().hide();

        $messageInputPanel.show();
        if (CHATSHIER === appType) {
            $infoPanel.hide();
            $ticketTodoPanel.hide();
        } else {
            $infoPanel.show();
            $ticketTodoPanel.show();
        }
    }

    function detecetScrollTop(ele) {
        if (ele.scrollTop() === 0) {
            var tail = parseInt(ele.attr('data-position'), 10);
            var head = parseInt(ele.attr('data-position'), 10) - 20;
            if (head < 0) head = 0;
            var request = {
                userId: ele.parent().attr('id'),
                channelId: ele.parent().attr('rel'),
                head: head,
                tail: tail
            };
            if (head === 0) ele.off('scroll');
            ele.attr('data-position', head);
            chatshierSocket.emit('upload history msg from front', request, responseHistoryMsg);
        }
    } // end of detecetScrollTop

    function readClientMsg() {
        var $tablinksSelected = $('.tablinks.selected');
        var $unReadElem = $tablinksSelected.find('.unread-msg');

        if (parseInt($unReadElem.text(), 10)) {
            var appId = $tablinksSelected.attr('app-id');
            var chatroomId = $tablinksSelected.attr('chatroom-id');

            $unReadElem.text('0').hide();
            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                appType: appsData[appId].type,
                chatroomId: chatroomId,
                userId: userId
            });
        }
    }

    function submitMessage(ev) {
        ev.preventDefault();
        var $evElem = $(ev.target);
        var $messageView = $evElem.parentsUntil('#chat-content-panel').siblings('#canvas').find('.tabcontent');

        var appId = $messageView.attr('app-id');
        var appType = appsData[appId].type;
        var chatroomId = $messageView.attr('chatroom-id');
        var msgText = messageInput.val();

        if (!(appId && chatroomId && msgText)) {
            return;
        }

        /** @type {ChatshierMessageInterface} */
        var messageToSend = {
            from: CHATSHIER,
            time: Date.now(),
            text: msgText,
            type: 'text',
            messager_id: userId
        };

        /** @type {ChatshierChatSocketInterface} */
        var chatSocketData = {
            appId: appId,
            appType: appType,
            chatroomId: chatroomId,
            messagerId: userId,
            message: messageToSend
        };

        switch (appType) {
            case LINE:
            case FACEBOOK:
                // 從目前所有的 messager 中找尋唯一的 messagerId
                for (var messagerId in appsMessagersData[appId].messagers) {
                    var _messager = appsMessagersData[appId].messagers[messagerId];
                    if (_messager.chatroom_id === chatroomId) {
                        chatSocketData.messagerId = messagerId;
                        break;
                    }
                }
                break;
            default:
                break;
        }

        chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, chatSocketData);
        messageInput.val('');
    }

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
            var proceed = Promise.resolve();
            var file = this.files[0];
            var self = this;
            var storageRef = firebase.storage().ref();
            var fileRef = storageRef.child(file.lastModified + '_' + file.name);
            var apps;
            proceed.then(function() {
                return database.ref('apps/' + appId).once('value');
            }).then(function(snap) {
                apps = snap.val();
                return new Promise(function(resolve, reject) {
                    resolve();
                });
            }).then(function() {
                return fileRef.put(file);
            }).then(function(snapshot) {
                var src = snapshot.downloadURL;
                var msgType = $(self).data('type');
                return new Promise(function(resolve, reject) {
                    formatUrl(msgType, src, function(msg) {
                        var appType = 'string' === typeof userId && userId.startsWith('U') ? LINE : FACEBOOK;
                        var str = generateMessageHtml(msg, Date.now(), true);
                        $('#' + appId + '-content' + "[rel='" + userId + "']").append(str);
                        $('#' + appId + '-content' + "[rel='" + userId + "']").scrollTop($('#' + appId + '-content' + '[rel="' + userId + '"]')[0].scrollHeight);
                        $('[name="' + appId + '"][rel="' + userId + '"] #msg').html(toTimeStr(Date.now()) + loadMessageInDisplayClient(msg));
                        messageInput.val('');
                        var data = Object.assign(apps, {
                            msg: '',
                            src: src,
                            msgType: msgType,
                            type: appType,
                            msgTime: Date.now()
                        });
                        resolve(data);
                    });
                });
            }).then(function(data) {
                chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, { appId, userId, data });
            });
        }
    }

    function formatUrl(type, url, callback) {
        var msg;
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
        var chats = message;
        if (-1 === chatroomList.indexOf(appId + userId)) {
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
                                        '<th>' +
                                            '<input type="text" class="ticket-search-bar" value="" placeholder="搜尋"/>' +
                                        '</th>' +
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

    function displayMessage(messager, message, chatroomId, appId) {
        /** @type {ChatshierMessageInterface} */
        var _message = message;
        var $messagePanel = $('[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .messagePanel');
        var isUserSelf = _message.from === CHATSHIER && _message.messager_id === userId;

        if (chatroomList.indexOf(appId + chatroomId) >= 0) {
            // if its chated user
            var lastMessageTime = parseInt($messagePanel.find('.message:last').attr('rel'), 10);

            // 如果現在時間比上一筆聊天記錄多15分鐘的話，將視為新訊息
            if (_message.time - lastMessageTime >= 900000) {
                $messagePanel.append('<p class="message-day"><strong>-新訊息-</strong></p>');
            }

            var messageHtml = generateMessageHtml(_message.text, _message.time, isUserSelf);
            $messagePanel.append(messageHtml);
            $messagePanel.scrollTop($messagePanel.prop('scrollHeight'));
        } else {
            // if its new user
            var historyMsgStr = NO_HISTORY_MSG;
            historyMsgStr += generateMessageHtml(_message.text, _message.time, isUserSelf);

            canvas.append(
                '<div class="tabcontent" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                    '<div class="messagePanel">' +
                        historyMsgStr +
                    '</div>' +
                '</div>'
            );

            $('#user-rooms').append(
                '<option value="' + appId + '">' + _message.name + '</option>'
            );
        }
    }

    function displayClient(messager, message, chatroomId, appId, appName) {
        /** @type {ChatshierMessageInterface} */
        var _message = message;
        var tablinkHtml;

        if (chatroomList.indexOf(appId + chatroomId) < 0) {
            var buildHtml = function(imgSrc) {
                var html =
                    '<button class="tablinks"' + 'app-id="' + appId + '" chatroom-id="' + chatroomId + '" app-type="' + _message.from + '">' +
                        '<div class="img-holder">' +
                            '<img src="' + messager.photo + '" alt="無法顯示相片" />' +
                            '<img class="small-software-icon" src="' + imgSrc + '">' +
                        '</div>' +
                        '<div class="msg-holder">' +
                            '<b><span class="clientName">' + messager.name + '</span></b>' +
                        '</div>' +
                        '<div class="appName"><snap>' + appName + '</snap></div>' +
                        '<div class="chsr unread-msg badge badge-pill">0</div>' +
                    '</button>' +
                    '<hr/>';
                return html;
            };

            switch (message.from) {
                case LINE:
                    tablinkHtml = buildHtml('http://informatiekunde.dilia.be/sites/default/files/uploads/logo-line.png');
                    break;
                case FACEBOOK:
                    tablinkHtml = buildHtml('https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png');
                    break;
            }
            $('.tablinks-area #new-user-list').prepend(tablinkHtml);
        }
        var $selectedTablinks = $('.tablinks-area').find(".tablinks[app-id='" + appId + "'][chatroom-id='" + chatroomId + "']");
        var $msgElem = $selectedTablinks.find('#msg');
        var currentUnread = messager.unRead;

        // 判斷客戶傳送的是檔案，貼圖還是文字
        if (_message.text.startsWith('<a') || _message.text.startsWith('<audio') || _message.text.startsWith('<video')) {
            $msgElem.html(toTimeStr(_message.time) + '檔案');
        } else if (_message.text.startsWith('<img')) {
            $msgElem.html(toTimeStr(_message.time) + '圖檔');
        } else {
            $msgElem.html(toTimeStr(_message.time) + loadMessageInDisplayClient(_message.text));
        }
        $selectedTablinks.attr('data-recent-time', _message.time);

        // update tablnks's last msg
        var $unreadMsgElem = $selectedTablinks.find('.unread-msg');
        if (currentUnread > 99) {
            $unreadMsgElem.html('99+').css('display', 'block');
        } else {
            $unreadMsgElem.html(currentUnread).css('display', currentUnread ? 'block' : 'none'); // 未讀訊息數顯示出來
        }

        var ele = $selectedTablinks.parents('b'); // buttons to b
        ele.remove();
        $('.tablinks-area>#clients').prepend(ele);
    }
    // =====end chat function=====

    // =====start profile function=====
    function showProfile() {
        $('.nav li.active').removeClass('active');
        $(this).parent().addClass('active');
        $("#infoCanvas #profile").show();
        $("#infoCanvas #todo").hide();
    }

    // function userInfoClick() {
    //     var val = $(this).text(); //抓目前的DATA
    //     var td = $(this).parents('.user-info-td');
    //     td.html('<input class="td-inner" type="text" value="' + val + '"></input>'); //把element改成input，放目前的DATA進去
    //     td.find('input').select(); //自動FOCUS該INPUT
    // }

    function userInfoKeyPress(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if (13 === code) {
            $(this).blur(); // 如果按了ENTER就離開此INPUT，觸發on blur事件
        }
    }

    // function userInfoBlur() {
    //     var val = $(this).val() || '尚未輸入'; // 抓INPUT裡的資料
    //     $(this).parent().html('<p class="td-inner">' + val + '</p>'); // 將INPUT元素刪掉，把資料直接放上去
    // }

    function userInfoConfirm() {
        if (!confirm('確定要更新對話者的個人資料嗎？')) {
            return Promise.resolve();
        }

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

        var phoneRule = /^0\d{9,}$/;
        var emailRule = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>().,;\s@"]+\.{0,1})+[^<>().,;:\s@"]{2,})$/;

        if (messagerUiData.email !== '' && !emailRule.test(messagerUiData.email)) {
            $.notify('電子郵件不符合格式', { type: 'warning' });
            return Promise.resolve();
        } else if (messagerUiData.phone !== '' && !phoneRule.test(messagerUiData.phone)) {
            $.notify('電話號碼不符合格式', { type: 'warning' });
            return Promise.resolve();
        }

        // 如果有可編輯的資料有變更再發出更新請求
        if (Object.keys(messagerUiData).length > 0) {
            var $messagerCard = $(this).parents('.card-group');
            var appId = $messagerCard.attr('app-id');
            var msgerId = $messagerCard.attr('messager-id');

            var socketRequest = {
                userid: userId,
                appid: appId,
                messagerid: msgerId,
                body: messagerUiData
            };

            chatshierSocket.emit(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, socketRequest);

            // 將成功更新的資料覆蓋前端本地端的全域 app 資料
            appsMessagersData[appId].messagers[msgerId] = Object.assign(appsMessagersData[appId].messagers[msgerId], messagerUiData);
            $.notify('用戶資料更新成功', { type: 'success' });
        }
    }
    // =====end profile function=====

    // =====start internal function=====
    function groupPhotoChoose() {
        var container = $(this).parents('.photo-container');
        container.find('.photo-ghost').click();
    }

    function groupPhotoUpload() {
        if (0 < this.files.length) {
            var fileContainer = $(this).parents('.photo-container');
            var img = fileContainer.find('img');

            var file = this.files[0];
            var storageRef = firebase.storage().ref();
            var fileRef = storageRef.child(file.lastModified + '_' + file.name);
            fileRef.put(file).then(function(snapshot) {
                var url = snapshot.downloadURL;
                img.attr('src', url);
            });
        }
    }

    function internalConfirm() {
        var method = $(this).attr('id');
        if (method === "confirm") {
            if (confirm("Are you sure to change profile?")) {
                var cardGroup = $(this).parents('.card-group');
                var roomId = cardGroup.attr('id');
                roomId = roomId.substr(0, roomId.length - 5);
                var photo = cardGroup.find('.photo-choose');
                var data = {
                    roomId: roomId,
                    photo: photo.attr('src')
                };
                var tds = cardGroup.find('.panel-table tbody td');
                tds.each(function() {
                    var prop = $(this).attr('id');
                    var type = $(this).attr('type');
                    var value;
                    if (type === "text") value = $(this).find('.td-inner').text();
                    else if (type === "time") value = $(this).find('.td-inner').val();
                    else if (type === "single-select") value = $(this).find('.td-inner').val();
                    else if (type === "multi-select") value = $(this).find('.multi-select-text').attr('rel');
                    if (!value) value = "";
                    data[prop] = value;
                });
                chatshierSocket.emit('update internal profile', data);
            }
        }
    }
    // =====end internal function

    // =====start searchBox change func=====
    var $tablinks = [];
    var $panels = [];
    var $clientNameOrTexts = [];
    searchBox.on('keypress', function(e) {
        var count = 0;
        $tablinks = [];
        $panels = [];
        $clientNameOrTexts = [];
        var code = (e.keyCode ? e.keyCode : e.which);
        if (code != 13) return;
        var searchStr = $(this).val().toLowerCase();
        if (searchStr === "") {
            $('#search-right').addClass('invisible');
            displayAll();
            $('.tablinks').each(function() {
                var id = $(this).attr('name');
                var room = $(this).attr('rel');
                var panel = $("div #" + id + "-content[rel='" + room + "']");
                panel.find(".message").each(function() {
                    $(this).find('.content').removeClass('found');
                });
            });
        } else {

            $('.tablinks').each(function() {
                $self = $(this);
                var id = $(this).attr('name');
                var room = $(this).attr('rel');
                var panel = $("div #" + id + "-content[rel='" + room + "']");
                var color = "";
                var display = false;

                // 客戶名單搜尋
                $(this).find('.clientName').each(function() {
                    var text = $(this).text();
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
                    var text = $(this).find('.content').text();
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
    $('div.search .glyphicon-chevron-up').on('click', function(e) {
        var i = Number($('#this-number').html());
        var total = Number($('#total-number').html());
        if (Number(i) <= 1) {
            i = total;
        } else {
            i -= 1;
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
    $('div.search .glyphicon-chevron-down').on('click', function(e) {
        var i = Number($('#this-number').html());
        var total = Number($('#total-number').html());
        if (Number(i) >= total) {
            i = 1;
        } else {
            i += 1;
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
            var id = $(this).attr('name');
            var rel = $(this).attr('rel');
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
        var arr = $('#clients b');
        for (var i = 0; i < arr.length - 1; i++) {
            for (var j = i + 1; j < arr.length; j++) {
                var a = arr.eq(i).children(".tablinks").attr("data-" + ref) - '0';
                var b = arr.eq(j).children(".tablinks").attr("data-" + ref) - '0';
                if (up_or_down === operate(a, b)) {
                    var tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
        }
        $('#clients').append(arr);
    } // end of sortUsers
    // =====end searchBox change func=====

    // =====start utility function

    function generateMessageHtml(msg, time, isUserSelf) {
        var isMedia = msg.startsWith('<a') || msg.startsWith('<img') || msg.startsWith('<audio') || msg.startsWith('<video');

        // 如果訊息是來自於當前使用者則放置於右邊
        // 如果訊息是來自於其他 messager 的話，訊息預設放在左邊
        return '<div class="message" rel="' + time + '" title="' + toDateStr(time) + '">' +
            // '<div class="messager-name' + (isUserSelf ? ' text-right' : '') + '">' +
            //     '<span>' + 'My Name' + '</span>' +
            // '</div>' +
            '<span class="message-group ' + (isUserSelf ? ' align-right' : '') + '">' +
                '<span class="content ' + (isMedia ? 'stikcer' : 'words') + '">' + msg + '</span>' +
                '<span class="send-time">' + toTimeStr(time) + '</span>' +
                '<strong></strong>' +
            '</span>' +
            '<br/>' +
        '</div>';
    }

    function lastMsgToStr(msg) {
        if (!(msg && msg.text)) {
            return '';
        } else if (msg.text.startsWith('<a') || msg.text.startsWith('<video') || msg.text.startsWith('<audio')) {
            return '<br><div id="msg">' + toTimeStr(msg.time) + '客戶傳送檔案</div>';
        } else if (msg.text.startsWith('<img')) {
            return '<br><div id="msg">' + toTimeStr(msg.time) + '客戶傳送圖檔</div>';
        } else {
            return '<br><div id="msg">' + toTimeStr(msg.time) + loadMessageInDisplayClient(msg.text) + '</div>';
        }
    }

    function loadMessageInDisplayClient(msg) {
        if (msg.length > 10) {
            var newMsg = msg.substr(0, 10) + '...';
            return newMsg;
        } else {
            return msg;
        }
    } // end of loadMessageInDisplayClient

    function toDateStr(input) {
        var str = " ";
        var date = new Date(input);
        str += date.getFullYear() + '/' + addZero(date.getMonth() + 1) + '/' + addZero(date.getDate()) + ' ';
        var week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        str += week[date.getDay()] + ' ' + addZero(date.getHours()) + ':' + addZero(date.getMinutes());
        return str;
    } // end of toDateStr

    function toTimeStr(input) {
        var date = new Date(input);
        var dateStr = " (" + addZero(date.getHours()) + ':' + addZero(date.getMinutes()) + ") ";
        return dateStr;
    } // end of toTimeStr

    function toTimeStrMinusQuo(input) {
        var date = new Date(input);
        return addZero(date.getHours()) + ':' + addZero(date.getMinutes());
    } // end of toTimeStrMinusQuo

    function multiSelectChange() {
        var valArr = [];
        var textArr = [];
        var boxes = $(this).find('input');
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
