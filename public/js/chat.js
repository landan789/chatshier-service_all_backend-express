/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var NO_HISTORY_MSG = '<p class="message-time font-weight-bold">-沒有更舊的歷史訊息-</p>';
    var COLOR = {
        FIND: '#ff0000',
        CLICKED: '#2e555f',
        FINDBACK: '#ffff00'
    };

    var CHATSHIER = 'CHATSHIER';
    var SYSTEM = 'SYSTEM';
    var VENDOR = 'VENDOR';

    var LINE = 'LINE';
    var FACEBOOK = 'FACEBOOK';
    var WECHAT = 'WECHAT';

    var logos = {
        [LINE]: 'https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg',
        [FACEBOOK]: 'https://facebookbrand.com/wp-content/themes/fb-branding/prj-fb-branding/assets/images/fb-art.png',
        [WECHAT]: 'https://cdn.worldvectorlogo.com/logos/wechat.svg',
        [CHATSHIER]: 'image/logo-no-transparent.png'
    };
    var newMessageTipText = '(๑•̀ω•́)ノ (有新訊息)';

    var DEFAULT_CHATROOM_NAME = '群組聊天室';
    var SOCKET_NAMESPACE = '/chatshier';
    var SOCKET_SERVER_URL = window.urlConfig.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;

    // var BREAKPOINT_SM = 576;
    // var BREAKPOINT_MD = 768;
    var BREAKPOINT_LG = 992;

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
    var $chatContentPanel = $('#chatContentPanel');
    var $chatroomBody = $chatContentPanel.find('.chatroom-body'); // 聊天室空間
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
    var urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    var isMobile = 'function' === typeof window.isMobileBrowser && window.isMobileBrowser();
    var hasUserFocus = true;

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
            var dueday = new Date(displayDate(day));
            var hr = dueday - nowTime;
            hr /= 1000 * 60 * 60;
            return hr < 0 ? '<span class="overdue">過期</span>' : '<span class="non overdue">即期</span>';
        };

        // #endregion
        // ==========

        function TicketTableCtrl() {
            var $ticketEditTable = $ticketEditModal.find('#ticketEditTable');
            var $dueDatetimePicker = $ticketEditTable.find('#dueDatetimePicker');
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

                        // 只顯示該 consumer 為對象以及有指派人的待辦事項
                        if (ticket.isDeleted ||
                            platformUid !== ticket.platformUid ||
                            !ticket.assigned_id) {
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
                    var $consumerNameSelect = $ticketAddModal.find('#add-form-name');
                    var $platformUidElem = $ticketAddModal.find('#add-form-uid');
                    var $messagerEmailElem = $ticketAddModal.find('#add-form-email');
                    var $messagerPhoneElem = $ticketAddModal.find('#add-form-phone');
                    var $assignedSelectElem = $ticketAddModal.find('#assigned-name');
                    var $addFormDescription = $ticketAddModal.find('#add-form-description');

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

                    $addFormDescription.val('');
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
            $ticketEditTable.find('#dueDatetimePicker').data('DateTimePicker').date(new Date(ticket.dueTime));
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
            var platformUid = $ticketAddModal.find('#add-form-name option:selected').val();
            var assignedId = $ticketAddModal.find('#assigned-name option:selected').val();
            var description = $ticketAddModal.find('#add-form-description').val();

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
            var dueTime = $ticketEditTable.find('#dueDatetimePicker').data('DateTimePicker').date().toDate().getTime();

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
    var chatshierSocket = io(SOCKET_SERVER_URL);
    chatshierSocket.once('connect', function() {
        bindingSocketEvents(chatshierSocket);
    });

    // start the loading works
    $profilePanel.addClass('d-none');

    window.addEventListener('blur', function() {
        hasUserFocus = false;
    });
    window.addEventListener('focus', function() {
        hasUserFocus = true;
        blinkPageTitle();
    });

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
        if (13 === ev.keyCode) {
            // 按下 enter 後，如果有進行 shift 組合鍵時，在 PC 版本上，預設會自動換行
            if (!isMobile && ev.shiftKey) {
                return;
            }

            // 在行動裝置上按下 enter 鍵是進行換行動作
            // 在 PC 版本上，按下 enter 是直接發送
            if (isMobile) {
                ev.target.value += '\n';
            } else {
                $('.message-input-container #submitMessageBtn').click();
            }
            ev.preventDefault();
        }
    });
    // 偵測 video 變成全螢幕時，把 control panel 及 toobar 進行顯示及隱藏切換
    $chatroomBody.on('fullscreenchange webkitfullscreenchange mozfullscreenchange', '.message video', function(ev) {
        var isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        var $toolbar = $('.chsr.toolbar');
        var $ctrlPanel = $('.chsr.ctrl-panel');
        var $chatWrapper = $('.chat-wrapper');
        var $chatroomContainer = $chatWrapper.find('.chatroom-container');

        if (isFullscreen) {
            $toolbar.css({
                willChange: 'height',
                transitionDuration: '150ms',
                height: '0',
                display: 'none'
            });
            $ctrlPanel.css({
                willChange: 'width',
                transitionDuration: '150ms',
                width: '0',
                display: 'none'
            }).removeClass('d-sm-block');
            $chatWrapper.css({
                maxWidth: '100%'
            });
            $chatroomContainer.css({
                maxHeight: '100%'
            });
        } else {
            $toolbar.removeAttr('style');
            $ctrlPanel.removeAttr('style').addClass('d-sm-block');
            $chatWrapper.removeAttr('style');
            $chatroomContainer.removeAttr('style');
        }
    });

    $chatContentPanel.on('click', '.message .content .image-container', function(ev) {
        var $imageContainer = $(this);
        $imageContainer.toggleClass('stretch');
        $imageContainer.find('img').toggleClass(['animated', 'zoomIn']);
    });
    // =====end chat event=====

    // =====start profile event=====
    $(document).on('keypress', '.user-info-td[modify="true"] input[type="text"]', userInfoKeyPress);
    $profilePanel.on('click', '.profile-content .btn-update-chatroom', function(ev) {
        var $evBtn = $(ev.target);
        var $parentGroup = $evBtn.parents('.profile-group');
        var appId = $parentGroup.attr('app-id');
        var chatroomId = $parentGroup.attr('chatroom-id');
        var putChatroom = {
            name: $evBtn.siblings('.chatroom-name').val()
        };

        return Promise.resolve().then(function() {
            if (putChatroom.name === appsChatrooms[appId].chatrooms[chatroomId].name) {
                return;
            }

            return api.appsChatrooms.update(appId, chatroomId, putChatroom, userId).then(function(resJson) {
                var _appsChatrooms = resJson.data;
                var _chatrooms = _appsChatrooms[appId].chatrooms;
                var _chatroom = _chatrooms[chatroomId];
                for (let prop in _chatroom) {
                    appsChatrooms[appId].chatrooms[chatroomId][prop] = _chatroom[prop];
                }

                var $chatroomNames = $('.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .app-name');
                $chatroomNames.text(_chatroom.name || DEFAULT_CHATROOM_NAME);
                $.notify('更新成功', { type: 'success' });
            });
        }).catch(function() {
            $.notify('更新失敗', { type: 'danger' });
        });
    });
    $profilePanel.on('click', '.leave-group-room button', userLeaveGroupRoom);
    $profilePanel.on('click', '.profile-confirm button', userInfoConfirm);
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
            var chatroomFromSocket = socketBody.chatroom;
            var messages = socketBody.messages;
            var senderUid = socketBody.senderUid;
            var recipientUid = socketBody.recipientUid;
            var consumersFromSocket = socketBody.consumers;
            consumersFromSocket && Object.assign(consumers, consumersFromSocket);
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

            if (chatroomFromSocket) {
                chatroom._id = chatroomFromSocket._id;
                chatroom.platformGroupId = chatroomFromSocket.platformGroupId;
                chatroom.platformGroupType = chatroomFromSocket.platformGroupType;
                messagers = chatroom.messagers = Object.assign(chatrooms[chatroomId].messagers, chatroomFromSocket.messagers);
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

                    var app = apps[appId];
                    var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;

                    if (chatroomList.indexOf(chatroomId) < 0) {
                        var uiRequireData = {
                            appId: appId,
                            name: app.name,
                            type: app.type,
                            chatroomId: chatroomId,
                            chatroom: chatroom
                        };

                        if (isGroupChatroom) {
                            uiRequireData.person = Object.assign({}, users[userId]);
                            uiRequireData.person.photo = logos[app.type];
                            uiRequireData.platformUid = userId;
                        } else {
                            uiRequireData.person = sender;
                            uiRequireData.platformUid = senderUid;
                        }
                        createChatroom(uiRequireData);
                        createProfilePanel(uiRequireData);
                        createTicketPanel(uiRequireData);
                        return;
                    }

                    updateChatroomTab(senderMsger, message, appId, chatroomId); // update 客戶清單
                    updateMessagePanel(senderMsger, message, appId, chatroomId); // update 聊天室

                    var consumer = CHATSHIER === message.from ? consumers[recipientUid] : consumers[senderUid];
                    if (isGroupChatroom) {
                        var $chatroomProfile = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
                        $chatroomProfile.find('.panel-table').remove();

                        var chatroomProfileJqNode = $.parseHTML(generateChatroomProfileHtml(appId, app.type, chatroom));
                        $(chatroomProfileJqNode.shift()).insertAfter($chatroomProfile.find('.photo-container'));
                    } else if (senderUid && consumer) {
                        var consumerUid = consumer.platformUid;
                        var $personProfileCard = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + consumerUid + '"]');
                        $personProfileCard.find('.panel-table').remove();

                        var newPersonProfileJqNode = $.parseHTML(generatePersonProfileHtml(appId, chatroomId, consumerUid, consumer));
                        $(newPersonProfileJqNode.shift()).insertAfter($personProfileCard.find('.photo-container'));
                        $personProfileCard.find('.consumer-avatar').attr('src', fixHttpsResource(consumer.photo));
                    }
                }).then(function() {
                    return nextMessage(i + 1);
                });
            };
            return nextMessage(0).then(function() {
                if (!hasUserFocus) {
                    blinkPageTitle(newMessageTipText);
                    return playNewMessageSound();
                }
            });
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
            var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
            var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;
            var assignedIds = messager.assigned_ids;
            var $assignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.assigned');
            var $unassignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unassigned');

            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
            !isGroupChatroom && (tablinksSelectQuery += '[platform-uid="' + platformUid + '"]');
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
            var $profileCards = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]');
            $profileCards.find('.panel-table').remove();

            $profileCards.each(function() {
                var $profileCard = $(this);
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

            var tabAppItem = buildHtml(app.type, logos[app.type]);
            switch (app.type) {
                case LINE:
                    $lineSideCollapse.append(
                        '<li class="text-light nested list-group-item app-bot" app-id="' + appId + '">' +
                            '<i class="fab fa-line"></i>' +
                            '<span>' + app.name + '</span>' +
                        '</li>'
                    );
                    break;
                case FACEBOOK:
                    $fbSideCollapse.append(
                        '<li class="text-light nested list-group-item app-bot" app-id="' + appId + '">' +
                            '<i class="fab fa-facebook-messenger"></i>' +
                            '<span>' + app.name + '</span>' +
                        '</li>'
                    );
                    break;
                case WECHAT:
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
        $ctrlPanelChatroomCollapse.html(
            '<li class="text-light nested list-group-item has-collapse unread">' +
                '<i class="fas fa-user-times fa-fw fa-1p5x"></i>' +
                '<span>未讀</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested unread show"></div>' +
            '<li class="text-light nested list-group-item has-collapse assigned">' +
                '<i class="fas fa-check-circle fa-fw fa-1p5x"></i>' +
                '<span>已指派</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested assigned show"></div>' +
            '<li class="text-light nested list-group-item has-collapse unassigned">' +
                '<i class="fas fa-times-circle fa-fw fa-1p5x"></i>' +
                '<span>未指派</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested unassigned"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + LINE + '">' +
                '<img class="app-icon" src="' + logos[LINE] + '" />' +
                '<span>' + LINE + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + LINE + '"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + FACEBOOK + '">' +
                '<img class="app-icon" src="' + logos[FACEBOOK] + '" />' +
                '<span>' + FACEBOOK + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + FACEBOOK + '"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + CHATSHIER + '">' +
                '<img class="app-icon" src="' + logos[CHATSHIER] + '" />' +
                '<span>' + CHATSHIER + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + CHATSHIER + '"></div>'
        );

        for (var appId in apps) {
            var app = apps[appId];
            var chatrooms = appsChatrooms[appId].chatrooms;

            for (var chatroomId in chatrooms) {
                var chatroom = chatrooms[chatroomId];
                var uiRequireData = {
                    appId: appId,
                    name: app.name,
                    type: app.type,
                    chatroomId: chatroomId,
                    chatroom: chatroom
                };

                var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;
                if (isGroupChatroom) {
                    uiRequireData.person = Object.assign({}, users[userId]);
                    uiRequireData.person.photo = logos[app.type];
                    uiRequireData.platformUid = userId;
                } else {
                    var platformMessager = findChatroomMessager(appId, chatroomId, app.type);
                    var platformUid = platformMessager.platformUid;
                    uiRequireData.person = consumers[platformUid];
                    uiRequireData.platformUid = platformUid;
                }

                createChatroom(uiRequireData);
                createProfilePanel(uiRequireData);
                createTicketPanel(uiRequireData);
            }
        }

        var $slideActive = $('#ctrlPanel .swiper-slide.swiper-slide-active');
        var maxScrollHeight = $slideActive.prop('scrollHeight') - $slideActive.prop('clientHeight');
        if (maxScrollHeight > 0) {
            $('#ctrlPanel .scroll-bottom').removeClass('d-none');
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
            '<div class="mb-3 message">' +
                '<div class="ml-auto loading-container">' +
                    '<img class="w-100 h-100" src="image/loading.gif" alt="loading..." />' +
                '</div>' +
            '</div>'
        ).shift());
    }

    function generateChatroomItemHtml(opts) {
        var unReadStr = opts.unRead > 99 ? '99+' : ('' + opts.unRead);
        var chatroom = opts.chatroom || {};

        var chatroomPhoto = opts.clientPhoto;
        var chatroomName = opts.clientName;
        var isGroupChatroom = CHATSHIER === opts.appType || chatroom.platformGroupType;
        if (isGroupChatroom) {
            chatroomPhoto = CHATSHIER === opts.appType ? 'image/group.png' : logos[opts.appType];
            chatroomName = chatroom.name || DEFAULT_CHATROOM_NAME;
        }

        var html = (
            '<li class="text-light nested list-group-item tablinks" ' + 'app-id="' + opts.appId + '" chatroom-id="' + opts.chatroomId + '" ' + (!isGroupChatroom ? 'platform-uid="' + opts.platformUid + '"' : '') + ' app-type="' + opts.appType + '">' +
                '<img class="app-icon consumer-photo" src="' + fixHttpsResource(chatroomPhoto) + '" />' +
                '<span class="app-name">' + chatroomName + '</span>' +
                '<span class="unread-msg badge badge-pill ml-auto bg-warning' + (!opts.unRead ? ' d-none' : '') + '">' + unReadStr + '</span>' +
            '</li>'
        );
        return html;
    }

    function generateMessageHtml(srcHtml, message, messager, messagerSelf, appType) {
        if (messager && SYSTEM !== message.from) {
            var platformUid = messager.platformUid;
            var sender = CHATSHIER === messager.type ? users[platformUid] : consumers[platformUid];
        }

        var senderName = (messagerSelf && messagerSelf.namings && messagerSelf.namings[platformUid]) || (sender && sender.name) || '';
        if (SYSTEM === message.from) {
            senderName = '由系統發送';
        } else if (VENDOR === message.from) {
            senderName = '經由平台軟體發送';
        }

        var isMedia = (
            'image' === message.type ||
            'audio' === message.type ||
            'video' === message.type ||
            'sticker' === message.type ||
            'template' === message.type
        );

        // 如果訊息是來自於 Chatshier 或 系統自動回覆 的話，訊息一律放在右邊
        // 如果訊息是來自於其他平台的話，訊息一律放在左邊
        var shouldRightSide =
            (appType !== CHATSHIER && (SYSTEM === message.from || CHATSHIER === message.from || VENDOR === message.from)) ||
            (appType === CHATSHIER && userId === platformUid);

        return (
            '<div class="mb-3 message" message-time="' + message.time + '" message-type="' + message.type + '">' +
                '<div class="messager-name ' + (shouldRightSide ? 'text-right' : 'text-left') + '">' +
                    '<span>' + senderName + '</span>' +
                '</div>' +
                '<span class="message-group ' + (shouldRightSide ? 'right-side' : 'left-side') + '">' +
                    '<span class="content ' + (isMedia ? 'media' : 'words') + '">' + srcHtml + '</span>' +
                    '<span class="send-time">' + toTimeStr(message.time) + '</span>' +
                '</span>' +
            '</div>'
        );
    }

    function createChatroom(requireData) {
        if (!requireData) {
            return;
        }
        var appId = requireData.appId;
        var appName = requireData.name;
        var appType = requireData.type;
        var person = requireData.person;
        var chatroom = requireData.chatroom;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;

        if (!(chatroom && person)) {
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
            chatroom: chatroom,
            chatroomId: chatroomId,
            platformUid: platformUid,
            clientName: (messagerSelf.namings && messagerSelf.namings[platformUid]) || person.name,
            clientPhoto: person.photo,
            iconSrc: logos[appType] || '',
            unRead: messagerSelf.unRead || 0,
            messageHtml: messageToClientHtml(lastMessage)
        };

        switch (appType) {
            case LINE:
                clientUiOpts.icon = 'fab fa-line';
                break;
            case FACEBOOK:
                clientUiOpts.icon = 'fab fa-facebook-messenger';
                break;
            case WECHAT:
                clientUiOpts.icon = 'fab fa-weixin';
                break;
            case CHATSHIER:
            default:
                clientUiOpts.icon = 'fas fa-copyright';
                break;
        }

        var chatroomItemHtml = generateChatroomItemHtml(clientUiOpts);
        var $appCollapse = $ctrlPanelChatroomCollapse.find('.collapse.app-types[app-type="' + appType + '"]');
        var $chatroomCollapse = $appCollapse.find('.collapse[app-id="' + appId + '"]');
        if (0 === $chatroomCollapse.length) {
            $appCollapse.append(
                '<li class="text-light nested list-group-item has-collapse" app-id="' + appId + '" app-type="' + appType + '">' +
                    '<i class="' + clientUiOpts.icon + '"></i>' +
                    '<span>' + (CHATSHIER === appType ? appName.replace('Chatshier - ', '') : appName) + '</span>' +
                    '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
                '</li>' +
                '<div class="collapse nested show" app-id="' + appId + '" app-type="' + appType + '">' +
                    chatroomItemHtml +
                '</div>'
            );
        } else {
            $chatroomCollapse.append(chatroomItemHtml);
        }

        // 監聽 tablinks 底下的圖像是否載入失敗
        var isGroupChatroom = CHATSHIER === appType || !!chatroom.platformGroupId;
        var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
        !isGroupChatroom && (tablinksSelectQuery += '[platform-uid="' + platformUid + '"]');

        var $consumerPhoto = $appCollapse.find(tablinksSelectQuery + ' img.consumer-photo');
        $consumerPhoto.on('error', function() {
            var $consumerPhotos = $ctrlPanelChatroomCollapse.find(tablinksSelectQuery + ' img.consumer-photo');
            $consumerPhotos.attr('src', 'image/user_large.png');

            // 當載入失敗時發 api 通知後端更新 consumer 的頭像
            return api.bot.getProfile(appId, platformUid).then((resJson) => {
                if (!(resJson && resJson.data)) {
                    return;
                }
                var _consumers = resJson.data;
                var consumer = _consumers[platformUid] || {};
                // 如果取得 photo 失敗則使用預設頭像
                consumer.photo = consumer.photo || 'image/user_large.png';
                $consumerPhotos.attr('src', fixHttpsResource(consumer.photo));
                Object.assign(consumers, _consumers);
            });
        });

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
        var totalMessageHtml = '';
        if (messageIds.length < 10) {
            totalMessageHtml += NO_HISTORY_MSG;
        }
        totalMessageHtml += historyMessageToHtml(messages, messagers, messagerSelf, appType);
        $chatroomBody.append(
            '<div class="chat-content" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                '<div class="message-panel">' + totalMessageHtml + '</div>' +
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
                return (
                    '<div class="image-container">' +
                        '<img class="image-content" src="' + message.src + '" />' +
                    '</div>'
                );
            case 'audio':
                return (
                    '<audio class="audio-content" controls>' +
                        '<source src="' + message.src + '" type="audio/mpeg">' +
                    '</audio>'
                );
            case 'video':
                return (
                    '<video class="video-content" controls playsinline webkit-playsinline>' +
                        '<source src="' + message.src + '" type="video/mp4">' +
                    '</video>'
                );
            case 'sticker':
                return (
                    '<img class="sticker-content" src="' + message.src + '" />'
                );
            case 'location':
                return (
                    '<i class="fa fa-location-arrow fa-fw location-icon"></i>' +
                    '<span class="text-content">地理位置: <a href="' + message.src + '" target="_blank">地圖</a></span>'
                );
            case 'template':
                if (!message.template) {
                    let messageText = linkify(filterWechatEmoji(message.text || ''));
                    return '<span class="text-content">' + messageText + '</span>';
                }
                return templateMessageType(message.template);
            case 'file':
                // var fileName = message.src.split('/').pop();
                return (
                    '<i class="fas fa-file fa-fw file-icon"></i>' +
                    '<span class="text-content">' + message.text + '<a href="' + message.src + '" download="' + message.src + '" target="_blank">' + message.src + '</a></span>'
                );
            default:
                var messageText = linkify(filterWechatEmoji(message.text || ''));
                return '<span class="text-content">' + messageText + '</span>';
        }
    }

    function templateMessageType(template) {
        switch (template.type) {
            case 'confirm':
                return (
                    '<div class="template-sm">' +
                        `<div class="template-sm-title">${template.text}</div>` +
                        '<div class="template-sm-buttons">' +
                            `<div class="template-sm-button1">${template.actions[0].label} (輸出：${template.actions[0].text})</div>` +
                            `<div class="template-sm-button2">${template.actions[1].label} (輸出：${template.actions[1].text})</div>` +
                        '</div>' +
                    '</div>'
                );
            case 'buttons':
                return (
                    '<div class="template">' +
                        `<img src="${template.thumbnailImageUrl}" alt="未顯示圖片" class="top-img" />` +
                        `<div class="template-title">${template.title}</div>` +
                        `<div class="template-desc">${template.text}</div>` +
                        '<div class="template-buttons">' +
                            `<div class="template-button1">${template.actions[0].label} (輸出：${template.actions[0].text})</div>` +
                            `<div class="template-button2">${template.actions[1].label} (輸出：${template.actions[1].text})</div>` +
                            `<div class="template-button3">${template.actions[2].label} (輸出：${template.actions[2].text})</div>` +
                        '</div>' +
                    '</div>'
                );
            case 'carousel':
                return template.columns.map((column) => (
                    '<div class="template">' +
                        `<img src="${column.thumbnailImageUrl}" alt="未顯示圖片" class="top-img" />` +
                        `<div class="template-title">${column.title}</div>` +
                        `<div class="template-desc">${column.text}</div>` +
                        '<div class="template-buttons">' +
                            `<div class="template-button1">${column.actions[0].label} (輸出：${column.actions[0].text})</div>` +
                            `<div class="template-button2">${column.actions[1].label} (輸出：${column.actions[1].text})</div>` +
                            `<div class="template-button3">${column.actions[2].label} (輸出：${column.actions[2].text})</div>` +
                        '</div>' +
                    '</div>'
                ));
            default:
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

    function historyMessageToHtml(messages, messagers, messagerSelf, appType) {
        var html = '';
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
            var messageDate = new Date(message.time);

            // this loop plus date info into history message, like "----Thu Aug 01 2017----"
            var d = messageDate.toDateString(); // get msg's date
            if (d !== nowDateStr) {
                // if (now msg's date != previos msg's date), change day
                nowDateStr = d;
                html += '<p class="message-time font-weight-bold">' + nowDateStr + '</p>';
            }

            var messageTime = messageDate.getTime();
            if (messageTime - prevTime > 15 * 60 * 1000) {
                // if out of 15min section, new a section
                html += '<p class="message-time font-weight-bold">' + toDateStr(messageTime) + '</p>';
            }
            prevTime = messageTime;

            var messagerId = message.messager_id;
            var messager = messagers[messagerId];
            html += generateMessageHtml(srcHtml, message, messager, messagerSelf, appType);
        }
        return html;
    }

    function createProfilePanel(requireData) {
        var appId = requireData.appId;
        var appType = requireData.type;
        var chatroom = requireData.chatroom;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;
        var person = requireData.person;
        if (!person) {
            return;
        }

        person.photo = person.photo || 'image/user_large.png';
        var isGroupChatroom = CHATSHIER === appType || !!chatroom.platformGroupId;
        var profilePanelHtml = (
            '<div class="profile-group animated fadeIn" app-id="' + appId + '" chatroom-id="' + chatroomId + '" platform-uid="' + platformUid + '">' +
                '<div class="person-profile profile-content table-responsive">' +
                    '<div class="photo-container">' +
                        '<img class="consumer-avatar larger" src="' + fixHttpsResource(person.photo) + '" alt="無法顯示相片" />' +
                    '</div>' +
                    (function generateProfileHtml() {
                        var html = '';

                        if (isGroupChatroom) {
                            html = (
                                generateChatroomProfileHtml(appId, appType, chatroom) +
                                '<div class="p-2 leave-group-room text-right">' +
                                    '<button type="button" class="btn btn-danger">' +
                                        '<i class="fas fa-sign-out-alt fa-fw"></i>' +
                                        '<span>離開群組</span>' +
                                    '</button>' +
                                '</div>'
                            );
                        } else {
                            html = (
                                generatePersonProfileHtml(appId, chatroomId, platformUid, person) +
                                '<div class="profile-confirm text-center">' +
                                    '<button type="button" class="btn btn-info">確認</button>' +
                                '</div>'
                            );
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
        var appType = requireData.type;
        var chatroom = requireData.chatroom;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;

        // 屬於群組聊天室的話，沒有待辦事項的功能
        var isGroupChatroom = CHATSHIER === appType || !!chatroom.platformGroupId;
        if (isGroupChatroom) {
            return;
        }

        var ticketPanelHtml = (
            '<div class="ticket-group animated fadeIn" app-id="' + appId + '" chatroom-id="' + chatroomId + '" platform-uid="' + platformUid + '">' +
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
            var readonly = 'name' !== field.alias && field.type === api.appsFields.enums.type.SYSTEM;
            var fieldValue = '';

            if (field.type === api.appsFields.enums.type.CUSTOM) {
                fieldValue = customFields[fieldId] ? customFields[fieldId].value : '';
            } else {
                if (messagerCase.indexOf(field.alias) >= 0) {
                    fieldValue = undefined !== messager[field.alias] ? messager[field.alias] : '';
                } else if (messagerSelfCase.indexOf(field.alias) >= 0) {
                    fieldValue = undefined !== messagerSelf[field.alias] ? messagerSelf[field.alias] : '';
                } else {
                    // 如果是名稱的話則是取用 displayName
                    if ('name' === field.alias) {
                        fieldValue = (messagerSelf.namings && messagerSelf.namings[platformUid]) || '';
                    } else {
                        fieldValue = undefined !== person[field.alias] ? person[field.alias] : '';
                    }
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
                    return (
                        '<td class="profile-content user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                            '<select class="form-control td-inner" value="' + fieldValue + '">' +
                                (function(sets) {
                                    var opts = '<option value="">未選擇</option>';
                                    for (var i in sets) {
                                        opts += '<option value="' + sets[i] + '" ' + (sets[i] === fieldValue ? 'selected' : '') + '>' + (transJson[sets[i]] || sets[i]) + '</option>';
                                    }
                                    return opts;
                                })(field.sets) +
                            '</select>' +
                        '</td>'
                    );
                case setsTypeEnums.MULTI_SELECT:
                    var selectValues = fieldValue instanceof Array ? fieldValue : [];
                    var multiSelectText = selectValues.reduce(function(output, value, i) {
                        if (!value) {
                            return output;
                        }

                        output.push('assigned' === field.alias ? field.sets[i].agentName : field.sets[i]);
                        return output;
                    }, []).join(',');

                    return (
                        '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
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
                                                checkboxes += (
                                                    '<div class="dropdown-item">' +
                                                        '<div class="form-check form-check-inline">' +
                                                            '<label class="form-check-label">' +
                                                                '<input type="checkbox" class="form-check-input" value="' + sets[i].agentUserId + '"' + (selectValues[i] ? ' checked="true"' : '') + '>' +
                                                                sets[i].agentName +
                                                            '</label>' +
                                                        '</div>' +
                                                    '</div>'
                                                );
                                            } else {
                                                checkboxes += (
                                                    '<div class="dropdown-item">' +
                                                        '<div class="form-check form-check-inline">' +
                                                            '<input type="checkbox" class="form-check-input" value="' + sets[i] + '"' + (selectValues[i] ? ' checked="true"' : '') + '>' +
                                                            '<label class="form-check-label">' + sets[i] + '</label>' +
                                                        '</div>' +
                                                    '</div>'
                                                );
                                            }
                                        }
                                        return checkboxes;
                                    })(field.sets) +
                                '</div>' +
                            '</div>' +
                        '</td>'
                    );
                case setsTypeEnums.CHECKBOX:
                    return (
                        '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                            '<input class="td-inner" type="checkbox"' + (fieldValue ? ' checked="true"' : '') + (readonly ? ' disabled' : '') + '/>' +
                        '</td>'
                    );
                case setsTypeEnums.DATE:
                    fieldValue = fieldValue || 0;
                    var fieldDateStr = new Date(new Date(fieldValue).getTime() - timezoneGap).toJSON().split('.').shift();
                    return (
                        '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                            '<input class="form-control td-inner" type="datetime-local" value="' + fieldDateStr + '" ' + (readonly ? 'readonly disabled' : '') + '/>' +
                        '</td>'
                    );
                case setsTypeEnums.TEXT:
                case setsTypeEnums.NUMBER:
                default:
                    var placeholder = 'name' === field.alias ? person.name : '尚未輸入';
                    var inputType = setsTypeEnums.NUMBER === field.setsType ? 'tel' : 'text';
                    inputType = 'email' === field.alias ? 'email' : inputType;
                    return (
                        '<td class="user-info-td" alias="' + field.alias + '" type="' + field.setsType + '" modify="' + (readonly ? 'false' : 'true') + '">' +
                            '<input class="form-control td-inner" type="' + inputType + '" placeholder="' + placeholder + '" value="' + fieldValue + '" ' + (readonly ? 'readonly disabled' : '') + ' autocapitalize="none" />' +
                        '</td>'
                    );
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

    function generateChatroomProfileHtml(appId, appType, chatroom) {
        var groupId = apps[appId].group_id;
        var group = groups[groupId];
        var chatroomName = chatroom.name || '';
        var isChatshierApp = CHATSHIER === appType;

        var html =
            '<table class="table table-hover panel-table">' +
                '<tr>' +
                    '<th class="profile-label">群組名稱</th>' +
                    '<td class="d-flex profile-content">' +
                        '<input class="form-control td-inner chatroom-name" type="text" value="' + chatroomName + '" placeholder="' + DEFAULT_CHATROOM_NAME + '"/>' +
                        '<button class="ml-2 btn btn-primary btn-update-chatroom">更新</button>' +
                    '</td>' +
                '</tr>' +
                '<tr>' +
                    '<th class="py-3 profile-label align-top">' + (isChatshierApp ? '群組成員' : '客戶成員') + '</th>' +
                    '<td class="profile-content">' +
                        (function() {
                            var html = '';
                            if (isChatshierApp) {
                                for (var memberId in group.members) {
                                    var memberUserId = group.members[memberId].user_id;
                                    var memberUser = users[memberUserId];
                                    html += (
                                        '<div class="person-chip">' +
                                            '<img src="' + (fixHttpsResource(memberUser.photo) || 'image/avatar-default.png') + '" class="person-avatar" alt="" />' +
                                            '<span>' + memberUser.name + '</span>' +
                                        '</div>'
                                    );
                                }
                            } else {
                                var messagers = chatroom.messagers;
                                for (var messagerId in messagers) {
                                    var messager = messagers[messagerId];
                                    if (CHATSHIER === messager.type) {
                                        continue;
                                    }
                                    var consumer = consumers[messager.platformUid];
                                    html +=
                                        '<div class="person-chip">' +
                                            '<img src="' + fixHttpsResource(consumer.photo || 'image/avatar-default.png') + '" class="person-avatar" alt="" onerror="this.src=\'image/user_large.png\'" />' +
                                            '<span>' + consumer.name + '</span>' +
                                        '</div>';
                                }
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
        var $eventTablink = $(this);
        var $messageInputContainer = $('.message-input-container');

        var appId = $eventTablink.attr('app-id');
        var appName = apps[appId].name;
        var appType = $eventTablink.attr('app-type');
        var chatroomId = $eventTablink.attr('chatroom-id');
        var platformUid = $eventTablink.attr('platform-uid');

        var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
        var isGroupChatroom = CHATSHIER === appType || !!chatroom.platformGroupId;

        var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
        !isGroupChatroom && (tablinksSelectQuery += '[platform-uid="' + platformUid + '"]');

        var $chatroomTablinks = $ctrlPanelChatroomCollapse.find(tablinksSelectQuery);
        var $selectedTablinks = $('.tablinks.selected');
        $selectedTablinks.removeClass('selected').css('background-color', '');
        $chatroomTablinks.addClass('selected').css('background-color', COLOR.CLICKED);

        var $navTitle = $('#navTitle');
        var chatroomTitle = document.title.replace(' | Chatshier', ' #' + appName);
        if (CHATSHIER !== appType) {
            var messagers = chatroom.messagers;

            var messagerNameList = [];
            for (var messagerId in messagers) {
                var messager = messagers[messagerId];
                if (appType === messager.type) {
                    messagerNameList.push(consumers[messager.platformUid].name);
                }
            }
            chatroomTitle += ' (' + messagerNameList.join(',') + ')';
        }
        $navTitle.text(chatroomTitle);

        var $targetTablink = $ctrlPanelChatroomCollapse.find('.collapse[app-type="' + appType + '"] ' + tablinksSelectQuery);
        var $unReadElem = $targetTablink.find('.unread-msg');
        if (parseInt($unReadElem.text(), 10)) {
            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                chatroomId: chatroomId,
                userId: userId
            });
            var messagerSelf = findMessagerSelf(appId, chatroomId);
            messagerSelf.unRead = 0;

            // 如果有未讀的話，將未讀數設為0之後，把未讀的區塊隱藏
            $chatroomTablinks.find('.unread-msg').text(messagerSelf.unRead).addClass('d-none');
            $ctrlPanelChatroomCollapse.find('.collapse.unread ' + tablinksSelectQuery).remove();
        }

        var $chatroomContainer = $('#chatWrapper .chatroom-container');
        $chatroomContainer.addClass('open');

        // 將聊天室訊息面板顯示，並將 scroll 滑至最下方
        var $messageWrapper = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $profileGroup = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $ticketGroup = $('.ticket-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        $messageInputContainer.removeClass('d-none');
        $messageWrapper.addClass('shown').removeClass('d-none');
        $messageWrapper.siblings().removeClass('shown').addClass('d-none');

        ticketTableCtrl.loadTickets(appId, userId, platformUid);

        var $ticketToggle = $('.toolbar #ticketToggle');
        var $profileToggle = $('.toolbar #profileToggle');
        $profileToggle.removeClass('d-none');

        // 若屬於 lg 以下的尺寸(行動裝置)，在切換 chatroom 時
        // 如果有開啟用戶個檔或待辦事項的面板時，不要展開聊天室面板，只切換用戶
        // 如果有開啟待辦事項的面板時，但切換至 Chatshier 內部聊天室時，因內部聊天室沒有待辦事項，因此自動展開聊天室面板
        if (window.innerWidth < BREAKPOINT_LG) {
            if ($profileToggle.hasClass('active') ||
                ($ticketToggle.hasClass('active') && !isGroupChatroom)) {
                $chatContentPanel.addClass('d-none');
            } else {
                $chatContentPanel.removeClass('d-none');
                $profileToggle.removeClass('active');
                $ticketToggle.removeClass('active');
                $profilePanel.addClass('d-none');
                $ticketPanel.addClass('d-none');
            }
        } else {
            $chatContentPanel.removeClass('d-none');
        }
        scrollMessagePanelToBottom(appId, chatroomId);

        if ($profileToggle.hasClass('active')) {
            $profilePanel.removeClass('d-none');
            $ticketPanel.addClass('d-none');

            $profileGroup.removeClass('d-none');
            $profileGroup.siblings().addClass('d-none');
        }

        if ($ticketToggle.hasClass('active')) {
            $profilePanel.addClass('d-none');
            $ticketPanel.removeClass('d-none');

            $ticketGroup.removeClass('d-none');
            $ticketGroup.siblings().addClass('d-none');
        }

        if (isGroupChatroom) {
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
        var $selectedTablinks = $('.tablinks.selected').first();
        var appId = $selectedTablinks.attr('app-id');
        var chatroomId = $selectedTablinks.attr('chatroom-id');
        var platformUid = $selectedTablinks.attr('platform-uid');

        var app = apps[appId];
        var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
        var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;
        var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
        !isGroupChatroom && (tablinksSelectQuery += '[platform-uid="' + platformUid + '"]');

        var $targetTablink = $ctrlPanelChatroomCollapse.find('.collapse[app-type="' + app.type + '"] ' + tablinksSelectQuery);
        var $unReadElem = $targetTablink.find('.unread-msg');

        if (parseInt($unReadElem.text(), 10)) {
            chatshierSocket.emit(SOCKET_EVENTS.READ_CHATROOM_MESSAGES, {
                appId: appId,
                chatroomId: chatroomId,
                userId: userId
            });
            var messagerSelf = findMessagerSelf(appId, chatroomId);
            messagerSelf.unRead = 0;

            var $chatroomTablinks = $ctrlPanelChatroomCollapse.find(tablinksSelectQuery);
            $chatroomTablinks.find('.unread-msg').text(messagerSelf.unRead).addClass('d-none');
            $ctrlPanelChatroomCollapse.find('.collapse.unread ' + tablinksSelectQuery).remove();
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

        return new Promise(function(resolve, reject) {
            $submitMessageInput.val('');
            chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, socketBody, function(err) {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                resolve();
            });
        }).then(() => {
            $loadingElem.remove();
            $loadingElem = void 0;
        }).catch(() => {
            $.notify('發送失敗', { type: 'danger' });
            $loadingElem.remove();
            $loadingElem = void 0;
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
        var kiloByte = 1024;
        var megaByte = kiloByte * 1024;
        if (file.type.indexOf('image') >= 0 && file.size > config.imageFileMaxSize) {
            $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(config.imageFileMaxSize / megaByte) + ' MB', { type: 'warning' });
            return;
        } else if (file.type.indexOf('video') >= 0 && file.size > config.videoFileMaxSize) {
            $.notify('影像檔案過大，檔案大小限制為: ' + Math.floor(config.videoFileMaxSize / megaByte) + ' MB', { type: 'warning' });
            return;
        } else if (file.type.indexOf('audio') >= 0 && file.size > config.audioFileMaxSize) {
            $.notify('聲音檔案過大，檔案大小限制為: ' + Math.floor(config.audioFileMaxSize / megaByte) + ' MB', { type: 'warning' });
            return;
        } else if (file.size > config.otherFileMaxSize) {
            $.notify('檔案過大，檔案大小限制為: ' + Math.floor(config.otherFileMaxSize / megaByte) + ' MB', { type: 'warning' });
            return;
        }

        var messageType = $(_this).data('type');
        var appType = apps[appId].type;
        var platformMessager = findChatroomMessager(appId, chatroomId, appType);
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var src = file;

        var fileSize = file.size / kiloByte;
        if (fileSize >= 1000) {
            fileSize /= kiloByte;
            fileSize = fileSize.toFixed(1) + ' MB';
        } else {
            fileSize = fileSize.toFixed(1) + ' KB';
        }

        /** @type {ChatshierMessage} */
        var messageToSend = {
            text: '錢掌櫃傳送檔案給您:\n檔案大小: ' + fileSize + '\n',
            src: src,
            fileName: file.name,
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

        var $loadingElem = generateLoadingJqElem();
        $messageView.find('.message-panel').append($loadingElem);
        scrollMessagePanelToBottom(appId, chatroomId);

        return new Promise((resolve, reject) => {
            chatshierSocket.emit(SOCKET_EVENTS.EMIT_MESSAGE_TO_SERVER, socketBody, function(err) {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                resolve();
            });
        }).then(() => {
            $loadingElem.remove();
            $loadingElem = void 0;
        }).catch(() => {
            $.notify('發送失敗', { type: 'danger' });
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

    function updateChatroomTab(messager, message, appId, chatroomId) {
        var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
        var $chatroomTablinks = $ctrlPanelChatroomCollapse.find(tablinksSelectQuery);
        var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
        var messagerSelf = findMessagerSelf(appId, chatroomId);

        // 此聊天室屬於 1 vs chatshier 的才更新客戶頭像
        if (messager && messager.platformUid && !chatroom.platformGroupId) {
            var platformUid = messager.platformUid;
            var consumer = consumers[platformUid];
            if (consumer) {
                if (consumer.photo) {
                    $chatroomTablinks.find('.app-icon').attr('src', fixHttpsResource(consumer.photo));
                }

                if (consumer.name) {
                    var displayName = (messagerSelf.namings && messagerSelf.namings[platformUid]) || consumer.name;
                    $chatroomTablinks.find('.app-name').text(displayName);
                }
            }
        }

        var currentUnread = messagerSelf.unRead;
        var $unreadMsgElem = $chatroomTablinks.find('.unread-msg');

        if (!currentUnread) {
            $unreadMsgElem.text(0).addClass('d-none');
        } else {
            $unreadMsgElem.text(currentUnread > 99 ? '99+' : currentUnread).removeClass('d-none');
        }

        var $unreadCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unread');
        var $unreadChatroomTab = $unreadCollapse.find('.list-group-item[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        if (currentUnread && 0 === $unreadChatroomTab.length) {
            $unreadCollapse.prepend($chatroomTablinks.first().clone());
        }
    }

    function updateMessagePanel(messager, message, appId, chatroomId) {
        /** @type {ChatshierMessage} */
        var _message = message;
        var appType = apps[appId].type;
        var srcHtml = messageToPanelHtml(_message);
        var messagerSelf = findMessagerSelf(appId, chatroomId);

        var chatSelectQuery = '.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
        var $messagePanel = $chatContentPanel.find(chatSelectQuery + ' .message-panel');

        if (messager && messager.platformUid && CHATSHIER !== messager.type) {
            var platformUid = messager.platformUid;
            var consumer = consumers[platformUid];
            var displayName = (messagerSelf.namings && messagerSelf.namings[platformUid]) || consumer.name;
            $messagePanel.find('.messager-name.text-left span').text(displayName);
        }

        if (chatroomList.indexOf(chatroomId) >= 0) {
            var lastMessageTime = new Date($messagePanel.find('.message:last').attr('message-time')).getTime();

            // 如果現在時間比上一筆聊天記錄多15分鐘的話，將視為新訊息
            if (new Date(_message.time).getTime() - lastMessageTime >= 900000) {
                $messagePanel.append('<p class="message-time font-weight-bold">-新訊息-</p>');
            }
            var messageHtml = generateMessageHtml(srcHtml, _message, messager, messagerSelf, appType);
            $messagePanel.append(messageHtml);
            scrollMessagePanelToBottom(appId, chatroomId);
        } else {
            // if its new user
            var historyMsgStr = NO_HISTORY_MSG;
            historyMsgStr += generateMessageHtml(srcHtml, _message, messager, messagerSelf, appType);

            $chatroomBody.append(
                '<div class="chat-content" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                    '<div class="message-panel">' + historyMsgStr + '</div>' +
                '</div>'
            );
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
            var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
            var messagerSelf = findMessagerSelf(appId, chatroomId);
            if (messagerUiData.name) {
                messagerSelf.namings = messagerSelf.namings || {};
                messagerSelf.namings[platformUid] = messagerUiData.name;
            }
            delete messagerUiData.name;
            Object.assign(messager, messagerUiData);

            // 檢查 messager 更新內容的 assigned_ids 是否有包含自已
            // 有的話檢查此聊天室是否已有被加入至已指派
            // 沒有的話複製聊天室的 tablink 至已指派中
            var app = apps[appId];
            var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
            var consumer = consumers[platformUid];
            var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;
            var assignedIds = messager.assigned_ids;

            var $assignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.assigned');
            var $unassignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unassigned');

            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
            !isGroupChatroom && (tablinksSelectQuery += '[platform-uid="' + platformUid + '"]');

            // 如果有進行自定義客戶命名的話，則將聊天訊息的名稱以及聊天室的名稱做更新
            if (messagerSelf.namings && messagerSelf.namings[platformUid]) {
                var displayName = (messagerSelf.namings && messagerSelf.namings[platformUid]) || consumer.name;
                var $messagePanel = $chatContentPanel.find('[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
                $messagePanel.find('.messager-name.text-left span').text(displayName);
                $(tablinksSelectQuery + ' .app-name').text(displayName);
            }

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

    function userLeaveGroupRoom(ev) {
        if (!confirm('確定要離開嗎？此聊天室將會刪除但資料將會保留。')) {
            return;
        }

        var $profileGroup = $(ev.target).parents('.profile-group');
        var appId = $profileGroup.attr('app-id');
        var chatroomId = $profileGroup.attr('chatroom-id');

        return api.bot.leaveGroupRoom(appId, chatroomId, userId).then(function(resJson) {
            var $navTitle = $('#navTitle');
            var chatroomTitle = document.title.replace(' | Chatshier', '');
            $navTitle.text(chatroomTitle);

            var selectQuery = '[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
            $('.tablinks' + selectQuery).remove();
            $('.profile-group' + selectQuery).remove();
            $('.chat-content' + selectQuery).remove();

            var $profileToggle = $('.toolbar #profileToggle');
            $profileToggle.removeClass('active');
            $chatContentPanel.addClass('d-none');
            $profilePanel.addClass('d-none');

            var $chatroomContainer = $('#chatWrapper .chatroom-container');
            $chatroomContainer.removeClass('open');

            delete appsChatrooms[appId].chatrooms[chatroomId];
        });
    }
    // =====end profile function=====

    // =====start search input change func=====
    /** @type {JQuery<HTMLElement>[]} */
    var $tablinks = [];
    var $panels = [];
    var $clientNameOrTexts = [];
    var $searchWapper = $('#ctrlPanel .message-search');
    var $searchInput = $searchWapper.find('.search-box');

    $searchInput.on('keyup', function(ev) {
        var searchStr = $(ev.target).val().toLowerCase();
        if ('' === searchStr) {
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
            return;
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

    /**
     * @param {string} resourceLink
     */
    function fixHttpsResource(resourceLink) {
        if ('https:' === window.location.protocol && 0 === resourceLink.indexOf('http://')) {
            return resourceLink.replace('/^http:/i', window.location.protocol);
        }
        return resourceLink;
    }

    /**
     * @param {string} text
     */
    function linkify(text) {
        return text.replace(urlRegex, function(url) {
            return '<a href="' + url + '" target="_blank">' + url + '</a>';
        });
    }

    var blinkCycle = null;
    var DEFAULT_TITLE = document.title;
    var blinkTitlePrev = DEFAULT_TITLE;
    var blinkTitleNext = DEFAULT_TITLE;
    /**
     * @param {string} [title]
     */
    function blinkPageTitle(title) {
        blinkTitlePrev = blinkTitleNext = DEFAULT_TITLE;
        blinkCycle && window.clearInterval(blinkCycle);
        if (!title) {
            document.title = DEFAULT_TITLE;
            return;
        }

        document.title = title;
        blinkCycle = window.setInterval(function() {
            blinkTitlePrev = document.title;
            document.title = blinkTitleNext;
            blinkTitleNext = blinkTitlePrev;
        }, 1000);
    }

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var audioCtx = AudioContext && new AudioContext();
    /**
     * Safari 需要使用 WebAudioAPI 才能播放音效
     * 已知問題: Safari 在離開分頁後，無法在背景播放音效
     */
    function playNewMessageSound() {
        var audioCtxSrc;
        var newMessageSnd = document.createElement('audio');
        newMessageSnd.src = 'media/new_message.mp3';

        return Promise.resolve().then(function() {
            if (audioCtx) {
                audioCtxSrc = audioCtx.createMediaElementSource(newMessageSnd);
                audioCtxSrc.connect(audioCtx.destination);
            }
            return newMessageSnd.play();
        }).then(function() {
            return new Promise((resolve) => {
                newMessageSnd.onended = resolve;
            });
        }).then(function() {
            audioCtx && audioCtxSrc.disconnect(audioCtx.destination);
            newMessageSnd = audioCtxSrc = void 0;
        }).catch(function(err) {
            audioCtx && audioCtxSrc.disconnect(audioCtx.destination);
            newMessageSnd = audioCtxSrc = void 0;
            if ('NotAllowedError' === err.name) {
                return;
            }
            return Promise.reject(err);
        });
    }

    // =====end utility function
})();
