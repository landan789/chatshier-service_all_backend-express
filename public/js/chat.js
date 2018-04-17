/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var LOADING_MSG_AND_ICON = '<p class="message-time"><strong><i>' + 'Loading History Messages...' + '</i></strong><span class="loadingIcon"></span></p>';
    var NO_HISTORY_MSG = '<p class="message-time"><strong><i>' + '-沒有更舊的歷史訊息-' + '</i></strong></p>';
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
    var CHATSHIER_LOGO = '/image/logo-no-transparent.png';

    var SOCKET_NAMESPACE = '/chatshier';
    var BREAKPOINT_SM = 576;

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
    var appsChatrooms = {};
    var appsFields = {};
    var appsAgents = {};
    var consumers = {};
    var groups = {};
    var users = {};

    // selectors
    var $submitMessageInput = $('#submitMessageInput'); // 訊息欄
    var $ctrlPanelChatroomCollapse = $('#ctrlPanelChatroomCollapse');
    var $chatroomBody = $('#chatContentPanel .chatroom-body'); // 聊天室空間
    var $profilePanel = $('#profilePanel');
    var $profileWrapper = $profilePanel.find('.profile-wrapper');
    var $ticketPanel = $('#ticketPanel');
    var $ticketWrapper = $ticketPanel.find('.ticket-wrapper');
    var $mediaBtns = $('.media-btn');

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
            var emojis = text.match(wechatEmojiRegex) || [];
            var newText = text;
            for (var i = 0; i < emojis.length; i++) {
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
        var $ticketAddModal = $('#ticketAddModal');
        var $ticketEditModal = $('#ticketEditModal');

        var api = window.restfulAPI;
        var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;
        var instance = new TicketTableCtrl();
        var tickets = null;

        // ==========
        // #region 通用函式宣告

        var priorityColor = function(priority) {
            var colors = {
                1: '#33ccff',
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

        var generateSelect = function(prop, n, val) {
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

        var dueDate = function(day) {
            var nowTime = Date.now();
            var dueday = Date.parse(displayDate(day));
            var hr = dueday - nowTime;
            hr /= 1000 * 60 * 60;
            return hr < 0 ? '<span class="overdue">過期</span>' : '<span class="non overdue">即期</span>';
        };

        // #endregion
        // ==========

        function TicketTableCtrl() {
            var $ticketEditTable = $ticketEditModal.find('#ticketEditTable');
            var $dueDatetimePicker = $ticketEditTable.find('.ticket-due-time .datetime-picker');
            var datetimePickerInitOpts = {
                sideBySide: true,
                locale: 'zh-tw',
                icons: {
                    time: 'far fa-clock',
                    date: 'far fa-calendar-alt',
                    up: 'fas fa-chevron-up',
                    down: 'fas fa-chevron-down',
                    previous: 'fas fa-chevron-left',
                    next: 'fas fa-chevron-right',
                    today: 'fas fa-sun',
                    clear: 'far fa-trash-alt',
                    close: 'fas fa-times'
                }
            };
            $dueDatetimePicker.datetimepicker(datetimePickerInitOpts);
        }

        TicketTableCtrl.prototype.ticketSearch = function() {
            var $ticketTable = $(this).parentsUntil('.ticket').last();
            var $tableRows = $ticketTable.find('.ticket-body tr');
            var searchStr = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
            $tableRows.removeClass('d-none').filter(function() {
                var text1 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
                return !~text1.indexOf(searchStr);
            }).addClass('d-none');
        };

        TicketTableCtrl.prototype.loadTickets = function(appId, userId, platformUid) {
            var $ticketGroup = $('.ticket-group[app-id="' + appId + '"][platform-uid="' + platformUid + '"]');
            var $ticketTable = $ticketGroup.find('.ticket-table');
            var $ticketBody = $ticketTable.find('.ticket-body');
            $ticketBody.empty();

            return api.appsTickets.findAll(appId, userId).then(function(resJson) {
                var appsTickets = resJson.data;
                var chatroomId = $ticketGroup.attr('chatroom-id');

                if (appsTickets[appId]) {
                    tickets = appsTickets[appId].tickets || {};

                    for (var ticketId in tickets) {
                        var ticket = tickets[ticketId];
                        if (ticket.isDeleted ||
                            platformUid !== ticket.platformUid ||
                            (ticket.assigned_id && ticket.assigned_id !== userId)) {
                            continue;
                        }

                        var dueTimeDateStr = new Date(new Date(ticket.dueTime) - timezoneGap).toJSON().split('T').shift();
                        $ticketBody.prepend(
                            '<tr ticket-id="' + ticketId + '" class="ticket-row" data-toggle="modal" data-target="#ticketEditModal">' +
                                '<td class="status" style="border-left: 5px solid ' + priorityColor(ticket.priority) + '">' + statusNumberToText(ticket.status) + '</td>' +
                                '<td>' + dueTimeDateStr + '</td>' +
                                '<td class="ticket-description">' + ticket.description + '</td>' +
                                '<td></td>' +
                            '</tr>'
                        );
                    }
                }

                // 待辦事項載入完成後，由於相依的 appId 可能變更，因此將以下的事件重新綁定
                $ticketAddModal.find('#addTicketBtn').off('click').on('click', function() {
                    instance.addTicket(appId);
                });

                $ticketAddModal.off('show.bs.modal').on('show.bs.modal', function() {
                    var agents = appsAgents[appId].agents;
                    var $consumerNameSelect = $ticketAddModal.find('select#add-form-name');
                    var $platformUidElem = $ticketAddModal.find('input#add-form-uid');
                    var $messagerEmailElem = $ticketAddModal.find('input#add-form-email');
                    var $messagerPhoneElem = $ticketAddModal.find('input#add-form-phone');
                    var $assignedSelectElem = $ticketAddModal.find('select#assigned-name');

                    // 在聊天室中的代辦事項已經知道所屬的 app 因此不需要讓使用者選擇 app
                    var $appContainerElem = $ticketAddModal.find('.select-app-container');
                    !$appContainerElem.hasClass('d-none') && $appContainerElem.addClass('d-none');

                    var consumer = consumers[platformUid];
                    $consumerNameSelect.empty();
                    $consumerNameSelect.append('<option value=' + platformUid + '>' + consumer.name + '</option>');

                    $assignedSelectElem.empty();
                    if (agents && Object.keys(agents).length > 0) {
                        for (var agentId in agents) {
                            $assignedSelectElem.append('<option value=' + agentId + '>' + agents[agentId].name + '</option>');
                        }
                    } else {
                        $assignedSelectElem.append('<option value="">無資料</option>');
                    }

                    var updateInfo = function(selectedUid) {
                        if (!selectedUid) {
                            $platformUidElem.prop('value', '');
                            $messagerEmailElem.prop('value', '');
                            $messagerPhoneElem.prop('value', '');
                            return;
                        }

                        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
                        $platformUidElem.prop('value', selectedUid);
                        $messagerEmailElem.prop('value', messager.email);
                        $messagerPhoneElem.prop('value', messager.phone);
                    };
                    updateInfo($consumerNameSelect.val());

                    $consumerNameSelect.off('change').on('change', function(ev) {
                        var platformUid = ev.target.value;
                        updateInfo(platformUid);
                    });
                });

                $ticketTable.off('keyup').on('keyup', '.ticket-search-bar', instance.ticketSearch);
                $ticketBody.off('click').on('click', '.ticket-row', instance.showTicketDetail);
            });
        };

        TicketTableCtrl.prototype.showTicketDetail = function() {
            // 從觸發的元件的位置往上找到對應的表格元素
            // 由於 appId 與 platformUid 有用來設置表格屬性
            // 因此從 DOM 元素中取得待辦事項的相關數據
            var $ticketBody = $(this).parentsUntil('table').last();
            var platformUid = $ticketBody.attr('platform-uid');

            var $ticketGroup = $ticketBody.parentsUntil('.ticket-wrapper').last();
            var appId = $ticketGroup.attr('app-id');

            var ticketId = $(this).attr('ticket-id');
            var ticket = tickets[ticketId];
            var consumer = consumers[platformUid];

            $ticketEditModal.find('.id-number').css('background-color', priorityColor(ticket.priority));
            $ticketEditModal.find('.modal-header').css('border-bottom', '3px solid ' + priorityColor(ticket.priority));

            var $ticketEditTable = $ticketEditModal.find('#ticketEditTable');
            $ticketEditTable.find('.consumer-name').text(consumer.name || '');
            $ticketEditTable.find('.ticket-priority').html(generateSelect('priority', ticket.priority));
            $ticketEditTable.find('.ticket-status').html(generateSelect('status', ticket.status));
            $ticketEditTable.find('.ticket-description textarea').val(ticket.description);
            $ticketEditTable.find('.ticket-assigned').html(generateSelect('assigned', appsAgents[appId].agents, ticket.assigned_id));
            $ticketEditTable.find('.ticket-due-time .datetime-picker').data('DateTimePicker').date(new Date(ticket.dueTime));
            $ticketEditTable.find('.due-time-text').html('到期時間' + dueDate(ticket.dueTime));
            $ticketEditTable.find('.ticket-created-time').text(displayDate(ticket.createdTime));
            $ticketEditTable.find('.ticket-updated-time').text(displayDate(ticket.updatedTime));

            $ticketEditModal.find('#ticket_info_modify').off('click').on('click', function() {
                instance.updateTicket(appId, ticketId);
            });

            $ticketEditModal.find('#ticket_info_delete').off('click').on('click', function() {
                instance.deleteTicket(appId, ticketId);
            });
        };

        TicketTableCtrl.prototype.addTicket = function(appId) {
            var platformUid = $ticketAddModal.find('select#add-form-name option:selected').val();
            var assignedId = $ticketAddModal.find('select#assigned-name option:selected').val();
            var description = $ticketAddModal.find('textarea#add_form_description').val();

            if (!description) {
                $.notify('請輸入說明內容', { type: 'danger' });
            } else if (!platformUid) {
                $.notify('請選擇目標客戶', { type: 'danger' });
            } else if (!assignedId) {
                $.notify('請選擇指派人', { type: 'danger' });
            } else {
                var status = parseInt($ticketAddModal.find('#add-form-status option:selected').val(), 10);
                var priority = parseInt($ticketAddModal.find('#add-form-priority option:selected').val(), 10);
                var assignedName = $ticketAddModal.find('select#assigned-name option:selected').text();

                var newTicket = {
                    description: description || '',
                    dueTime: Date.now() + (86400000 * 3), // 過期時間預設為3天後
                    priority: priority,
                    platformUid: platformUid,
                    status: status,
                    assigned_id: assignedId
                };

                return api.appsTickets.insert(appId, userId, newTicket).then(function() {
                    $.notify('待辦事項已新增，指派人: ' + assignedName, { type: 'success' });
                    instance.loadTickets(appId, userId, platformUid);
                }).catch(function() {
                    $.notify('待辦事項新增失敗，請重試', { type: 'danger' });
                }).then(function() {
                    $ticketAddModal.modal('hide');
                });
            }
        };

        TicketTableCtrl.prototype.updateTicket = function(appId, ticketId) {
            var $ticketEditTable = $ticketEditModal.find('#ticketEditTable');
            var priority = parseInt($ticketEditTable.find('.ticket-priority select option:selected').val());
            var status = parseInt($ticketEditTable.find('.ticket-status select option:selected').val());
            var description = $ticketEditTable.find('.ticket-description textarea').val();
            var dueTime = $ticketEditTable.find('.ticket-due-time .datetime-picker').data('DateTimePicker').date().toDate().getTime();

            var $assignedElem = $ticketEditTable.find('.ticket-assigned select option:selected');
            var assignedId = $assignedElem.val();
            var assignedName = $assignedElem.text();

            // 準備要修改的 ticket json 資料
            var ticket = {
                description: description,
                dueTime: dueTime,
                priority: priority,
                status: status,
                assigned_id: assignedId
            };

            // 發送修改請求 api 至後端進行 ticket 修改
            return api.appsTickets.update(appId, ticketId, userId, ticket).then(function(resJson) {
                $.notify('待辦事項已更新，指派人: ' + assignedName, { type: 'success' });
                var appsTickets = resJson.data;
                var platformUid = appsTickets[appId].tickets[ticketId].platformUid;
                instance.loadTickets(appId, userId, platformUid);
            }).catch(function() {
                $.notify('待辦事項更新失敗，請重試', { type: 'danger' });
            });
        };

        TicketTableCtrl.prototype.deleteTicket = function(appId, ticketId) {
            if (confirm('確認刪除表單？')) {
                return api.appsTickets.remove(appId, ticketId, userId).then(function(resJson) {
                    $.notify('待辦事項已刪除', { type: 'success' });
                    var appsTickets = resJson.data;
                    var platformUid = appsTickets[appId].tickets[ticketId].platformUid;
                    instance.loadTickets(appId, userId, platformUid);
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
    $profilePanel.addClass('d-none');

    // =====start chat event=====
    $(document).on('click', '.chat-app-item', showChatApp);
    $(document).on('click', '.ctrl-panel .tablinks', clickUserTablink);
    $(document).on('click', '.tablinks-area .tablinks', clickUserTablink);
    $(document).on('focus', '.message-input-container #submitMessageInput', readClientMsg); // 已讀客戶訊息
    $(document).on('click', '.message-input-container #submitMessageBtn', submitMessage); // 訊息送出
    $mediaBtns.on('click', triggerFileUpload); // 傳圖，音，影檔功能
    $('.ghost-file').on('change', fileUpload); // 傳圖，音，影檔功能
    $('[data-toggle="tooltip"]').tooltip();
    $submitMessageInput.on('keydown', function(ev) { // 按enter可以發送訊息
        (13 === ev.keyCode) && $('.message-input-container #submitMessageBtn').click();
    });
    // =====end chat event=====

    // =====start profile event=====
    $(document).on('keypress', '.user-info-td[modify="true"] input[type="text"]', userInfoKeyPress);
    $(document).on('click', '.profile-confirm button', userInfoConfirm);
    $(document).on('click', '.photo-choose', groupPhotoChoose);
    $(document).on('change', '.photo-ghost', groupPhotoUpload);
    // =====end profile event=====

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
        api.appsChatrooms.findAll(userId),
        api.appsFields.findAll(userId),
        api.consumers.findAll(userId),
        api.groups.findAll(userId),
        api.users.find(userId)
    ]).then(function(responses) {
        apps = responses.shift().data;
        appsChatrooms = responses.shift().data;
        appsFields = responses.shift().data;
        consumers = responses.shift().data;
        groups = responses.shift().data;
        users = responses.shift().data;

        var socketRegPromises = [];
        for (var appId in apps) {
            if (!appsChatrooms[appId]) {
                appsChatrooms[appId] = { chatrooms: {} };
            }

            if (!appsFields[appId]) {
                appsFields[appId] = { fields: {} };
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

            // 向 server 登記此 socket 有多少 appId
            socketRegPromises.push(new Promise(function(resolve) {
                chatshierSocket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId, function() {
                    resolve();
                });
            }));
        }
        return Promise.all(socketRegPromises);
    }).then(function() {
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
            var chatroomId = socketBody.chatroom_id;
            var messagersFromSocket = socketBody.messagers;
            var messages = socketBody.messages;
            var senderUid = socketBody.senderUid;
            var recipientUid = socketBody.recipientUid;
            var consumerinfo = socketBody.consumerinfo;
            var senderMsger;

            // 根據發送的時間從早到晚排序
            messages.sort(function(a, b) {
                return new Date(a.time).getTime() - new Date(b.time).getTime();
            });

            var chatrooms = appsChatrooms[appId].chatrooms;
            var chatroom = chatrooms[chatroomId];
            if (!chatroom) {
                chatroom = chatrooms[chatroomId] = {};
            }
            var messagers = chatroom.messagers;
            if (!messagers) {
                messagers = chatroom.messagers = {};
            }

            if (messagersFromSocket) {
                messagers = chatroom.messagers = Object.assign(messagers, messagersFromSocket);
            }
            var messagerSelf = findMessagerSelf(appId, chatroomId);

            var nextMessage = function(i) {
                if (i >= messages.length) {
                    return Promise.resolve();
                }
                
                var message = messages[i];
                var senderMsgerId = message.messager_id;
                senderMsger = messagers[senderMsgerId];
                return Promise.resolve().then(function() {
                    if (SYSTEM === message.from) {
                        return users[userId];
                    }
                    !senderUid && senderMsger && (senderUid = senderMsger.platformUid);
                    var sender = CHATSHIER === message.from ? users[senderUid] : consumers[senderUid];

                    // 如果前端沒資料代表是新用戶
                    // 因此需要再發一次 api 來獲取新的用戶資料
                    if (!sender) {
                        if (CHATSHIER === message.from) {
                            return api.users.find(userId).then(function(resJson) {
                                users = resJson.data;
                                sender = users[senderUid];
                                return sender;
                            });
                        } else {
                            return api.consumers.findOne(senderUid, userId).then(function(resJson) {
                                consumers = resJson.data;
                                sender = consumers[senderUid];
                                return sender;
                            });
                        }
                    }
                    // 如果 sender 在前端有資料的話直接往下傳
                    return sender;
                }).then(function(sender) {
                    chatroom.messages = chatroom.messages || {};
                    chatroom.messages[message._id] = message;
                    senderUid !== userId && CHATSHIER === message.from && messagerSelf.unRead++;
                    if (chatroomList.indexOf(chatroomId) < 0) {
                        var uiRequireData = {
                            appId: appId,
                            name: apps[appId].name,
                            type: apps[appId].type,
                            platformUid: senderUid,
                            chatroomId: chatroomId,
                            chatroom: chatroom,
                            person: sender
                        };
                        createChatroom(uiRequireData);
                        createProfilePanel(uiRequireData);
                        createTicketPanel(uiRequireData);
                        return;
                    }
                    senderMsger = Object.assign(senderMsger,consumerinfo);
                    updateClientTab(senderMsger, message, appId, chatroomId); // update 客戶清單
                    updateMessagePanel(senderMsger, message, appId, chatroomId); // update 聊天室

                    // 更新 consumer chat information 資料
                    var consumer = CHATSHIER === message.from ? consumers[recipientUid] : consumers[senderUid];
                    if (senderUid && consumer) {
                        var consumerUid = consumer.platformUid;
                        var $profileCard = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + consumerUid + '"]');
                        $profileCard.find('.panel-table').remove();
                        consumer.name = consumerinfo.name;
                        consumer.photo = consumerinfo.photo;
                        var newProfileNode = $.parseHTML(generatePersonProfileHtml(appId, chatroomId, consumerUid, consumer));
                        $(newProfileNode.shift()).insertAfter($profileCard.find('.photo-container'));
                        $profileCard.find('.consumer-avatar.larger').attr('src',consumer.photo);
                    }
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
            var platformUid = data.platformUid;
            var chatroomId = data.chatroomId;
            var messager = data.messager;
            var consumer = consumers[platformUid];
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messager._id] = messager;

            // 檢查 messager 更新內容的 assigned_ids 是否有包含自已
            // 有的話檢查此聊天室是否已有被加入至已指派
            // 沒有的話複製聊天室的 tablink 至已指派中
            var app = apps[appId];
            var assignedIds = messager.assigned_ids;
            var $assignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.assigned');
            var $unassignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unassigned');
            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]';
            var $appChatroom = $ctrlPanelChatroomCollapse.find('.collapse.app-types[app-type="' + app.type + '"] ' + tablinksSelectQuery);
            if (assignedIds.indexOf(userId) >= 0) {
                $unassignedCollapse.find(tablinksSelectQuery).remove();
                var $assignedChatroom = $assignedCollapse.find(tablinksSelectQuery);
                if (0 === $assignedChatroom.length) {
                    $assignedCollapse.prepend($appChatroom.clone());
                }
            } else {
                $assignedCollapse.find(tablinksSelectQuery).remove();
                var $unassignedChatroom = $unassignedCollapse.find(tablinksSelectQuery);
                if (0 === $unassignedChatroom.length) {
                    $unassignedCollapse.prepend($appChatroom.clone());
                }
            }

            // 更新 UI 資料
            var $profileCards = $('.profile-group[app-id="' + appId + '"][platform-uid="' + platformUid + '"]');
            $profileCards.find('.panel-table').remove();

            $profileCards.each(function() {
                var $profileCard = $(this);
                var chatroomId = $profileCard.attr('chatroom-id');
                var newProfileNode = $.parseHTML(generatePersonProfileHtml(appId, chatroomId, platformUid, consumer));
                $(newProfileNode.shift()).insertAfter($profileCard.find('.photo-container'));
            });
        });
    }

    function generateAppsIcons(apps) {
        var $chatAppList = $('#chatAppList');
        var $ctrlPanel = $('#ctrlPanel');
        var $lineSideCollapse = $ctrlPanel.find('.line-collapse').empty();
        var $fbSideCollapse = $ctrlPanel.find('.fb-collapse').empty();
        var $wechatSideCollapse = $ctrlPanel.find('.wechat-collapse').empty();
        var $chatshierSideCollapse = $ctrlPanel.find('.chatshier-collapse').empty();

        for (var appId in apps) {
            var app = apps[appId];

            var buildHtml = function(type, imgSrc) {
                var html =
                    '<div class="chat-app-item" app-type="' + type + '" rel="' + appId + '" open="true" data-toggle="tooltip" data-placement="right" title="' + app.name + '">' +
                        '<img class="software-icon" src="' + imgSrc + '">' +
                        '<div class="unread-count d-none"></div>' +
                    '</div>';
                return html;
            };

            var tabAppItem = '';
            switch (app.type) {
                case LINE:
                    tabAppItem = buildHtml(app.type, LINE_LOGO);
                    $lineSideCollapse.append(
                        '<li class="text-light nested list-group-item app-bot" app-id="' + appId + '">' +
                            '<i class="fab fa-line"></i>' +
                            '<span>' + app.name + '</span>' +
                        '</li>'
                    );
                    break;
                case FACEBOOK:
                    tabAppItem = buildHtml(app.type, FACEBOOK_LOGO);
                    $fbSideCollapse.append(
                        '<li class="text-light nested list-group-item app-bot" app-id="' + appId + '">' +
                            '<i class="fab fa-facebook-messenger"></i>' +
                            '<span>' + app.name + '</span>' +
                        '</li>'
                    );
                    break;
                case WECHAT:
                    tabAppItem = buildHtml(app.type, WECHAT_LOGO);
                    $wechatSideCollapse.append(
                        '<li class="text-light nested list-group-item app-bot" app-id="' + appId + '">' +
                            '<i class="fab fa-weixin"></i>' +
                            '<span>' + app.name + '</span>' +
                        '</li>'
                    );
                    break;
                case CHATSHIER:
                    $chatshierSideCollapse.append(
                        '<li class="text-light nested list-group-item app-bot" app-id="' + appId + '">' +
                            '<i class="fas fa-copyright"></i>' +
                            '<span>' + app.name + '</span>' +
                        '</li>'
                    );
                    break;
                default:
                    break;
            }
            tabAppItem && $chatAppList.prepend(tabAppItem);
        }
    }

    function responseChatData(apps) {
        // 先根據目前支援的聊天室種類，建立 Apps collapse 分類
        $ctrlPanelChatroomCollapse.append(
            '<li class="text-light nested list-group-item has-collapse unread">' +
                '<i class="fas fa-user-times"></i>' +
                '<span>未讀</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested unread show"></div>' +
            '<li class="text-light nested list-group-item has-collapse assigned">' +
                '<i class="fas fa-check-circle"></i>' +
                '<span>已指派</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested assigned show"></div>' +
            '<li class="text-light nested list-group-item has-collapse unassigned">' +
                '<i class="fas fa-times-circle"></i>' +
                '<span>未指派</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested unassigned show"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + LINE + '">' +
                '<img class="app-icon" src="' + LINE_LOGO + '" />' +
                '<span>' + LINE + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + LINE + '"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + FACEBOOK + '">' +
                '<img class="app-icon" src="' + FACEBOOK_LOGO + '" />' +
                '<span>' + FACEBOOK + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + FACEBOOK + '"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + CHATSHIER + '">' +
                '<img class="app-icon" src="' + CHATSHIER_LOGO + '" />' +
                '<span>' + CHATSHIER + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + CHATSHIER + '"></div>'
        );

        for (var appId in apps) {
            var app = apps[appId];
            var chatrooms = appsChatrooms[appId].chatrooms;

            for (var chatroomId in chatrooms) {
                var uiRequireData = {
                    appId: appId,
                    name: app.name,
                    type: app.type,
                    chatroomId: chatroomId,
                    chatroom: chatrooms[chatroomId]
                };

                switch (app.type) {
                    case LINE:
                    case FACEBOOK:
                    case WECHAT:
                        var platformMessager = findChatroomMessager(appId, chatroomId, app.type);
                        var platformUid = platformMessager.platformUid;
                        uiRequireData.person = consumers[platformUid];
                        uiRequireData.platformUid = platformUid;
                        break;
                    // Profile UI 部分改顯示為聊天室資訊而非對話者的資訊
                    default:
                        uiRequireData.person = Object.assign({}, users[userId]);
                        uiRequireData.person.photo = '/image/group.png';
                        uiRequireData.platformUid = userId;
                        break;
                }

                createChatroom(uiRequireData);
                createProfilePanel(uiRequireData);
                createTicketPanel(uiRequireData);
            }
        }

        // 根據訊息時間排序聊天室(訊息時間越晚越上面)
        var sortByMessageTime = function(elA, elB) {
            var tA = parseInt(new Date($(elA).find('.client-message').attr('message-time')).getTime());
            var tB = parseInt(new Date($(elB).find('.client-message').attr('message-time')).getTime());
            return tA < tB;
        };

        var $tablinksArea = $('#person .tablinks-area');
        var $clients = $tablinksArea.find('#clients');
        var $clientTabs = $clients.find('.tablinks');
        $clientTabs.sort(sortByMessageTime);

        $clients.empty();
        $clients.append($clientTabs);
    }

    function generateLoadingJqElem() {
        return $($.parseHTML(
            '<div class="loading-container">' +
                '<img src="image/loading.gif" alt="loading..." />' +
            '</div>'
        ).shift());
    }

    function generateChatroomItemHtml(opts) {
        var unReadStr = opts.unRead > 99 ? '99+' : ('' + opts.unRead);
        var chatroomName = CHATSHIER === opts.appType ? '群組聊天室' : opts.clientName;
        var html = (
            '<li class="text-light nested list-group-item tablinks" ' + 'app-id="' + opts.appId + '" chatroom-id="' + opts.chatroomId + '" app-type="' + opts.appType + '" platform-uid="' + opts.platformUid + '">' +
                '<i class="fas fa-comment-dots"></i>' +
                '<span class="app-name' + (opts.unRead ? ' font-weight-bold' : '') + '">' + chatroomName + '</span>' +
                '<span class="unread-msg badge badge-pill ml-auto bg-warning' + (!opts.unRead ? ' d-none' : '') + '">' + unReadStr + '</span>' +
            '</li>'
        );
        return html;
    }

    function generateClientHtml(opts) {
        var unReadStr = opts.unRead > 99 ? '99+' : ('' + opts.unRead);
        opts.clientPhoto = opts.clientPhoto || '/image/user_large.png';

        var html =
            '<button class="tablinks" ' + 'app-id="' + opts.appId + '" chatroom-id="' + opts.chatroomId + '" platform-uid="' + opts.platformUid + '" app-type="' + opts.appType + '">' +
                '<div class="img-holder">' +
                    '<img class="consumer-avatar" src="' + opts.clientPhoto + '" alt="無法顯示相片" />' +
                    '<img class="software-icon" src="' + opts.iconSrc + '">' +
                '</div>' +
                '<div class="msg-holder">' +
                    '<b><span class="client-name">' + opts.clientName + '</span>' + opts.messageHtml + '</b>' +
                '</div>' +
                '<div class="app-name"><snap>' + opts.appName + '</snap></div>' +
                '<div class="chsr unread-msg badge badge-pill bg-warning' + (!opts.unRead ? ' d-none' : '') + '">' + unReadStr + '</div>' +
            '</button>';
        return html;
    }

    function generateMessageHtml(srcHtml, message, messager, appType) {
        if (messager && SYSTEM !== message.from) {
            var platformUid = messager.platformUid;
            var sender = CHATSHIER === messager.type ? users[platformUid] : consumers[platformUid];
        }
        var senderrName = SYSTEM === message.from ? '由系統發送' : (messager.name || '');
        var isMedia = srcHtml.startsWith('<img') || srcHtml.startsWith('<audio') || srcHtml.startsWith('<video');

        // 如果訊息是來自於 Chatshier 或 系統自動回覆 的話，訊息一律放在右邊
        // 如果訊息是來自於其他平台的話，訊息一律放在左邊
        var shouldRightSide =
            (appType !== CHATSHIER && (SYSTEM === message.from || CHATSHIER === message.from)) ||
            (appType === CHATSHIER && userId === platformUid);

        return (
            '<div class="message" message-time="' + message.time + '" message-type="' + message.type + '">' +
                '<div class="messager-name' + (shouldRightSide ? ' text-right' : '') + '">' +
                    '<span>' + (senderrName || '') + '</span>' +
                '</div>' +
                '<span class="message-group ' + (shouldRightSide ? ' align-right' : '') + '">' +
                    '<span class="content ' + (isMedia ? 'media' : 'words') + '">' + srcHtml + '</span>' +
                    '<span class="send-time">' + toTimeStr(message.time) + '</span>' +
                    '<strong></strong>' +
                '</span>' +
                '<br/>' +
            '</div>'
        );
    }

    function createChatroom(requireData) {
        var appId = requireData.appId;
        var appName = requireData.name;
        var appType = requireData.type;
        var person = requireData.person;
        var chatroom = requireData.chatroom;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;

        if (!(requireData && requireData.chatroom)) {
            return;
        }
        chatroomId && chatroomList.push(chatroomId);

        var messages = chatroom.messages || {};
        var messageIds = Object.keys(messages);
        var lastMessage = messages[messageIds[messageIds.length - 1]];

        // 左邊的客戶清單排列
        var messagers = chatroom.messagers || {};
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var clientUiOpts = {
            appId: appId,
            appName: appName,
            appType: appType,
            chatroomId: chatroomId,
            platformUid: platformUid,
            clientName: person.name,
            clientPhoto: person.photo,
            iconSrc: '',
            unRead: messagerSelf.unRead || 0,
            messageHtml: messageToClientHtml(lastMessage)
        };

        switch (appType) {
            case LINE:
                clientUiOpts.icon = 'fab fa-line';
                clientUiOpts.iconSrc = LINE_LOGO;
                break;
            case FACEBOOK:
                clientUiOpts.icon = 'fab fa-facebook-messenger';
                clientUiOpts.iconSrc = FACEBOOK_LOGO;
                break;
            case WECHAT:
                clientUiOpts.icon = 'fab fa-weixin';
                clientUiOpts.iconSrc = WECHAT_LOGO;
                break;
            case CHATSHIER:
            default:
                clientUiOpts.icon = 'fas fa-copyright';
                clientUiOpts.iconSrc = CHATSHIER_LOGO;
                break;
        }
        var tablinkHtml = generateClientHtml(clientUiOpts);
        $('#clients').prepend(tablinkHtml);

        var chatroomItemHtml = generateChatroomItemHtml(clientUiOpts);
        var $appCollapse = $ctrlPanelChatroomCollapse.find('.collapse[app-type="' + appType + '"]');
        var $chatroomCollapse = $appCollapse.find('.collapse[app-id="' + appId + '"]');
        if (0 === $chatroomCollapse.length) {
            $appCollapse.append(
                '<li class="text-light nested list-group-item has-collapse" app-id="' + appId + '" app-type="' + appType + '">' +
                    '<i class="' + clientUiOpts.icon + '"></i>' +
                    '<span>' + appName + '</span>' +
                    '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
                '</li>' +
                '<div class="collapse nested show" app-id="' + appId + '" app-type="' + appType + '">' +
                    chatroomItemHtml +
                '</div>'
            );
        } else {
            $chatroomCollapse.prepend(chatroomItemHtml);
        }

        // 如果此聊天室有未讀訊息的話將此聊天室新增至未讀列表
        if (messagerSelf.unRead) {
            $ctrlPanelChatroomCollapse.find('.collapse.unread').append(chatroomItemHtml);
        }

        // 如果非 Chatshier 內部聊天室，代表為平台聊天室
        // 檢查此聊天室的平台客戶是否有指派給自己
        // 將已指派與未指派的聊天室分門別類
        if (CHATSHIER !== appType) {
            var messagerConsumer = findChatroomMessager(appId, chatroomId, appType);
            var assignedIds = messagerConsumer.assigned_ids;
            if (assignedIds.indexOf(userId) >= 0) {
                $ctrlPanelChatroomCollapse.find('.collapse.assigned').append(chatroomItemHtml);
            } else {
                $ctrlPanelChatroomCollapse.find('.collapse.unassigned').append(chatroomItemHtml);
            }
        }

        // 聊天室訊息內容處理
        var messageText = '';
        if (messageIds.length < 10) {
            messageText += NO_HISTORY_MSG;
        }
        messageText += historyMsgToStr(messages, messagers, appType);
        $chatroomBody.append(
            '<div class="chat-content" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                '<div class="message-panel">' + messageText + '</div>' +
            '</div>'
        );

        // if (requireData.position) {
        //     $('.chat-content[app-id="' + appId + '"]' + '[chatroom-id="' + requireData.chatroomId + '"]').on('scroll', function() {
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

        // 根據發送的時間從早到晚排序
        var messageIds = Object.keys(messages);
        messageIds.sort(function(idA, idB) {
            return new Date(messages[idA].time).getTime() - new Date(messages[idB].time).getTime();
        });

        for (var i in messageIds) {
            var message = messages[messageIds[i]];
            var srcHtml = messageToPanelHtml(message);

            // this loop plus date info into history message, like "----Thu Aug 01 2017----"
            var d = new Date(message.time).toDateString(); // get msg's date
            if (d !== nowDateStr) {
                // if (now msg's date != previos msg's date), change day
                nowDateStr = d;
                returnStr += '<p class="message-time"><strong>' + nowDateStr + '</strong></p>'; // plus date info
            }
            if (message.time - prevTime > 15 * 60 * 1000) {
                // if out of 15min section, new a section
                returnStr += '<p class="message-time"><strong>' + toDateStr(message.time) + '</strong></p>'; // plus date info
            }
            prevTime = message.time;

            var messagerId = message.messager_id;
            var messager = messagers[messagerId];
            returnStr += generateMessageHtml(srcHtml, message, messager, appType);
        }
        return returnStr;
    }

    function createProfilePanel(requireData) {
        var appId = requireData.appId;
        var appType = requireData.type;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;
        var person = requireData.person;
        person.photo = person.photo || '/image/user_large.png';

        var profilePanelHtml = (
            '<div class="profile-group" app-id="' + appId + '" chatroom-id="' + chatroomId + '" platform-uid="' + platformUid + '">' +
                '<div class="person-profile profile-content table-responsive">' +
                    '<div class="photo-container">' +
                        '<img class="consumer-avatar larger" src="' + person.photo + '" alt="無法顯示相片" />' +
                    '</div>' +
                    (function generateProfileHtml() {
                        var html = '';

                        if (CHATSHIER !== appType) {
                            html = generatePersonProfileHtml(appId, chatroomId, platformUid, person) +
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
            '</div>'
        );
        $profileWrapper.append(profilePanelHtml);
    }

    function createTicketPanel(requireData) {
        var appId = requireData.appId;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;

        var ticketPanelHtml = (
            '<div class="ticket-group" app-id="' + appId + '" chatroom-id="' + chatroomId + '" platform-uid="' + platformUid + '">' +
                '<div class="person-ticket todo-tickets">' +
                    '<div class="chsr ticket">' +
                        '<table class="ticket-table">' +
                            '<thead>' +
                                '<tr>' +
                                    '<th class="sortable">狀態</th>' +
                                    '<th class="sortable">到期</th>' +
                                    '<th>' +
                                        '<input type="text" class="w-100 ticket-search-bar" placeholder="搜尋" />' +
                                    '</th>' +
                                    '<th class="chsr">' +
                                        '<span class="modal-toggler ticket-add" platform-uid="' + platformUid + '" data-toggle="modal" data-target="#ticketAddModal">' +
                                            '<i class="fas fa-plus fa-fw"></i>' +
                                            '<span>新增待辦</span>' +
                                        '</span>' +
                                    '</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody class="ticket-body" platform-uid="' + platformUid + '"></tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        $ticketWrapper.append(ticketPanelHtml);
    }

    function generatePersonProfileHtml(appId, chatroomId, platformUid, person) {
        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
        var customFields = messager.custom_fields || {};
        var messagerSelf = findMessagerSelf(appId, chatroomId);

        var messagerCase = ['age', 'email', 'gender', 'phone', 'remark', 'custom_fields'];
        var messagerSelfCase = ['createdTime', 'lastTime', 'chatCount'];

        var tdHtmlBuilder = function(fieldId, field) {
            var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;
            var setsTypeEnums = api.appsFields.enums.setsType;
            var readonly = field.type === api.appsFields.enums.type.SYSTEM;
            var fieldValue = '';

            if (field.type === api.appsFields.enums.type.CUSTOM) {
                fieldValue = customFields[fieldId] ? customFields[fieldId].value : '';
            } else {
                if (messagerCase.indexOf(field.alias) >= 0) {
                    fieldValue = undefined !== messager[field.alias] ? messager[field.alias] : '';
                } else if (messagerSelfCase.indexOf(field.alias) >= 0) {
                    fieldValue = undefined !== messagerSelf[field.alias] ? messagerSelf[field.alias] : '';
                } else {
                    fieldValue = undefined !== person[field.alias] ? person[field.alias] : '';
                }
            }

            // 在 html append 到 dom 上後，抓取資料找到指派人的欄位把資料填入
            if ('assigned' === field.alias) {
                // 指派人存放的位置在每個 chatroom 的 messager 裡
                // 取得 chatroom messager 的 assigned_ids 來確認有指派給 chatshier 那些 users
                var agents = appsAgents[appId].agents;
                var assignedIds = messager.assigned_ids;
                field.sets = [];
                fieldValue = [];

                for (var agentUserId in agents) {
                    field.sets.push({
                        agentUserId: agentUserId,
                        agentName: agents[agentUserId].name
                    });
                    fieldValue.push(0 <= assignedIds.indexOf(agentUserId));
                }
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
                    var selectValues = fieldValue instanceof Array ? fieldValue : [];
                    var multiSelectText = selectValues.reduce(function(output, value, i) {
                        if (!value) {
                            return output;
                        }

                        output.push('assigned' === field.alias ? field.sets[i].agentName : field.sets[i]);
                        return output;
                    }, []).join(',');

                    return '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                        '<div class="btn-group btn-block td-inner multi-select-wrapper">' +
                            '<button class="btn btn-light btn-border btn-block dropdown-toggle" data-toggle="dropdown" aria-expanded="false">' +
                                '<span class="multi-select-values">' + multiSelectText + '</span>' +
                                '<span class="caret"></span>' +
                            '</button>' +
                            '<div class="multi-select-container dropdown-menu">' +
                                (function(sets) {
                                    var checkboxes = '';
                                    for (var i in sets) {
                                        if (!sets[i]) {
                                            continue;
                                        }

                                        if ('assigned' === field.alias) {
                                            checkboxes +=
                                                '<span class="dropdown-item">' +
                                                    '<input type="checkbox" value="' + sets[i].agentUserId + '"' + (selectValues[i] ? ' checked="true"' : '') + '">' + sets[i].agentName +
                                                '</span>';
                                        } else {
                                            checkboxes +=
                                                '<span class="dropdown-item">' +
                                                    '<input type="checkbox" value="' + sets[i] + '"' + (selectValues[i] ? ' checked="true"' : '') + '">' + sets[i] +
                                                '</span>';
                                        }
                                    }
                                    return checkboxes;
                                })(field.sets) +
                            '</div>' +
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
                    }
                    return rowsHtml;
                })() +
            '</table>';

        return messagerProfileHtml;
    }

    function generateChatroomProfileHtml(appId, groupName) {
        var groupId = apps[appId].group_id;
        var members = groups[groupId].members;

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
                            for (var memberId in members) {
                                var memberUserId = members[memberId].user_id;
                                var memberUser = users[memberUserId];

                                html +=
                                    '<div class="person-chip">' +
                                        '<img src="' + (memberUser.photo || 'image/avatar-default.png') + '" class="person-avatar" alt="">' +
                                        '<span>' + memberUser.name + '</span>' +
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
        var $tablinksArea = $('#person .tablinks-area');
        var $allTablinks = $tablinksArea.find('.tablinks');

        switch (selectRel) {
            case 'all':
                $allTablinks.removeClass('d-none');
                break;
            case 'group':
                $allTablinks.addClass('d-none');
                $tablinksArea.find('.tablinks[app-type="' + CHATSHIER + '"]').removeClass('d-none');
                break;
            case 'unread':
                $tablinksArea.find('.unread-msg').each(function() {
                    var $unReadElem = $(this);
                    var $tablinkWrapper = $unReadElem.parentsUntil('.list-group').last();

                    if (!parseInt($unReadElem.text(), 10)) {
                        $tablinkWrapper.addClass('d-none');
                    } else {
                        $tablinkWrapper.removeClass('d-none');
                    }
                });
                break;
            case 'assigned':
            case 'unassigned':
                $allTablinks.addClass('d-none');
                var isFindAssigned = ('assigned' === selectRel);
                $('[alias="assigned"] .td-inner .multi-select-values').each(function() {
                    var assignedText = $(this).text();
                    var assignedUsers = assignedText ? assignedText.split(',') : [];

                    if ((isFindAssigned && assignedUsers.length) ||
                        (!isFindAssigned && !assignedUsers.length)) {
                        var $parentCard = $(this).parents('.profile-group');
                        var appId = $parentCard.attr('app-id');
                        $tablinksArea.find('.tablinks[app-id="' + appId + '"]').removeClass('d-none');
                    }
                });
                break;
            default:
                $allTablinks.addClass('d-none');
                $tablinksArea.find('.tablinks[app-id="' + selectRel + '"]').removeClass('d-none');
                break;
        }
    }

    function clickUserTablink() {
        var $targetTablink = $(this);
        var $messageInputContainer = $('.message-input-container');

        var appId = $targetTablink.attr('app-id');
        var appName = apps[appId].name;
        var appType = $targetTablink.attr('app-type');
        var chatroomId = $targetTablink.attr('chatroom-id');
        var platformUid = $targetTablink.attr('platform-uid');

        var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]';
        var $chatroomTablink = $ctrlPanelChatroomCollapse.find('.collapse[app-type="' + appType + '"] ' + tablinksSelectQuery);

        $('.tablinks.selected').removeClass('selected').css('background-color', '');
        $ctrlPanelChatroomCollapse.find(tablinksSelectQuery).addClass('selected').css('background-color', COLOR.CLICKED);

        var $navTitle = $('#navTitle');
        var chatroomTitle = document.title.replace(' | Chatshier', ' #' + appName);
        if (CHATSHIER !== appType) {
            chatroomTitle += ' (' + consumers[platformUid].name + ')';
        }
        $navTitle.text(chatroomTitle);

        var $unReadElem = $chatroomTablink.find('.unread-msg');
        if (parseInt($unReadElem.text(), 10)) {
            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                chatroomId: chatroomId,
                userId: userId
            });
            var messagerSelf = findMessagerSelf(appId, chatroomId);
            messagerSelf.unRead = 0;

            // 如果有未讀的話，將未讀數設為0之後，把未讀的區塊隱藏
            $chatroomTablink.find('.client-message').css('font-weight', 'normal'); // 取消未讀粗體
            $unReadElem.text(messagerSelf.unRead).addClass('d-none');
            $ctrlPanelChatroomCollapse.find('.collapse.unread .tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]').remove();
        }

        var $chatroomContainer = $('#chatWrapper .chatroom-container');
        $chatroomContainer.addClass('open');
        $chatroomContainer.find('.chat-content-panel').removeClass('d-none');
        // $chatroomContainer.find('.consumer-profile .display-name').text(appName);

        // 將聊天室訊息面板顯示，並將 scroll 滑至最下方
        var $messageWrapper = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $profileGroup = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        $messageInputContainer.removeClass('d-none');
        $messageWrapper.addClass('shown').removeClass('d-none');
        $messageWrapper.siblings().removeClass('shown').addClass('d-none');
        $profileGroup.removeClass('d-none');
        $profileGroup.siblings().addClass('d-none');
        scrollMessagePanelToBottom(appId, chatroomId);

        ticketTableCtrl.loadTickets(appId, userId, platformUid);

        var $ticketToggle = $('.toolbar #ticketToggle');
        var $profileToggle = $('.toolbar #profileToggle');
        $profileToggle.removeClass('d-none');

        if (window.innerWidth <= BREAKPOINT_SM) {
            $profileToggle.removeClass('active');
            $profilePanel.addClass('d-none');
        }

        if ($profileToggle.hasClass('active')) {
            $profilePanel.removeClass('d-none');
            $ticketPanel.addClass('d-none');
        }

        if ($ticketToggle.hasClass('active')) {
            $profilePanel.addClass('d-none');
            $ticketPanel.removeClass('d-none');
        }

        if (CHATSHIER === appType) {
            $ticketToggle.addClass('d-none');
            $ticketPanel.addClass('d-none');
        } else {
            $ticketToggle.removeClass('d-none');
        }

        $('#ctrlPanelBackdrop').addClass('d-none');
        var $ctrlPanel = $('#ctrlPanel');
        $ctrlPanel.addClass(['animating', 'slide-out']);
        $ctrlPanel.on('animationend oAnimationEnd webkitAnimationEnd', function() {
            $ctrlPanel.off('animationend oAnimationEnd webkitAnimationEnd');
            $ctrlPanel.removeClass(['animating', 'slide-out', 'animated']).addClass('d-none');
        });
    }

    function readClientMsg() {
        var $tablinksSelected = $('.tablinks.selected');
        var $unReadElem = $tablinksSelected.find('.unread-msg');

        if (parseInt($unReadElem.text(), 10)) {
            var appId = $tablinksSelected.attr('app-id');
            var chatroomId = $tablinksSelected.attr('chatroom-id');
            var platformUid = $tablinksSelected.attr('platform-uid');

            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                chatroomId: chatroomId,
                userId: userId
            });
            var messagerSelf = findMessagerSelf(appId, chatroomId);
            messagerSelf.unRead = 0;
            $unReadElem.text(messagerSelf.unRead).addClass('d-none');
            $ctrlPanelChatroomCollapse.find('.collapse.unread .tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]').remove();
        }
    }

    function submitMessage(ev) {
        ev.preventDefault();
        var $evElem = $(ev.target);
        var $contentPanel = $evElem.parentsUntil('.chat-content-panel');
        var $messageView = $contentPanel.siblings('.chatroom-body').find('.chat-content.shown');

        var appId = $messageView.attr('app-id');
        var appType = apps[appId].type;
        var chatroomId = $messageView.attr('chatroom-id');
        var platformMessager = findChatroomMessager(appId, chatroomId, appType);
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var msgText = $submitMessageInput.val();

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
            messager_id: messagerSelf._id
        };

        /** @type {ChatshierChatSocketBody} */
        var socketBody = {
            app_id: appId,
            type: appType,
            chatroom_id: chatroomId,
            senderUid: userId,
            recipientUid: platformMessager.platformUid,
            messages: [messageToSend]
        };

        var $loadingElem = generateLoadingJqElem();
        $messageView.find('.message-panel').append($loadingElem);
        scrollMessagePanelToBottom(appId, chatroomId);

        return new Promise(function(resolve) {
            $submitMessageInput.val('');
            chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, socketBody, function() {
                $loadingElem.remove();
                $loadingElem = void 0;
                resolve();
            });
        });
    }

    function fileUpload() {
        /** @type {HTMLInputElement} */
        var _this = this;
        if (!_this.files.length) {
            _this.value = '';
            return;
        }

        var $chatContentPanel = $(_this).parents('.chat-content-panel');
        var $messageView = $chatContentPanel.find('.chatroom-body .chat-content.shown');
        var appId = $messageView.attr('app-id');
        var chatroomId = $messageView.attr('chatroom-id');

        /** @type {File} */
        var file = _this.files[0];
        _this.value = ''; // 把 input file 值清空，使 change 事件對同一檔案可重複觸發

        var config = window.chatshier.config;
        if (file.type.indexOf('image') >= 0 && file.size > config.imageFileMaxSize) {
            $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        } else if (file.type.indexOf('video') >= 0 && file.size > config.videoFileMaxSize) {
            $.notify('影像檔案過大，檔案大小限制為: ' + Math.floor(config.videoFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        } else if (file.type.indexOf('audio') >= 0 && file.size > config.audioFileMaxSize) {
            $.notify('聲音檔案過大，檔案大小限制為: ' + Math.floor(config.audioFileMaxSize / (1024 * 1000)) + ' MB');
            return;
        }

        var $loadingElem = generateLoadingJqElem();
        $messageView.find('.message-panel').append($loadingElem);
        scrollMessagePanelToBottom(appId, chatroomId);

        var messageType = $(_this).data('type');
        var appType = apps[appId].type;
        var platformMessager = findChatroomMessager(appId, chatroomId, appType);
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var src = file;

        /** @type {ChatshierMessage} */
        var messageToSend = {
            text: '',
            src: src,
            type: messageType,
            from: CHATSHIER,
            time: Date.now(),
            messager_id: messagerSelf._id
        };
        /** @type {ChatshierChatSocketBody} */
        var socketBody = {
            app_id: appId,
            type: appType,
            chatroom_id: chatroomId,
            senderUid: userId,
            recipientUid: platformMessager.platformUid,
            messages: [messageToSend]
        };
        $submitMessageInput.val('');
        chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, socketBody, function() {
            $loadingElem.remove();
            $loadingElem = void 0;
        });
    }

    function triggerFileUpload(e) {
        var eId = $(this).data('id');
        $('#' + eId).trigger('click');
    }

    function findChatroomMessager(appId, chatroomId, appType) {
        var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
        var messagers = chatroom.messagers;

        // 從 chatroom 中找尋唯一的 consumer platformUid
        for (var messagerId in messagers) {
            var messager = messagers[messagerId];

            switch (appType) {
                case LINE:
                case FACEBOOK:
                case WECHAT:
                    if (appType === messager.type) {
                        return messager;
                    }
                    break;
                case CHATSHIER:
                default:
                    if (CHATSHIER === messager.type &&
                        userId === messager.platformUid) {
                        return messager;
                    }
                    break;
            }
        }
        return {};
    }

    function findMessagerSelf(appId, chatroomId) {
        var chatrooms = appsChatrooms[appId].chatrooms;
        var messagers = chatrooms[chatroomId].messagers;

        for (var messagerId in messagers) {
            var messager = messagers[messagerId];
            if (userId === messager.platformUid) {
                return messager;
            }
        }

        // 前端暫時用的資料，不會儲存至資料庫
        var _messagerSelf = {
            type: CHATSHIER,
            platformUid: userId,
            unRead: 0
        };
        messagers[userId] = _messagerSelf;
        return _messagerSelf;
    }

    function scrollMessagePanelToBottom(appId, chatroomId) {
        var $messageWrapper = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $messagePanel = $messageWrapper.find('.message-panel');
        $messagePanel.scrollTop($messagePanel.prop('scrollHeight'));
    }

    function updateMessagePanel(messager, message, appId, chatroomId) {
        /** @type {ChatshierMessage} */
        var _message = message;
        var appType = apps[appId].type;
        var srcHtml = messageToPanelHtml(_message);
        var $messagePanel = $('[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
        $messagePanel.find('.messager-name span').text(messager.name);
        if (chatroomList.indexOf(chatroomId) >= 0) {
            var lastMessageTime = parseInt($messagePanel.find('.message:last').attr('message-time'), 10);

            // 如果現在時間比上一筆聊天記錄多15分鐘的話，將視為新訊息
            if (_message.time - lastMessageTime >= 900000) {
                $messagePanel.append('<p class="message-time"><strong>-新訊息-</strong></p>');
            }
            var messageHtml = generateMessageHtml(srcHtml, _message, messager, appType);
            $messagePanel.append(messageHtml);
            scrollMessagePanelToBottom(appId, chatroomId);
        } else {
            // if its new user
            var historyMsgStr = NO_HISTORY_MSG;
            historyMsgStr += generateMessageHtml(srcHtml, _message, messager, appType);

            $chatroomBody.append(
                '<div class="chat-content" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                    '<div class="message-panel">' + historyMsgStr + '</div>' +
                '</div>'
            );
        }
    }

    function updateClientTab(messager, message, appId, chatroomId) {
        if (messager && SYSTEM !== message.from) {
            var platformUid = messager.platformUid;
            var sender = CHATSHIER === messager.type ? users[platformUid] : consumers[platformUid];
        }
        var senderName = SYSTEM === message.from ? 'Chatshier' : sender.name;

        // 收到 socket 訊息後，左側用戶列表更新發送者名稱及未讀數
        var $selectedTablinks = $('.tablinks-area').find(".tablinks[app-id='" + appId + "'][chatroom-id='" + chatroomId + "']");
        $selectedTablinks.find('.client-name').text(messager.name);
        $selectedTablinks.find('.consumer-avatar').attr("src",messager.photo);

        /** @type {ChatshierMessage} */
        var _message = message;
        var $msgElem = $selectedTablinks.find('.client-message');
        var srcHtml = messageToClientHtml(_message);
        $msgElem.html(srcHtml);
        $selectedTablinks.attr('data-recent-time', _message.time);

        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var currentUnread = messagerSelf.unRead;
        var $unreadMsgElem = $selectedTablinks.find('.unread-msg');

        if (!currentUnread) {
            $unreadMsgElem.text(0).addClass('d-none');
        } else {
            $unreadMsgElem.text(currentUnread > 99 ? '99+' : currentUnread).removeClass('d-none');
        }

        $selectedTablinks.remove();
        $('.tablinks-area>#clients').prepend($selectedTablinks);
    }

    function updateChatroomTab(messager, message, appId, chatroomId) {
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var currentUnread = messagerSelf.unRead;

        var $selectedTablinks = $('#ctrlPanelChatroomCollapse .tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $unreadMsgElem = $selectedTablinks.find('.unread-msg');

        if (!currentUnread) {
            $unreadMsgElem.text(0).addClass('d-none');
        } else {
            $unreadMsgElem.text(currentUnread > 99 ? '99+' : currentUnread).removeClass('d-none');
        }

        var $unreadCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unread');
        var $unreadChatroomTab = $unreadCollapse.find('.list-group-item[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        if (currentUnread && 0 === $unreadChatroomTab.length) {
            $unreadCollapse.prepend($selectedTablinks.clone());
        }
    }

    // =====end chat function=====

    // =====start profile function=====
    function userInfoKeyPress(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if (13 === code) {
            $(this).blur(); // 如果按了ENTER就離開此INPUT，觸發on blur事件
        }
    }

    function userInfoConfirm(ev) {
        if (!confirm('確定要更新對象用戶的個人資料嗎？')) {
            return;
        }

        $('.profile-wrapper').scrollTop(0);
        var messagerUiData = {};
        var $tds = $(ev.target).parents('.profile-group').find('.panel-table tbody td');

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
                    value = !isNaN(value) ? value : '';
                    break;
                case setsTypeEnums.DATE:
                    value = $tdDataElem.val();
                    value = value ? new Date(value).getTime() : 0;
                    break;
                case setsTypeEnums.CHECKBOX:
                    value = $tdDataElem.prop('checked');
                    break;
                case setsTypeEnums.MULTI_SELECT:
                    var $checkboxes = $tdDataElem.find('input[type="checkbox"]:checked');
                    var selectVals = [];
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
                    messagerUiData.custom_fields = messagerUiData.custom_fields || {};
                    messagerUiData.custom_fields[fieldId] = {
                        value: value
                    };
                }
            }
        });

        var phoneRule = /^0\d{9,}$/;
        var emailRule = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>().,;\s@"]+\.{0,1})+[^<>().,;:\s@"]{2,})$/;
        if ('number' === typeof messagerUiData.age && !(messagerUiData.age >= 0 && messagerUiData.age <= 150)) {
            $.notify('年齡限制 0 ~ 150 歲', { type: 'warning' });
            return;
        } else if (messagerUiData.email && !emailRule.test(messagerUiData.email)) {
            $.notify('電子郵件不符合格式', { type: 'warning' });
            return;
        } else if (messagerUiData.phone && !phoneRule.test(messagerUiData.phone)) {
            $.notify('電話號碼不符合格式, ex: 0912XXXXXX', { type: 'warning' });
            return;
        }

        var $personCard = $(this).parents('.profile-group');
        var appId = $personCard.attr('app-id');
        var chatroomId = $personCard.attr('chatroom-id');
        var platformUid = $personCard.attr('platform-uid');

        // 如果有編輯的資料變更再發出更新請求
        if (0 === Object.keys(messagerUiData).length) {
            return;
        }

        // 將 assigned 資料改為資料欄位名稱
        if (messagerUiData.assigned) {
            messagerUiData.assigned_ids = messagerUiData.assigned;
            delete messagerUiData.assigned;
        }

        var socketRequest = {
            params: {
                userid: userId,
                appid: appId,
                chatroomid: chatroomId,
                platformuid: platformUid
            },
            body: messagerUiData
        };

        // 資料送出後，會再收到群組內的 socket 資料
        // 設置 flag 防止再次更新 profile
        preventUpdateProfile = true;
        return new Promise(function(resolve, reject) {
            var waitTimer = window.setTimeout(reject, 3000);
            chatshierSocket.emit(SOCKET_EVENTS.UPDATE_MESSAGER_TO_SERVER, socketRequest, function(err) {
                window.clearTimeout(waitTimer);
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        }).then(function() {
            // 將成功更新的資料覆蓋前端本地端的全域 app 資料
            let messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
            Object.assign(messager, messagerUiData);

            // 檢查 messager 更新內容的 assigned_ids 是否有包含自已
            // 有的話檢查此聊天室是否已有被加入至已指派
            // 沒有的話複製聊天室的 tablink 至已指派中
            var app = apps[appId];
            var assignedIds = messager.assigned_ids;
            var $assignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.assigned');
            var $unassignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unassigned');
            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]';
            var $appChatroom = $ctrlPanelChatroomCollapse.find('.collapse.app-types[app-type="' + app.type + '"] ' + tablinksSelectQuery);
            if (assignedIds.indexOf(userId) >= 0) {
                $unassignedCollapse.find(tablinksSelectQuery).remove();
                var $assignedChatroom = $assignedCollapse.find(tablinksSelectQuery);
                if (0 === $assignedChatroom.length) {
                    $assignedCollapse.prepend($appChatroom.clone());
                }
            } else {
                $assignedCollapse.find(tablinksSelectQuery).remove();
                var $unassignedChatroom = $unassignedCollapse.find(tablinksSelectQuery);
                if (0 === $unassignedChatroom.length) {
                    $unassignedCollapse.prepend($appChatroom.clone());
                }
            }

            $.notify('用戶資料更新成功', { type: 'success' });
        }).catch(function() {
            $.notify('用戶資料更新失敗', { type: 'danger' });
        });
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

    // =====start search input change func=====
    /** @type {JQuery<HTMLElement>[]} */
    var $tablinks = [];
    var $panels = [];
    var $clientNameOrTexts = [];
    var $searchWapper = $('#ctrlPanel .message-search');
    var $searchInput = $searchWapper.find('.search-box');

    $searchInput.on('keyup', function(ev) {
        var searchStr = $(ev.target).val().toLowerCase();
        if (!searchStr) {
            $searchWapper.find('.search-results').addClass('d-none');
            displayAll();

            $('.tablinks').each(function() {
                var $tablink = $(this);
                var appId = $tablink.attr('app-id');
                var chatroomId = $tablink.attr('chatroom-id');
                var $chatContent = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
                $chatContent.find('.message .content').removeClass('found');
                $tablink.removeClass('d-none');
            });
        }

        var code = ev.keyCode || ev.which;
        if (38 === code) {
            // 向上鍵
            return $searchWapper.find('.fa-chevron-up').click();
        } else if (40 === code) {
            // 向下鍵
            return $searchWapper.find('.fa-chevron-down').click();
        } else if (13 !== code) {
            return;
        }

        var count = 0;
        $tablinks.length = $panels.length = $clientNameOrTexts.length = 0;
        $('.tablinks').each(function() {
            var $tablinkElem = $(this);
            var appId = $tablinkElem.attr('app-id');
            var chatroomId = $tablinkElem.attr('chatroom-id');
            var panel = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
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
                $('#currentNumber').html(1);
                $('#totalNumber').html(count);
                $searchWapper.find('.search-results').removeClass('d-none');
                $(this).css('color', color);
            }

            display ? $(this).removeClass('d-none') : $(this).addClass('d-none');
        });
    });

    $searchWapper.on('click', '.fa-chevron-up', function() {
        if (!($panels.length && $tablinks.length)) {
            return;
        }

        var i = parseInt($('#currentNumber').html(), 10);
        var total = parseInt($('#totalNumber').html(), 10);

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
        $('#currentNumber').html(i);
    });

    $searchWapper.on('click', '.fa-chevron-down', function() {
        if (!($panels.length && $tablinks.length)) {
            return;
        }

        var i = parseInt($('#currentNumber').html(), 10);
        var total = parseInt($('#totalNumber').html(), 10);

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
        $('#currentNumber').html(i);
    });

    function displayAll() {
        $('.tablinks-area .tablinks').each(function() {
            var $tablinkElem = $(this);
            $tablinkElem.removeClass('d-none');
            $tablinkElem.css({
                'background-color': ''
            });

            var appId = $tablinkElem.attr('app-id');
            var chatroomId = $tablinkElem.attr('chatroom-id');
            var $MessagePanel = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
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
    // =====end search input change func=====

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
                textArr.push($checkbox.parents('.dropdown-item').text());
            }
        });

        var displayText = textArr.join(',');
        if (textArr.length > 1) {
            displayText = textArr[0] + ' 及其他 ' + (textArr.length - 1) + ' 名';
        }
        $selectValues.text(displayText).attr('rel', valArr.join(','));
    }

    function addZero(val) {
        return val < 10 ? '0' + val : val;
    }

    // =====end utility function
})();
