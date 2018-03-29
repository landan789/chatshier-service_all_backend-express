/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var LOADING_MSG_AND_ICON = '<p class="message-day"><strong><i>' + 'Loading History Messages...' + '</i></strong><span class="loadingIcon"></span></p>';
    var NO_HISTORY_MSG = '<p class="message-day"><strong><i>' + '-沒有更舊的歷史訊息-' + '</i></strong></p>';
    var COLOR = {
        FIND: '#ff0000',
        CLICKED: '#ccc',
        FINDBACK: '#ffff00'
    };

    var CHATSHIER = 'CHATSHIER';
    var SYSTEM = 'SYSTEM';
    var LINE = 'LINE';
    var FACEBOOK = 'FACEBOOK';
    var WECHAT = 'WECHAT';

    var LINE_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg';
    var FACEBOOK_LOGO = 'https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png';
    var WECHAT_LOGO = 'https://cdn.worldvectorlogo.com/logos/wechat.svg';

    var SOCKET_NAMESPACE = '/chatshier';

    var api = window.restfulAPI;

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    var chatroomList = [];
    var apps = {}; // 此變數用來裝所有的 app 資料
    var appsMessagers = {};
    var appsChatrooms = {};
    var appsFields = {};
    var appsAgents = {};
    var groups = {};
    var groupsUsers = {};

    // selectors
    var $infoPanel = $('#infoPanel');
    var messageInput = $('#message'); // 訊息欄
    var canvas = $('#canvas'); // 聊天室空間
    var infoCanvas = $('#infoCanvas'); // 個人資料空間
    var ocClickShow = $('.on-click-show');

    var transJson = {};
    window.translate.ready.then(function(json) {
        transJson = Object.assign(transJson, json);
    });

    // wechat 的預設表情符號並不是依照 unicode 編碼，傳過來的訊息是依照 wechat 自家的特殊符號編碼而定
    // 因此要解析 wechat 的表情符號必須進行轉換
    // 1. 使用正規表達式檢測文字內是否含有 wechat 的表情符號
    // 2. 將 wechat 表情符號的編碼根據對照表進行轉換
    var wechatEmojiRegex = new RegExp("/::\\)|/::~|/::B|/::\\||/:8-\\)|/::<|/::$|/::X|/::Z|/::'\\(|/::-\\||/::@|/::P|/::D|/::O|/::\\(|/::\\+|/:--b|/::Q|/::T|/:,@P|/:,@-D|/::d|/:,@o|/::g|/:\\|-\\)|/::!|/::L|/::>|/::,@|/:,@f|/::-S|/:\\?|/:,@x|/:,@@|/::8|/:,@!|/:!!!|/:xx|/:bye|/:wipe|/:dig|/:handclap|/:&-\\(|/:B-\\)|/:<@|/:@>|/::-O|/:>-\\||/:P-\\(|/::'\\||/:X-\\)|/::\\*|/:@x|/:8\\*|/:pd|/:<W>|/:beer|/:basketb|/:oo|/:coffee|/:eat|/:pig|/:rose|/:fade|/:showlove|/:heart|/:break|/:cake|/:li|/:bome|/:kn|/:footb|/:ladybug|/:shit|/:moon|/:sun|/:gift|/:hug|/:strong|/:weak|/:share|/:v|/:@\\)|/:jj|/:@@|/:bad|/:lvu|/:no|/:ok|/:love|/:<L>|/:jump|/:shake|/:<O>|/:circle|/:kotow|/:turn|/:skip|/:oY|/:#-0|/:hiphot|/:kiss|/:<&|/:&>", 'g');
    var wechatEmojiTable = Object.freeze({
        // TODO: 補完 wechat 預設表情符號編碼
        '/::)': '😃',
        '/::~': '😖',
        '/::B': '😍',
        '/::|': '😳'
    });

    /**
     * @param {string} text
     */
    var filterWechatEmoji = function(text) {
        if (wechatEmojiRegex.test(text)) {
            let emojis = text.match(wechatEmojiRegex) || [];
            let newText = text;
            for (let i = 0; i < emojis.length; i++) {
                newText = newText.replace(emojis[i], wechatEmojiTable[emojis[i]] || emojis[i]);
            }
            return newText;
        }
        return text;
    };

    /**
     * 處理聊天室中視窗右側待辦事項資料的控制集合，
     * 所有有關待辦事項的處理皆寫於此閉包內。
     */
    var ticketTableCtrl = (function() {
        var api = window.restfulAPI;
        var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;
        var instance = new TicketTableCtrl();
        var tickets = null;

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

        var showSelect = function(prop, n, val) {
            var i = 0;
            var html = '<select class="selected form-control">';
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

            return api.appsTickets.findAll(appId, userId).then(function(resJson) {
                var appData = resJson.data;
                var clientMessagerId = $('.card-group[app-id="' + appId + '"][style="display: block;"]').attr('messager-id');

                if (appData && appData[appId] && appData[appId].tickets) {
                    tickets = appData[appId].tickets;

                    for (var ticketId in tickets) {
                        var ticket = tickets[ticketId];
                        if (ticket.isDeleted ||
                            clientMessagerId !== ticket.messager_id ||
                            (ticket.assigned_id && ticket.assigned_id !== userId)) {
                            continue;
                        }

                        var dueTimeDateStr = new Date(new Date(ticket.dueTime) - timezoneGap).toJSON().split('T').shift();
                        $ticketBody.prepend(
                            '<tr ticket-id="' + ticketId + '" class="ticket-row" data-toggle="modal" data-target="#ticket_info_modal">' +
                                '<td class="status" style="border-left: 5px solid ' + priorityColor(ticket.priority) + '">' + statusNumberToText(ticket.status) + '</td>' +
                                '<td>' + dueTimeDateStr + '</td>' +
                                '<td class="ticket-description">' + ticket.description + '</td>' +
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
                    var agents = appsAgents[appId];
                    var messagersData = appsMessagers[appId].messagers;
                    var $messagerNameSelect = $addTicketModal.find('select#add-form-name');
                    var $messagerIdElem = $addTicketModal.find('input#add-form-uid');
                    var $messagerEmailElem = $addTicketModal.find('input#add-form-email');
                    var $messagerPhoneElem = $addTicketModal.find('input#add-form-phone');
                    var $assignedSelectElem = $addTicketModal.find('select#assigned-name');
                    var selectedId = '';

                    $messagerNameSelect.empty();
                    if (messagersData && Object.keys(messagersData).length > 0) {
                        for (var msgerId in messagersData) {
                            selectedId = selectedId || msgerId;
                            var messager = messagersData[msgerId];
                            if (messager.chatroom_id) {
                                $messagerNameSelect.append('<option value=' + msgerId + '>' + messager.name + '</option>');
                            }
                        }
                    } else {
                        $messagerNameSelect.append('<option value="">無資料</option>');
                    }

                    $assignedSelectElem.empty();
                    if (agents && Object.keys(agents).length > 0) {
                        for (var agentId in agents) {
                            $assignedSelectElem.append('<option value=' + agentId + '>' + agents[agentId].name + '</option>');
                        }
                    } else {
                        $assignedSelectElem.append('<option value="">無資料</option>');
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
            var ticket = tickets[ticketId];

            var infoInputTable = $('.info-input-table').empty();
            var messager = appsMessagers[appId].messagers[msgerId];

            $ticketInfoModal.find('.modal-header').css('border-bottom', '3px solid ' + priorityColor(ticket.priority));

            var moreInfoHtml =
                '<tr>' +
                    '<th>客戶姓名</th>' +
                    '<td class="edit">' + (messager.name || '') + '</td>' +
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
                    '<td class="edit form-group">' +
                        '<textarea class="inner-text form-control">' + ticket.description + '</textarea>' +
                    '</td>' +
                '</tr>' +
                '<tr class="assigned">' +
                    '<th>指派人</th>' +
                    '<td class="form-group">' + showSelect('assigned', appsAgents[appId], ticket.assigned_id) + '</td>' +
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

            $ticketInfoModal.find('#ticket_info_modify').off('click').on('click', function() {
                instance.updateTicket(appId, ticketId);
            });

            $ticketInfoModal.find('#ticket_info_delete').off('click').on('click', function() {
                instance.deleteTicket(appId, ticketId);
            });
        };

        TicketTableCtrl.prototype.addTicket = function(appId) {
            var msgerId = $addTicketModal.find('select#add-form-name option:selected').val();
            var assignedId = $addTicketModal.find('select#assigned-name option:selected').val();
            var description = $addTicketModal.find('textarea#add_form_description').val();
            var $errorElem = $addTicketModal.find('#error');

            $errorElem.empty();
            if (!description) {
                $.notify('請輸入說明內容', { type: 'danger' });
            } else if (!msgerId) {
                $.notify('請選擇目標客戶', { type: 'danger' });
            } else if (!assignedId) {
                $.notify('請選擇指派人', { type: 'danger' });
            } else {
                var status = parseInt($addTicketModal.find('#add-form-status option:selected').val(), 10);
                var priority = parseInt($addTicketModal.find('#add-form-priority option:selected').val(), 10);
                var assignedName = $addTicketModal.find('select#assigned-name option:selected').text();

                var newTicket = {
                    description: description || '',
                    dueTime: Date.now() + (86400000 * 3), // 過期時間預設為3天後
                    priority: priority,
                    messager_id: msgerId,
                    status: status,
                    assigned_id: assignedId
                };

                return api.appsTickets.insert(appId, userId, newTicket).then(function() {
                    $.notify('待辦事項已新增，指派人: ' + assignedName, { type: 'success' });
                    instance.loadTickets(appId, userId);
                }).catch(function() {
                    $.notify('待辦事項新增失敗，請重試', { type: 'danger' });
                }).then(function() {
                    $addTicketModal.modal('hide');
                });
            }
        };

        TicketTableCtrl.prototype.updateTicket = function(appId, ticketId) {
            var $modifyTable = $('#ticket_info_modal .info-input-table');
            $modifyTable.find('input').blur();

            var ticketPriority = parseInt($modifyTable.find('th.priority').parent().find('td select').val(), 10);
            var ticketStatus = parseInt($modifyTable.find('th.status').parent().find('td select').val(), 10);
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
            return api.appsTickets.update(appId, ticketId, userId, modifiedTicket).then(function() {
                $.notify('待辦事項已更新，指派人: ' + assignedName, { type: 'success' });
                instance.loadTickets(appId, userId);
            }).catch(function() {
                $.notify('待辦事項更新失敗，請重試', { type: 'danger' });
            });
        };

        TicketTableCtrl.prototype.deleteTicket = function(appId, ticketId) {
            if (confirm('確認刪除表單？')) {
                return api.appsTickets.remove(appId, ticketId, userId).then(function() {
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

    var preventUpdateProfile = false;

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
    $(document).on('click', '.tablinks-area .tablinks', clickUserTablink); // 群組清單裡面選擇客戶
    $(document).on('focus', '#chat-content-panel input#message', readClientMsg); // 已讀客戶訊息
    $(document).on('click', '#chat-content-panel input#submitMsg', submitMessage); // 訊息送出
    ocClickShow.on('click', triggerFileUpload); // 傳圖，音，影檔功能
    $('.send-file').on('change', fileUpload); // 傳圖，音，影檔功能
    $('[data-toggle="tooltip"]').tooltip();
    messageInput.on('keydown', function(ev) { // 按enter可以發送訊息
        (13 === ev.keyCode) && $('#chat-content-panel input#submitMsg').click();
    });
    // =====end chat event=====

    // =====start profile event=====
    $(document).on('click', '#show_profile', showProfile);
    $(document).on('keypress', '.user-info-td[modify="true"] input[type="text"]', userInfoKeyPress);
    $(document).on('click', '.profile-confirm button', userInfoConfirm);
    $(document).on('click', '.photo-choose', groupPhotoChoose);
    $(document).on('change', '.photo-ghost', groupPhotoUpload);
    // =====end profile event=====

    // =====start ticket event=====
    $(document).on('click', '#show_todo', ticketTableCtrl.show);
    // =====end ticket event=====

    // =====start utility event=====

    $(document).on('click', '.multi-select-container input[type="checkbox"]', multiSelectChange);
    $.extend($.expr[':'], {
        'containsi': function(elem, i, match, array) {
            return (elem.textContent || elem.innerText || '').toLowerCase().indexOf((match[3] || '').toLowerCase()) >= 0;
        }
    });
    // =====end utility event=====

    // ==========
    // #region 準備聊天室初始化資料區塊
    Promise.all([
        api.apps.findAll(userId),
        api.appsChatroomsMessages.findAll(userId),
        api.appsMessagers.findAll(userId),
        api.appsFields.findAll(userId),
        api.groups.findAll(userId),
        api.users.find(userId)
    ]).then(function(responses) {
        apps = responses.shift().data;
        appsChatrooms = responses.shift().data;
        appsMessagers = responses.shift().data;
        appsFields = responses.shift().data;

        groups = responses.shift().data;
        groupsUsers = responses.shift().data;
        var socketRegPromises = [];

        // 過濾 API 資料裡的 app 資料
        for (var appId in apps) {
            var app = apps[appId];

            // 向 server 登記此 socket 有多少 appId
            socketRegPromises.push(new Promise(function(resolve) {
                chatshierSocket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId, function() {
                    resolve();
                });
            }));

            if (!appsChatrooms[appId]) {
                appsChatrooms[appId] = {
                    chatrooms: {}
                };
            }

            if (!appsFields[appId]) {
                appsFields[appId] = {
                    fields: {}
                };
            }

            if (!appsMessagers[appId]) {
                appsMessagers[appId] = {
                    messagers: {}
                };
            }

            // 把群組內所有使用者的名字加入對話者資料
            // 使各平台 app 內 messagers 的資料具有群組成員的資料
            if (groups[app.group_id]) {
                var messagers = appsMessagers[appId].messagers;
                var groupMembers = groups[app.group_id].members;

                for (var memberId in groupMembers) {
                    var memberUserId = groupMembers[memberId].user_id;

                    if (messagers[memberUserId]) {
                        messagers[memberUserId].name = groupsUsers[memberUserId].name;
                        messagers[memberUserId].email = groupsUsers[memberUserId].email;
                    } else {
                        messagers[memberUserId] = {
                            name: groupsUsers[memberUserId].name,
                            email: groupsUsers[memberUserId].email
                        };
                    }
                }
            }
        }
        return Promise.all(socketRegPromises);
    }).then(function() {
        if (!apps) {
            if ('1' !== window.sessionStorage.notifyModal) { // 網頁refresh不會出現errorModal(但另開tab會)
                $('#notifyModal').modal('show');
                window.sessionStorage.notifyModal = 1;
            }
            return;
        }

        generateAppsIcons(apps);
        responseChatData(apps);
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
                socket.once(SOCKET_EVENTS.DISCONNECT, function() {
                    console.info('=== chatroom disconnected ===');
                    resolve();
                });
            }).then(function() {
                return new Promise(function(resolve) {
                    socket.once(SOCKET_EVENTS.RECONNECT, function() {
                        console.info('=== chatroom reconnected ===');
                        resolve();
                    });
                });
            }).then(function() {
                var appIds = Object.keys(apps);
                return Promise.all(appIds.map(function(appId) {
                    return new Promise(function(resolve) {
                        socket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId, function() {
                            resolve();
                        });
                    });
                }));
            }).then(function() {
                return keepConnection();
            });
        })();

        socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, function(data) {
            /** @type {ChatshierChatSocketBody} */
            var socketBody = data;

            var appId = socketBody.app_id;
            var appType = socketBody.type;
            var chatroomId = socketBody.chatroom_id;
            var messages = socketBody.messages;
            messages.sort((a, b) => {
                // 根據發送的時間從早到晚排序
                return a.time - b.time;
            });
            var messagers = appsMessagers[appId].messagers;

            var nextMessage = function(i) {
                if (i >= messages.length) {
                    return Promise.resolve();
                }

                var message = messages[i];
                var senderId = message.messager_id;

                return Promise.resolve().then(function() {
                    var sender = senderId ? messagers[senderId] : {};
                    if (sender && sender.name) {
                        return sender;
                    }

                    if (CHATSHIER === appType) {
                        // 內部聊天室的對話者 ID 是 user ID
                        // 所以需要使用 auth api 來獲得使用者資料
                        return api.users.find(userId).then((resJson) => {
                            var groupUsers = resJson.data;
                            var senderUser = groupUsers[senderId];

                            if (!sender.chatroom_id) {
                                return api.appsMessagers.findOne(appId, senderId, userId).then(function(resJson) {
                                    var _appsMessagers = resJson.data;
                                    sender = _appsMessagers[appId].messagers[senderId];
                                    sender.name = senderUser.name;
                                    sender.email = senderUser.email;
                                    appsMessagers[appId].messagers[senderId] = sender;
                                    return sender;
                                });
                            }

                            sender.name = senderUser.name;
                            sender.email = senderUser.email;
                            appsMessagers[appId].messagers[senderId] = sender;
                            return sender;
                        });
                    }

                    if (senderId) {
                        // 如果此對話者沒有在清單內，代表可能是在聊天過程中，中途加入群組的
                        // 因此拿著此 ID 向 server 查詢此人資料
                        // 查詢完後儲存至本地端，下次就無需再查詢
                        return api.appsMessagers.findOne(appId, senderId, userId).then(function(resJson) {
                            var _appsMessagers = resJson.data;
                            sender = _appsMessagers[appId].messagers[senderId];
                            appsMessagers[appId].messagers[senderId] = sender;
                            return sender;
                        });
                    }
                    return sender;
                }).then(function(sender) {
                    // 如果這個聊天室內尚未被創建(代表無任何聊天記錄)
                    // 則將目前這個訊息當做第一筆資料，創建前端顯示用的暫時資料
                    if (!appsChatrooms[appId].chatrooms[chatroomId]) {
                        var _chatroom = {
                            messagers: {
                                [userId]: {
                                    unRead: 1
                                }
                            },
                            messages: {
                                [Date.now()]: message
                            }
                        };
                        appsChatrooms[appId].chatrooms[chatroomId] = _chatroom;
                    }

                    if (chatroomList.indexOf(chatroomId) < 0) {
                        var uiRequireData = {
                            appId: appId,
                            name: apps[appId].name,
                            type: apps[appId].type,
                            messagerId: senderId,
                            chatroomId: chatroomId,
                            chatroom: appsChatrooms[appId].chatrooms[chatroomId],
                            profile: sender
                        };
                        createChatroom(uiRequireData);
                        createProfilePanel(uiRequireData);
                        return;
                    }

                    var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
                    var chatroomMsgers = chatroom.messagers || {};
                    if (!chatroomMsgers[userId]) {
                        chatroomMsgers[userId] = { unRead: 0 };
                        chatroom.messagers = chatroomMsgers;
                    }
                    var chatroomUserSelf = chatroomMsgers[userId];
                    senderId !== userId && chatroomUserSelf.unRead++;

                    updateClientTab(sender, message, appId, chatroomId); // update 客戶清單
                    updateMessagePanel(sender, message, appId, chatroomId); // update 聊天室
                }).then(function() {
                    return nextMessage(i + 1);
                });
            };
            return nextMessage(0);
        });

        socket.on(SOCKET_EVENTS.UPDATE_MESSAGER_TO_CLIENT, function(data) {
            if (preventUpdateProfile) {
                preventUpdateProfile = false;
                return;
            }
            var appId = data.appId;
            var messagerId = data.messagerId;
            var messager = data.messager;
            appsMessagers[appId].messagers[messagerId] = messager;

            // 更新 UI 資料
            var $profileCard = $('.card-group[app-id="' + appId + '"][messager-id="' + messagerId + '"]');
            $profileCard.find('.panel-table').remove();

            var newProfileNode = $.parseHTML(generatePersonProfileHtml(appId, messager));
            $(newProfileNode.shift()).appendTo($profileCard.find('.photo-container'));
        });
    }

    function generateAppsIcons(apps) {
        var $chatApp = $('#chat_App');

        for (var appId in apps) {
            var appData = apps[appId];

            var buildHtml = function(type, imgSrc) {
                var html =
                    '<div class="chat-app-item" app-type="' + type + '" rel="' + appId + '" open="true" data-toggle="tooltip" data-placement="right" title="' + appData.name + '">' +
                        '<img class="software-icon" src="' + imgSrc + '">' +
                        '<div class="unread-count"></div>' +
                    '</div>';
                return html;
            };

            var appItem = '';
            switch (appData.type) {
                case LINE:
                    appItem = buildHtml(appData.type, LINE_LOGO);
                    break;
                case FACEBOOK:
                    appItem = buildHtml(appData.type, FACEBOOK_LOGO);
                    break;
                case WECHAT:
                    appItem = buildHtml(appData.type, WECHAT_LOGO);
                    break;
                default:
                    break;
            }
            appItem && $chatApp.prepend(appItem);
        }
    }

    function responseChatData(apps) {
        /**
         * 取得指定的聊天室內有多少 messager
         * @param {string} appId
         * @param {string} chatroomId
         */
        var findMessagersInChatroom = function(appId, chatroomId) {
            var output = {};
            var messagers = appsMessagers[appId].messagers;

            for (var messagerId in messagers) {
                var _messager = messagers[messagerId];
                if (_messager.chatroom_id && _messager.chatroom_id === chatroomId) {
                    output[messagerId] = _messager;
                }
            }
            return output;
        };

        for (var appId in apps) {
            var app = apps[appId];
            var chatrooms = appsChatrooms[appId].chatrooms;
            var messagers = appsMessagers[appId].messagers;

            for (var chatroomId in chatrooms) {
                var uiRequireData = {
                    appId: appId,
                    name: app.name,
                    type: app.type,
                    chatroomId: chatroomId,
                    chatroom: chatrooms[chatroomId]
                };

                switch (app.type) {
                    // 由於屬於特定平台 app 的 messager 只會有一位
                    case LINE:
                    case FACEBOOK:
                    case WECHAT:
                        var chatroomMessagers = findMessagersInChatroom(appId, chatroomId);
                        var _msgerId = Object.keys(chatroomMessagers).shift();
                        var messager = messagers[_msgerId];

                        uiRequireData.profile = messager;
                        uiRequireData.messagerId = _msgerId;
                        break;
                    // Profile UI 部分改顯示為聊天室資訊而非對話者的資訊
                    default:
                        uiRequireData.profile = Object.assign({}, messagers[userId]);
                        uiRequireData.profile.photo = '/image/group.png';
                        uiRequireData.messagerId = userId;
                        break;
                }

                createChatroom(uiRequireData);
                createProfilePanel(uiRequireData);
            }
        }

        // 根據訊息時間排序聊天室(訊息時間越晚越上面)
        var sortByMessageTime = function(elA, elB) {
            var tA = parseInt(new Date($(elA).find('.client-message').attr('message-time')).getTime());
            var tB = parseInt(new Date($(elB).find('.client-message').attr('message-time')).getTime());
            return tA < tB;
        };

        var $tablinksArea = $('#user .tablinks-area');
        var $clients = $tablinksArea.find('#clients');
        var $clientTabs = $clients.find('.tablinks');
        $clientTabs.sort(sortByMessageTime);

        $clients.empty();
        $clients.append($clientTabs);
    }

    function responseHistoryMsg(data) {
        var appId = data.appId;
        var appType = apps[appId].type;
        var chatroomId = data.chatroomId;
        var $messagePanel = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');

        var originHeight = $messagePanel.prop('scrollHeight');
        $messagePanel.find('.message:first').remove();
        $messagePanel.find('.message-day:lt(3)').remove();
        $messagePanel.prepend(historyMsgToStr(data.messages, appsMessagers[data.appId].messagers, appType));

        var nowHeight = $messagePanel[0].scrollHeight;
        $messagePanel.animate({
            scrollTop: nowHeight - originHeight
        }, 0);

        if ($messagePanel.attr('data-position') > 0) {
            $messagePanel.prepend(LOADING_MSG_AND_ICON);
        } else {
            $messagePanel.prepend(NO_HISTORY_MSG);
        }
    }

    function generateLoadingJqElem() {
        return $($.parseHTML(
            '<div class="loading-container">' +
                '<img src="image/loading.gif" alt="loading..." />' +
            '</div>'
        ).shift());
    }

    function generateClientHtml(opts) {
        var unReadStr = opts.unRead > 99 ? '99+' : ('' + opts.unRead);
        var html =
            '<button class="tablinks"' + 'app-id="' + opts.appId + '" chatroom-id="' + opts.chatroomId + '" app-type="' + opts.appType + '">' +
                '<div class="img-holder">' +
                    '<img src="' + opts.clientPhoto + '" alt="無法顯示相片" />' +
                    '<img class="small-software-icon" src="' + opts.iconSrc + '">' +
                '</div>' +
                '<div class="msg-holder">' +
                    '<b><span class="client-name">' + opts.clientName + '</span>' + opts.messageHtml + '</b>' +
                '</div>' +
                '<div class="app-name"><snap>' + opts.appName + '</snap></div>' +
                '<div class="chsr unread-msg badge badge-pill"' + (!opts.unRead ? ' style="display: none"' : '') + '>' + unReadStr + '</div>' +
            '</button>' +
            '<hr/>';
        return html;
    }

    function generateMessageHtml(srcHtml, message, messagerName, appType) {
        messagerName = SYSTEM === message.from ? '由系統發送' : (messagerName || '');
        var isMedia = srcHtml.startsWith('<img') || srcHtml.startsWith('<audio') || srcHtml.startsWith('<video');

        // 如果訊息是來自於 Chatshier 或 系統自動回覆 的話，訊息一律放在右邊
        // 如果訊息是來自於其他平台的話，訊息一律放在左邊
        var senderId = message.messager_id;
        var shouldRightSide =
            (appType !== CHATSHIER && (SYSTEM === message.from || CHATSHIER === message.from)) ||
            (appType === CHATSHIER && userId === senderId);

        return '<div class="message" message-time="' + message.time + '" message-type="' + message.type + '">' +
            '<div class="messager-name' + (shouldRightSide ? ' text-right' : '') + '">' +
                '<span>' + messagerName + '</span>' +
            '</div>' +
            '<span class="message-group ' + (shouldRightSide ? ' align-right' : '') + '">' +
                '<span class="content ' + (isMedia ? 'media' : 'words') + '">' + srcHtml + '</span>' +
                '<span class="send-time">' + toTimeStr(message.time) + '</span>' +
                '<strong></strong>' +
            '</span>' +
            '<br/>' +
        '</div>';
    }

    function createChatroom(requireData) {
        var appId = requireData.appId;
        var appName = requireData.name;
        var appType = requireData.type;
        var profile = requireData.profile;
        var chatroom = requireData.chatroom;
        var chatroomId = requireData.chatroomId;

        if (!(requireData && requireData.chatroom)) {
            return;
        }
        chatroomId && chatroomList.push(chatroomId);

        var messages = chatroom.messages || {};
        var msgKeys = Object.keys(messages);
        var lastMessage = messages[msgKeys[msgKeys.length - 1]];

        // 左邊的客戶清單排列
        var chatroomMsgers = chatroom.messagers || {};
        var chatroomUserSelf = chatroomMsgers[userId] || {};
        var clientUiOpts = {
            appId: requireData.appId,
            appName: appName,
            appType: appType,
            chatroomId: requireData.chatroomId,
            clientName: profile.name,
            clientPhoto: profile.photo,
            iconSrc: '',
            unRead: chatroomUserSelf.unRead || 0,
            messageHtml: messageToClientHtml(lastMessage)
        };

        switch (appType) {
            case LINE:
                clientUiOpts.iconSrc = LINE_LOGO;
                break;
            case FACEBOOK:
                clientUiOpts.iconSrc = FACEBOOK_LOGO;
                break;
            case WECHAT:
                clientUiOpts.iconSrc = WECHAT_LOGO;
                break;
            case CHATSHIER:
            default:
                clientUiOpts.iconSrc = '/image/logo-no-transparent.png';
                break;
        }
        var tablinkHtml = generateClientHtml(clientUiOpts);
        $('#clients').append(tablinkHtml);

        // 中間聊天室
        var msgStr = '';
        if (msgKeys.length < 10) {
            msgStr += NO_HISTORY_MSG;
        }
        msgStr += historyMsgToStr(messages, appsMessagers[appId].messagers, appType);
        canvas.append(
            '<div class="tabcontent" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                '<div class="message-panel">' + msgStr + '</div>' +
            '</div>'
        );

        // if (requireData.position) {
        //     $('.tabcontent[app-id="' + appId + '"]' + '[chatroom-id="' + requireData.chatroomId + '"]').on('scroll', function() {
        //         detectScrollTop($(this));
        //     });
        // }
    }

    function messageToPanelHtml(message) {
        switch (message.type) {
            case 'image':
                return '<img src="' + message.src + '" style="width: 100%; max-width: 500px;" />';
            case 'audio':
                return '<audio controls><source src="' + message.src + '" type="audio/mpeg"></audio>';
            case 'video':
                return '<video controls><source src="' + message.src + '" type="video/mp4"></video>';
            case 'sticker':
                return '<img src="' + message.src + '" style="width: 100%; max-width: 200px;" />';
            case 'location':
                return '<i class="fa fa-location-arrow location-icon"></i><span>地理位置: <a target="_blank" href="' + message.src + '">地圖</a></span>';
            default:
                return filterWechatEmoji(message.text || '').replace(/\\n/g, '<br/>');
        }
    }

    function messageToClientHtml(message) {
        if (!message) {
            return '<div class="client-message" message-time="0"></div>';
        }

        // 判斷客戶傳送的是檔案，貼圖還是文字，回傳對應的 html
        var lastMsgText = {
            image: '圖像',
            video: '影像',
            audio: '聲音',
            sticker: '貼圖',
            location: '地理位置'
        }[message.type] || loadMessageInDisplayClient(message.text);

        return '<div class="client-message" message-time="' + message.time + '">' + toTimeStr(message.time) + lastMsgText + '</div>';
    }

    function historyMsgToStr(messages, messagers, appType) {
        var returnStr = '';
        var nowDateStr = '';
        var prevTime = 0;

        for (var i in messages) {
            var srcHtml = messageToPanelHtml(messages[i]);

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

            let senderId = messages[i].messager_id;
            let messagerName = messagers[senderId] ? messagers[senderId].name : '';
            returnStr += generateMessageHtml(srcHtml, messages[i], messagerName, appType);
        }
        return returnStr;
    }

    function createProfilePanel(requireData) {
        var appId = requireData.appId;
        var appType = requireData.type;
        var chatroomId = requireData.chatroomId;
        var messagerId = requireData.messagerId;
        var messager = requireData.profile;

        var profilePanelHtml =
            '<div class="card-group" app-id="' + appId + '" chatroom-id="' + chatroomId + '" messager-id="' + messagerId + '">' +
                '<div class="card-body table-responsive" id="profile">' +
                    '<div class="photo-container">' +
                        '<img src="' + messager.photo + '" alt="無法顯示相片" style="width:128px;height:128px;" />' +
                    '</div>' +
                    (function generateProfileHtml() {
                        var html = '';

                        if (CHATSHIER !== appType) {
                            html = generatePersonProfileHtml(appId, messager) +
                                '<div class="profile-confirm text-center">' +
                                    '<button type="button" class="btn btn-info">確認</button>' +
                                '</div>';
                        } else {
                            var groupName = requireData.name;
                            html = generateChatroomProfileHtml(appId, groupName);
                        }
                        return html;
                    })() +
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
                                        '<a class="modal-toggler" messager-id="' + messagerId + '" data-toggle="modal" data-target="#add-ticket-modal">' +
                                            '<span class="fa fa-plus fa-fw"></span>新增待辦' +
                                        '</a>' +
                                    '</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody class="ticket-body" messager-id="' + messagerId + '"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>';

        infoCanvas.append(profilePanelHtml);
    }

    function generatePersonProfileHtml(appId, messager) {
        messager.assigned = messager.assigned || '';
        var customFields = messager.custom_fields || {};

        var tdHtmlBuilder = function(fieldId, field) {
            var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;
            var setsTypeEnums = api.appsFields.enums.setsType;
            var readonly = field.type === api.appsFields.enums.type.SYSTEM;
            var fieldValue = '';

            if (field.type === api.appsFields.enums.type.CUSTOM) {
                fieldValue = customFields[fieldId] ? customFields[fieldId].value : '';
            } else {
                fieldValue = messager[field.alias] || '';
            }

            switch (field.setsType) {
                case setsTypeEnums.SELECT:
                    return '<td class="profile-content user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<select class="form-control td-inner" value="' + fieldValue + '">' +
                            (function(sets) {
                                var opts = '<option value="">未選擇</option>';
                                for (var i in sets) {
                                    opts += '<option value="' + sets[i] + '" ' + (sets[i] === fieldValue ? 'selected' : '') + '>' + (transJson[sets[i]] || sets[i]) + '</option>';
                                }
                                return opts;
                            })(field.sets) +
                        '</select>' +
                    '</td>';
                case setsTypeEnums.MULTI_SELECT:
                    fieldValue = (fieldValue instanceof Array) ? fieldValue : [];

                    return '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<div class="btn-group btn-block td-inner">' +
                            '<button class="btn btn-default btn-block" data-toggle="dropdown" aria-expanded="false">' +
                                '<span class="multi-select-values"></span>' +
                                '<span class="caret"></span>' +
                            '</button>' +
                            '<ul class="multi-select-container dropdown-menu">' +
                                (function(sets) {
                                    var checkboxes = '';
                                    for (var i in sets) {
                                        if (!sets[i]) {
                                            continue;
                                        }

                                        checkboxes += '<li>' +
                                            '<input type="checkbox" value="' + sets[i] + '"' + (fieldValue[i] ? ' checked="true"' : '') + '">' + sets[i] +
                                        '</li>';
                                    }
                                    return checkboxes;
                                })(field.sets) +
                            '</ul>' +
                        '</div>' +
                    '</td>';
                case setsTypeEnums.CHECKBOX:
                    return '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<input class="td-inner" type="checkbox"' + (fieldValue ? ' checked="true"' : '') + (readonly ? ' disabled' : '') + '/>' +
                    '</td>';
                case setsTypeEnums.DATE:
                    fieldValue = fieldValue || 0;
                    var fieldDateStr = new Date(new Date(fieldValue).getTime() - timezoneGap).toJSON().split('.').shift();
                    return '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<input class="form-control td-inner" type="datetime-local" value="' + fieldDateStr + '" ' + (readonly ? 'readonly disabled' : '') + '/>' +
                    '</td>';
                case setsTypeEnums.TEXT:
                case setsTypeEnums.NUMBER:
                default:
                    return '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<input class="form-control td-inner" type="text" placeholder="尚未輸入" value="' + fieldValue + '" ' + (readonly ? 'readonly disabled' : '') + '/>' +
                    '</td>';
            }
        };

        var asyncLoadAgants = function() {
            return getAppAgants(appId).then(function(agents) {
                var agentData = (function() {
                    var nameList = [];
                    var idList = [];
                    var nameSelected = [];

                    for (var agentUserId in agents) {
                        idList.push(agentUserId);
                        nameList.push(agents[agentUserId].name);
                        if (messager.assigned.indexOf(agentUserId) >= 0) {
                            nameSelected.push(agents[agentUserId].name);
                        };
                    }

                    return {
                        nameList: nameList,
                        idList: idList,
                        nameSelected: nameSelected
                    };
                })();

                // 找到指定的 app 底下的指派人欄位
                // 如有沒有找到的話就不用處理
                var $tdOfAgant = $('.card-group[app-id="' + appId + '"] .user-info-td[alias="assigned"]');
                if (!$tdOfAgant.length) {
                    return;
                }
                $tdOfAgant.find('.multi-select-values').text(agentData.nameSelected.join(','));

                var $dropdownMenu = $tdOfAgant.find('.multi-select-container.dropdown-menu');
                $dropdownMenu.empty();
                for (var i in agentData.nameList) {
                    var hasChecked = agentData.nameSelected.indexOf(agentData.nameList[i]) >= 0;
                    $dropdownMenu.append(
                        '<li>' +
                            '<input type="checkbox" value="' + agentData.idList[i] + '"' + (hasChecked ? ' checked="true"' : '') + '">' + agentData.nameList[i] +
                        '</li>'
                    );
                }
            });
        };

        var messagerProfileHtml =
            '<table class="table table-hover panel-table">' +
                (function() {
                    // 呈現客戶分類條件資料之前先把客戶分類條件資料設定的順序排列
                    var fieldKeys = Object.keys(appsFields[appId].fields);
                    fieldKeys.sort(function(a, b) {
                        return appsFields[appId].fields[a].order - appsFields[appId].fields[b].order;
                    });
                    var rowsHtml = '';

                    for (var i in fieldKeys) {
                        var fieldId = fieldKeys[i];
                        var field = appsFields[appId].fields[fieldId];
                        rowsHtml +=
                            '<tr id="' + fieldId + '">' +
                                '<th class="profile-label user-info-th" alias="' + field.alias + '">' + (transJson[field.text] || field.text) + '</th>' +
                                tdHtmlBuilder(fieldId, field) +
                            '</tr>';

                        // 指派人的資料是屬於非同步的工作
                        // 因此在 html append 到 dom 上後，在抓取資料
                        // 找到指派人的欄位把資料填入
                        if ('assigned' === field.alias) {
                            asyncLoadAgants();
                        }
                    }
                    return rowsHtml;
                })() +
            '</table>';

        return messagerProfileHtml;
    }

    function generateChatroomProfileHtml(appId, groupName) {
        var members = appsMessagers[appId].messagers;

        var html =
            '<table class="table table-hover panel-table">' +
                '<tr>' +
                    '<th class="profile-label">群組名稱</th>' +
                    '<td class="profile-content">' +
                        '<input class="form-control td-inner" type="text" value="' + groupName + '"' + ' readonly disabled />' +
                    '</td>' +
                '</tr>' +
                '<tr>' +
                    '<th class="profile-label align-top">群組成員</th>' +
                    '<td class="profile-content">' +
                        (function() {
                            var html = '';
                            for (var memberUserId in members) {
                                var member = members[memberUserId];

                                html +=
                                    '<div class="person-chip">' +
                                        '<img src="' + (member.photo || 'image/avatar-default.png') + '" class="person-avatar" alt="">' +
                                        '<span>' + member.name + '</span>' +
                                    '</div>';
                            }
                            return html;
                        })() +
                    '</td>' +
                '</tr>' +
            '</table>';

        return html;
    }

    // ==========end initialize function========== //

    // =====start chat function=====
    function showChatApp() {
        var selectRel = $(this).attr('rel');
        var $tablinksArea = $('#user .tablinks-area');
        var $allTablinks = $tablinksArea.find('.tablinks');

        switch (selectRel) {
            case 'all':
                $allTablinks.show();
                break;
            case 'group':
                $allTablinks.hide();
                $tablinksArea.find('.tablinks[app-type="' + CHATSHIER + '"]').show();
                break;
            case 'unread':
                $tablinksArea.find('.unread-msg').each(function() {
                    var $unReadElem = $(this);
                    var $tablinkWrapper = $unReadElem.parentsUntil('.list-group').last();

                    if (!parseInt($unReadElem.text(), 10)) {
                        $tablinkWrapper.hide();
                    } else {
                        $tablinkWrapper.show();
                    }
                });
                break;
            case 'assigned':
            case 'unassigned':
                $allTablinks.hide();
                var isFindAssigned = ('assigned' === selectRel);
                $('[alias="assigned"] .td-inner .multi-select-values').each(function() {
                    var assignedText = $(this).text();
                    var assignedUsers = assignedText ? assignedText.split(',') : [];

                    if ((isFindAssigned && assignedUsers.length) ||
                        (!isFindAssigned && !assignedUsers.length)) {
                        var $parentCard = $(this).parents('.card-group');
                        var appId = $parentCard.attr('app-id');
                        $tablinksArea.find('.tablinks[app-id="' + appId + '"]').show();
                    }
                });
                break;
            default:
                $allTablinks.hide();
                $tablinksArea.find('.tablinks[app-id="' + selectRel + '"]').show();
                break;
        }
    }

    function clickUserTablink() {
        var $userTablink = $(this);
        var $messageInputPanel = $('#send-message');

        var appId = $userTablink.attr('app-id');
        var appName = apps[appId].name;
        var chatroomId = $userTablink.attr('chatroom-id');
        var appType = $userTablink.attr('app-type');

        $('.tablinks.selected').removeClass('selected').css('background-color', '');
        $userTablink.addClass('selected').css('background-color', COLOR.CLICKED);

        ticketTableCtrl.loadTickets(appId, userId);

        var $unReadElem = $userTablink.find('.unread-msg');
        if (parseInt($unReadElem.text(), 10)) {
            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                chatroomId: chatroomId,
                messagerId: userId
            });
            var chatroomMsgers = appsChatrooms[appId].chatrooms[chatroomId].messagers || {};
            var chatroomUserSelf = chatroomMsgers[userId] || {};
            chatroomUserSelf.unRead = 0;

            // 如果有未讀的話，將未讀數設為0之後，把未讀的區塊隱藏
            $userTablink.find('.client-message').css('font-weight', 'normal'); // 取消未讀粗體
            $unReadElem.text('0').hide();
        }

        $('#chat-content-panel .chat-prof .prof-nick').text(appName);

        // 將聊天室訊息面板顯示，並將 scroll 滑至最下方
        var $messageWrapper = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $profilePanel = $('.card-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        $messageInputPanel.show();
        $messageWrapper.addClass('shown').show().siblings().removeClass('shown').hide();
        $profilePanel.show().siblings().hide();
        scrollMessagePanelToBottom(appId, chatroomId);

        var $profileTab = $('#show_profile');
        var $ticketTodoPanel = $('#show_todo');
        $infoPanel.show();
        if (CHATSHIER !== appType) {
            $profileTab.text('用戶資料');
            $ticketTodoPanel.show();
        } else {
            $profileTab.text('群組資料');
            $ticketTodoPanel.hide();
        }
    }

    function detectScrollTop(ele) {
        if (!ele.scrollTop()) {
            var tail = parseInt(ele.attr('data-position'), 10);
            var head = parseInt(ele.attr('data-position'), 10) - 20;
            if (head < 0) {
                head = 0;
            }

            var request = {
                appId: ele.parent().attr('app-id'),
                chatroomId: ele.parent().attr('chatroom-id'),
                head: head,
                tail: tail
            };

            if (!head) {
                ele.off('scroll');
            }

            ele.attr('data-position', head);
            // chatshierSocket.emit('upload history msg from front', request, responseHistoryMsg);
        }
    }

    function readClientMsg() {
        var $tablinksSelected = $('.tablinks.selected');
        var $unReadElem = $tablinksSelected.find('.unread-msg');

        if (parseInt($unReadElem.text(), 10)) {
            var appId = $tablinksSelected.attr('app-id');
            var chatroomId = $tablinksSelected.attr('chatroom-id');

            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                chatroomId: chatroomId,
                messagerId: userId
            });
            var chatroomMsgers = appsChatrooms[appId].chatrooms[chatroomId].messagers || {};
            var chatroomUserSelf = chatroomMsgers[userId] || {};
            chatroomUserSelf.unRead = 0;

            $unReadElem.text(chatroomUserSelf.unRead).hide();
        }
    }

    function submitMessage(ev) {
        ev.preventDefault();
        var $evElem = $(ev.target);
        var $contentPanel = $evElem.parentsUntil('#chat-content-panel');
        var $messageView = $contentPanel.siblings('#canvas').find('.tabcontent.shown');

        var appId = $messageView.attr('app-id');
        var appType = apps[appId].type;
        var chatroomId = $messageView.attr('chatroom-id');
        var recipientId = findChatroomMessagerId(appId, chatroomId);
        var msgText = messageInput.val();

        if (!(appId && chatroomId && msgText)) {
            return;
        }

        /** @type {ChatshierMessage} */
        var messageToSend = {
            from: CHATSHIER,
            time: Date.now(),
            text: msgText,
            src: '',
            type: 'text',
            messager_id: userId
        };

        /** @type {ChatshierChatSocketBody} */
        var socketBody = {
            app_id: appId,
            type: appType,
            chatroom_id: chatroomId,
            recipientId: recipientId,
            messages: [messageToSend]
        };

        var $loadingElem = generateLoadingJqElem();
        $messageView.find('.message-panel').append($loadingElem);
        scrollMessagePanelToBottom(appId, chatroomId);

        return new Promise(function(resolve) {
            messageInput.val('');
            chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, socketBody, function() {
                $loadingElem.remove();
                $loadingElem = void 0;
                resolve();
            });
        }).then(function() {
            // var sender = appsMessagers[appId].messagers[userId];
            // var srcHtml = messageToPanelHtml(messageToSend);

            // var $messagePanel = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]' + ' .message-panel');
            // var messageHtml = generateMessageHtml(srcHtml, messageToSend, sender.name, appType);
            // $messagePanel.append(messageHtml);
            // $messagePanel.scrollTop($messagePanel.prop('scrollHeight'));

            // var $tablinkMsg = $('.tablinks[app-id="' + appId + '"] .client-message');
            // $tablinkMsg.html(toTimeStr(Date.now()) + loadMessageInDisplayClient(srcHtml));
        });
    }

    function fileUpload() {
        /** @type {HTMLInputElement} */
        var _this = this;
        if (!_this.files.length) {
            _this.value = '';
            return;
        }

        var $contentPanel = $(_this).parents('#chat-content-panel');
        var $messageView = $contentPanel.find('#canvas .tabcontent.shown');
        var appId = $messageView.attr('app-id');
        var chatroomId = $messageView.attr('chatroom-id');

        /** @type {File} */
        var file = _this.files[0];
        _this.value = ''; // 把 input file 值清空，使 change 事件對同一檔案可重複觸發

        if (file.type.indexOf('image') >= 0 && file.size > window.chatshierConfig.imageFileMaxSize) {
            $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(window.chatshierConfig.imageFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        } else if (file.type.indexOf('video') >= 0 && file.size > window.chatshierConfig.videoFileMaxSize) {
            $.notify('影像檔案過大，檔案大小限制為: ' + Math.floor(window.chatshierConfig.videoFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        } else if (file.type.indexOf('audio') >= 0 && file.size > window.chatshierConfig.audioFileMaxSize) {
            $.notify('聲音檔案過大，檔案大小限制為: ' + Math.floor(window.chatshierConfig.audioFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        }

        var $loadingElem = generateLoadingJqElem();
        $messageView.find('.message-panel').append($loadingElem);
        scrollMessagePanelToBottom(appId, chatroomId);

        var msgType = $(_this).data('type');
        var appType = apps[appId].type;
        var recipientId = findChatroomMessagerId(appId, chatroomId);
        var src = file;
        /** @type {ChatshierMessage} */
        var messageToSend = {
            text: '',
            src: src,
            type: msgType,
            from: CHATSHIER,
            time: Date.now(),
            messager_id: userId
        };
        /** @type {ChatshierChatSocketBody} */
        var socketBody = {
            app_id: appId,
            type: appType,
            chatroom_id: chatroomId,
            recipientId: recipientId,
            messages: [messageToSend]
        };
        messageInput.val('');
        chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, socketBody, function() {
            $loadingElem.remove();
            $loadingElem = void 0;
        });
    }

    function triggerFileUpload(e) {
        var eId = $(this).data('id');
        $('#' + eId).trigger('click');
    }

    function findChatroomMessagerId(appId, chatroomId) {
        var appType = apps[appId].type;

        switch (appType) {
            case LINE:
            case FACEBOOK:
            case WECHAT:
                // 從目前所有的 messager 中找尋平台中唯一的 messagerId
                for (var messagerId in appsMessagers[appId].messagers) {
                    var _messager = appsMessagers[appId].messagers[messagerId];
                    if (_messager.name && _messager.chatroom_id === chatroomId) {
                        return messagerId;
                    }
                }
                return '';
            case CHATSHIER:
            default:
                return userId;
        }
    }

    function scrollMessagePanelToBottom(appId, chatroomId) {
        var $messageWrapper = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $messagePanel = $messageWrapper.find('.message-panel');
        $messagePanel.scrollTop($messagePanel.prop('scrollHeight'));
    }

    function updateMessagePanel(messager, message, appId, chatroomId) {
        /** @type {ChatshierMessage} */
        var _message = message;
        var appType = apps[appId].type;
        var srcHtml = messageToPanelHtml(_message);
        var $messagePanel = $('[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');

        if (chatroomList.indexOf(chatroomId) >= 0) {
            var lastMessageTime = parseInt($messagePanel.find('.message:last').attr('message-time'), 10);

            // 如果現在時間比上一筆聊天記錄多15分鐘的話，將視為新訊息
            if (_message.time - lastMessageTime >= 900000) {
                $messagePanel.append('<p class="message-day"><strong>-新訊息-</strong></p>');
            }
            var messageHtml = generateMessageHtml(srcHtml, _message, messager.name, appType);
            $messagePanel.append(messageHtml);
            scrollMessagePanelToBottom(appId, chatroomId);
        } else {
            // if its new user
            var historyMsgStr = NO_HISTORY_MSG;
            historyMsgStr += generateMessageHtml(srcHtml, _message, messager.name, appType);

            canvas.append(
                '<div class="tabcontent" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                    '<div class="message-panel">' + historyMsgStr + '</div>' +
                '</div>'
            );
        }
    }

    function updateClientTab(messager, message, appId, chatroomId) {
        /** @type {ChatshierMessage} */
        var _message = message;
        var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
        var chatroomMsgers = chatroom.messagers;
        var chatroomUserSelf = chatroomMsgers[userId];

        // 收到 socket 訊息後，左側用戶列表更新發送者名稱及未讀數
        var $selectedTablinks = $('.tablinks-area').find(".tablinks[app-id='" + appId + "'][chatroom-id='" + chatroomId + "']");
        var messagerName = SYSTEM === message.from ? 'Chatshier' : messager.name;
        $selectedTablinks.find('.client-name').text(messagerName);

        var $msgElem = $selectedTablinks.find('.client-message');
        var srcHtml = messageToClientHtml(_message);
        $msgElem.html(srcHtml);
        $selectedTablinks.attr('data-recent-time', _message.time);

        var currentUnread = chatroomUserSelf.unRead;
        var $unreadMsgElem = $selectedTablinks.find('.unread-msg');
        if (currentUnread > 99) {
            $unreadMsgElem.text('99+').css('display', '');
        } else {
            $unreadMsgElem.text(currentUnread).css('display', !currentUnread ? 'none' : ''); // 未讀訊息數顯示出來
        }

        $selectedTablinks.remove();
        $('.tablinks-area>#clients').prepend($selectedTablinks);
    }
    // =====end chat function=====

    // =====start profile function=====
    function showProfile() {
        $('.nav li.active').removeClass('active');
        $(this).parent().addClass('active');
        $('#infoCanvas #profile').show();
        $('#infoCanvas #todo').hide();
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
            custom_fields: {}
        };
        var $tds = $(this).parents('.card-group').find('.panel-table tbody td');

        $tds.each(function() {
            var $td = $(this);
            var fieldId = $td.parentsUntil('tbody').last().attr('id');

            var alias = $td.attr('alias');
            var setsType = $td.attr('type');
            var setsTypeEnums = api.appsFields.enums.setsType;

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
                    var selectVals = [];
                    var $checkboxes = $tdDataElem.find('input[type="checkbox"]:checked');
                    $checkboxes.each(function() {
                        selectVals.push($(this).val());
                    });
                    value = selectVals;
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
                    // 沒有別名的屬性代表是自定義的客戶分類條件資料
                    messagerUiData.custom_fields[fieldId] = {
                        value: value
                    };
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
                params: {
                    userid: userId,
                    appid: appId,
                    messagerid: msgerId
                },
                body: messagerUiData
            };

            // 資料送出後，會再收到群組內的 socket 資料
            // 設置 flag 防止再次更新 profile
            preventUpdateProfile = true;
            return new Promise((resolve, reject) => {
                let waitTimer = window.setTimeout(reject, 3000);
                chatshierSocket.emit(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, socketRequest, function() {
                    window.clearTimeout(waitTimer);
                    resolve();
                });
            }).then(() => {
                // 將成功更新的資料覆蓋前端本地端的全域 app 資料
                appsMessagers[appId].messagers[msgerId] = Object.assign(appsMessagers[appId].messagers[msgerId], messagerUiData);
                $.notify('用戶資料更新成功', { type: 'success' });
            });
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
    // =====end internal function

    // =====start searchBox change func=====
    /** @type {JQuery<HTMLElement>[]} */
    var $tablinks = [];
    var $panels = [];
    var $clientNameOrTexts = [];
    var $searchWapper = $('#user div.search');
    var $searchInput = $searchWapper.find('input#searchBox');

    $searchInput.on('keyup', function(ev) {
        var searchStr = $(this).val().toLowerCase();
        if (!searchStr) {
            $('#search-right').addClass('invisible');
            displayAll();

            $('.tablinks').each(function() {
                var appId = $(this).attr('app-id');
                var chatroomId = $(this).attr('chatroom-id');
                var panel = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
                panel.find('.message .content').removeClass('found');
            });
        }

        var code = ev.keyCode || ev.which;
        if (38 === code) {
            // 向上鍵
            return $searchWapper.find('.glyphicon-chevron-up').click();
        } else if (40 === code) {
            // 向下鍵
            return $searchWapper.find('.glyphicon-chevron-down').click();
        } else if (13 !== code) {
            return;
        }

        var count = 0;
        $tablinks.length = $panels.length = $clientNameOrTexts.length = 0;
        $('.tablinks').each(function() {
            var $tablinkElem = $(this);
            var appId = $tablinkElem.attr('app-id');
            var chatroomId = $tablinkElem.attr('chatroom-id');
            var panel = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
            var color = '';
            var display = false;

            // 客戶名單搜尋
            $tablinkElem.find('.client-name').each(function() {
                var $content = $(this).find('.content');
                var text = $(this).text();

                if (text.toLowerCase().indexOf(searchStr) !== -1) {
                    if (0 === count) {
                        $tablinkElem.trigger('click');
                    }
                    $tablinks.push($tablinkElem);
                    $panels.push(null);
                    $clientNameOrTexts.push(null);
                    count += 1;
                    $content.addClass('found');
                    display = true;
                } else {
                    $content.removeClass('found');
                }
            });
            // 聊天室搜尋
            panel.find('.message').each(function() {
                var $message = $(this);
                var $content = $message.find('.content');
                var text = $content.text();

                if (text.toLowerCase().indexOf(searchStr) !== -1) {
                    // match 的字標黃
                    if (0 === count) {
                        $tablinkElem.trigger('click');
                        var offsetTop = $message.prop('offsetTop') - $message.height();
                        panel.scrollTop(offsetTop);
                    }
                    $tablinks.push($tablinkElem);
                    $panels.push(panel);
                    $clientNameOrTexts.push($message);
                    $content.addClass('found');
                    count += 1;

                    // 顯示"找到訊息"並標紅
                    var $tablinkMsg = $('.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .client-message');
                    $tablinkMsg.css('color', COLOR.FIND).text('找到訊息');
                    display = true;
                } else {
                    $content.removeClass('found');
                }
            });

            if (1 <= count) {
                $('#this-number').html(1);
                $('#total-number').html(count);
                $('#search-right').removeClass('invisible');
                $(this).css('color', color);
            }

            $(this).css('display', display ? '' : 'none');
        });
    });

    $searchWapper.on('click', '.glyphicon-chevron-up', function() {
        if (!($panels.length && $tablinks.length)) {
            return;
        }

        var i = parseInt($('#this-number').html(), 10);
        var total = parseInt($('#total-number').html(), 10);

        if (i <= 1) {
            i = total;
        } else {
            i -= 1;
        }
        var $panel = $panels[(i - 1)];
        var $tablink = $tablinks[(i - 1)];
        $tablink.trigger('click');

        if ($clientNameOrTexts[(i - 1)]) {
            var $clientNameOrText = $clientNameOrTexts[(i - 1)];
            var offsetTop = $clientNameOrText.prop('offsetTop') - $clientNameOrText.height();
            $panel.scrollTop(offsetTop);
        }
        $('#this-number').html(i);
    });

    $searchWapper.on('click', '.glyphicon-chevron-down', function() {
        if (!($panels.length && $tablinks.length)) {
            return;
        }

        var i = parseInt($('#this-number').html(), 10);
        var total = parseInt($('#total-number').html(), 10);

        if (i >= total) {
            i = 1;
        } else {
            i += 1;
        }
        var $panel = $panels[(i - 1)];
        var $tablink = $tablinks[(i - 1)];
        $tablink.trigger('click');

        if ($clientNameOrTexts[(i - 1)]) {
            var $clientNameOrText = $clientNameOrTexts[(i - 1)];
            var offsetTop = $clientNameOrText.prop('offsetTop') - $clientNameOrText.height();
            $panel.scrollTop(offsetTop);
        }
        $('#this-number').html(i);
    });

    function displayAll() {
        $('.tablinks-area .tablinks').each(function() {
            var $tablinkElem = $(this);
            $tablinkElem.css({
                display: '',
                'background-color': ''
            });

            var appId = $tablinkElem.attr('app-id');
            var chatroomId = $tablinkElem.attr('chatroom-id');
            var $MessagePanel = $('.tabcontent[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
            var $tablinkMsg = $tablinkElem.find('.client-message');
            var $lastMessage = $MessagePanel.find('.message').last();

            var srcHtml = messageToClientHtml({
                text: $lastMessage.find('.content').text().trim(),
                type: $lastMessage.attr('message-type'),
                time: parseInt($lastMessage.attr('message-time'), 10)
            });
            $tablinkMsg.html(srcHtml).css('color', 'black');

            $MessagePanel.find('.message .content').css({
                color: 'black',
                'background-color': '#b5e7a0'
            });

            $tablinkElem.find('.client-name').css({
                color: 'black',
                'background-color': ''
            });
        });
    }

    function sortUsers(ref, upOrDown, operate) {
        var arr = $('#clients .tablinks');
        for (var i = 0; i < arr.length - 1; i++) {
            for (var j = i + 1; j < arr.length; j++) {
                var a = arr.eq(i).attr('data-' + ref) - '0';
                var b = arr.eq(j).attr('data-' + ref) - '0';
                if (upOrDown === operate(a, b)) {
                    var tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }
        }
        $('#clients').append(arr);
    }
    // =====end searchBox change func=====

    // =====start utility function

    function loadMessageInDisplayClient(msg) {
        return msg.length > 10 ? (msg.substr(0, 10) + '...') : msg;
    }

    function toDateStr(input) {
        var str = ' ';
        var date = new Date(input);
        str += date.getFullYear() + '/' + addZero(date.getMonth() + 1) + '/' + addZero(date.getDate()) + ' ';
        var week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        str += week[date.getDay()] + ' ' + addZero(date.getHours()) + ':' + addZero(date.getMinutes());
        return str;
    }

    function toTimeStr(input) {
        var date = new Date(input);
        var dateStr = ' (' + addZero(date.getHours()) + ':' + addZero(date.getMinutes()) + ') ';
        return dateStr;
    }

    function multiSelectChange(ev) {
        var $selectContainer = $(ev.target).parents('.multi-select-container');
        var $selectValues = $selectContainer.parents('.td-inner').find('.multi-select-values');

        var valArr = [];
        var textArr = [];
        var $checkboxes = $selectContainer.find('input[type="checkbox"]');
        $checkboxes.each(function() {
            var $checkbox = $(this);
            if ($checkbox.is(':checked')) {
                valArr.push($checkbox.val());
                textArr.push($checkbox.parents('li').text());
            }
        });
        $selectValues.text(textArr.join(',')).attr('rel', valArr.join(','));
    }

    function addZero(val) {
        return val < 10 ? '0' + val : val;
    }

    // =====end utility function

    function getAppAgants(appId) {
        if (appsAgents[appId]) {
            return Promise.resolve(appsAgents[appId]);
        }

        return Promise.resolve().then(() => {
            if (appsAgents[appId]) {
                return appsAgents[appId];
            }

            if (!(groups && groupsUsers)) {
                return Promise.all([
                    api.groups.findAll(userId),
                    api.users.find(userId)
                ]).then(function(resJsons) {
                    groups = resJsons.shift().data;
                    groupsUsers = resJsons.shift().data;
                });
            }
        }).then(function() {
            var agents = {};

            for (var groupId in groups) {
                var group = groups[groupId];

                for (var i in group.app_ids) {
                    var _appId = group.app_ids[i];

                    if (_appId === appId) {
                        for (var memberId in group.members) {
                            var memberUserId = group.members[memberId].user_id;
                            if (!agents[memberUserId]) {
                                agents[memberUserId] = {
                                    name: groupsUsers[memberUserId].name,
                                    email: groupsUsers[memberUserId].email
                                };
                            }
                        }
                        break;
                    }
                }
            }

            appsAgents[appId] = agents;
            return appsAgents[appId];
        });
    }
})();
