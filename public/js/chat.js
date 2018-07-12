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

    var LINE_GROUP = 'LINE_GROUP';

    var LOGOS = {
        [LINE]: 'https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg',
        [LINE_GROUP]: './image/line-group.jpg',
        [FACEBOOK]: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Facebook_Messenger_logo.svg',
        [WECHAT]: 'https://cdn.worldvectorlogo.com/logos/wechat.svg',
        [CHATSHIER]: 'image/logo-no-transparent.png'
    };
    var newMessageTipText = '(๑•̀ω•́)ノ (有新訊息)';

    var DEFAULT_CHATROOM_NAME = '群組聊天室';
    var SOCKET_NAMESPACE = '/chatshier';
    var SOCKET_SERVER_URL = window.urlConfig.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;
    var SOCKET_EVENTS = window.SOCKET_EVENTS;

    // var BREAKPOINT_SM = 576;
    // var BREAKPOINT_MD = 768;
    var BREAKPOINT_LG = 992;

    var $emojiParseInput = $(document.createElement('input'));
    $emojiParseInput.emojioneArea();
    var emojiData = $emojiParseInput.data('emojioneArea');

    var api = window.restfulAPI;
    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    /** @type {string[]} */
    var chatroomList = [];

    /**
     * @typedef {Object} Agent
     * @property {string} name
     * @property {string} email
     * @typedef {{ [userId: string]: Agent }} Agents
     * @type {{ [appId: string]: { agents: Agents } }}
     */
    var appsAgents = {};

    /** @type {Chatshier.Models.Apps} */
    var apps = {};
    /** @type {Chatshier.Models.AppsChatrooms} */
    var appsChatrooms = {};
    /** @type {Chatshier.Models.AppsFields} */
    var appsFields = {};
    /** @type {Chatshier.Models.Consumers} */
    var consumers = {};
    /** @type {Chatshier.Models.Groups} */
    var groups = {};
    /** @type {Chatshier.Models.Users} */
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

    var urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    var isMobile = 'function' === typeof window.isMobileBrowser && window.isMobileBrowser();
    var hasUserFocus = true;

    // // wechat 的預設表情符號並不是依照 unicode 編碼，傳過來的訊息是依照 wechat 自家的特殊符號編碼而定
    // // 因此要解析 wechat 的表情符號必須進行轉換
    // // 1. 使用正規表達式檢測文字內是否含有 wechat 的表情符號
    // // 2. 將 wechat 表情符號的編碼根據對照表進行轉換
    // const wechatEmojiRegex = new RegExp("/::\\)|/::~|/::B|/::\\||/:8-\\)|/::<|/::$|/::X|/::Z|/::'\\(|/::-\\||/::@|/::P|/::D|/::O|/::\\(|/::\\+|/:--b|/::Q|/::T|/:,@P|/:,@-D|/::d|/:,@o|/::g|/:\\|-\\)|/::!|/::L|/::>|/::,@|/:,@f|/::-S|/:\\?|/:,@x|/:,@@|/::8|/:,@!|/:!!!|/:xx|/:bye|/:wipe|/:dig|/:handclap|/:&-\\(|/:B-\\)|/:<@|/:@>|/::-O|/:>-\\||/:P-\\(|/::'\\||/:X-\\)|/::\\*|/:@x|/:8\\*|/:pd|/:<W>|/:beer|/:basketb|/:oo|/:coffee|/:eat|/:pig|/:rose|/:fade|/:showlove|/:heart|/:break|/:cake|/:li|/:bome|/:kn|/:footb|/:ladybug|/:shit|/:moon|/:sun|/:gift|/:hug|/:strong|/:weak|/:share|/:v|/:@\\)|/:jj|/:@@|/:bad|/:lvu|/:no|/:ok|/:love|/:<L>|/:jump|/:shake|/:<O>|/:circle|/:kotow|/:turn|/:skip|/:oY|/:#-0|/:hiphot|/:kiss|/:<&|/:&>", 'g');
    // const wechatEmojiTable = Object.freeze({
    //     // TODO: 補完 wechat 預設表情符號編碼
    //     '/::)': '😃',
    //     '/::~': '😖',
    //     '/::B': '😍',
    //     '/::|': '😳'
    // });

    // /**
    //  * @param {string} text
    //  */
    // function filterWechatEmoji(text) {
    //     if (wechatEmojiRegex.test(text)) {
    //         var emojis = text.match(wechatEmojiRegex) || [];
    //         var newText = text;
    //         for (var i = 0; i < emojis.length; i++) {
    //             newText = newText.replace(emojis[i], wechatEmojiTable[emojis[i]] || emojis[i]);
    //         }
    //         return newText;
    //     }
    //     return text;
    // }

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
        readClientMsg();
    });

    // =====start chat event=====
    $(document).on('click', '.ctrl-panel .tablinks', userClickTablink);
    $(document).on('focus', '.message-input-container #submitMessageInput', readClientMsg); // 已讀客戶訊息
    $(document).on('click', '.message-input-container #submitMessageBtn', submitMessage); // 訊息送出
    $(document).on('click', '#imagemap', showImagemapArea);
    $(document).on('click', '.send-imagemap-btn', sendImagemap);
    $(document).on('mouseover', '.imagemap-message-content', function() { $(this).find('.imagemap-text-space').css('visibility', 'visible'); });
    $(document).on('mouseleave', '.imagemap-message-content', function() { $(this).find('.imagemap-text-space').css('visibility', 'hidden'); });
    $mediaBtns.on('click', triggerFileUpload); // 傳圖，音，影檔功能
    $('.ghost-file').on('change', fileUpload); // 傳圖，音，影檔功能
    $('[data-toggle="tooltip"]').tooltip();

    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });

    !isMobile && $submitMessageInput.emojioneArea({
        placeholder: $submitMessageInput.attr('placeholder') || '',
        searchPlaceholder: '搜尋',
        buttonTitle: '',
        autocomplete: false,
        events: {
            keydown: function(editor, ev) {
                if (13 === ev.keyCode) {
                    if (ev.shiftKey) {
                        return;
                    }

                    ev.preventDefault();
                    let emojioneAreaData = $submitMessageInput.data('emojioneArea');
                    $submitMessageInput.val(emojioneAreaData.getText());
                    let $submitMessageBtn = $('.message-input-container #submitMessageBtn');
                    submitMessage({ target: $submitMessageBtn.get(0) });
                }
            }
        }
    });

    $submitMessageInput.on('keydown', function(ev) { // 按enter可以發送訊息
        if (13 === ev.keyCode) {
            if (ev.shiftKey) {
                return;
            }
            ev.preventDefault();
            let $submitMessageBtn = $('.message-input-container #submitMessageBtn');
            submitMessage({ target: $submitMessageBtn.get(0) });
        }

        // if (13 === ev.keyCode) {
        //     // 按下 enter 後，如果有進行 shift 組合鍵時，在 PC 版本上，預設會自動換行
        //     if (!isMobile && ev.shiftKey) {
        //         return;
        //     }

        //     // 在行動裝置上按下 enter 鍵是進行換行動作
        //     // 在 PC 版本上，按下 enter 是直接發送
        //     if (isMobile) {
        //         ev.target.value += '\n';
        //     } else {
        //         $('.message-input-container #submitMessageBtn').click();
        //     }
        //     ev.preventDefault();
        // }
    });

    // 偵測 video 變成全螢幕時，把 control panel 及 toobar 進行顯示及隱藏切換
    $chatroomBody.on('fullscreenchange webkitfullscreenchange mozfullscreenchange', '.message video', function(ev) {
        var isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        var $toolbar = $('.chsr.toolbar');
        var $ctrlPanel = $('.chsr.ctrl-panel');
        var $chatWrapper = $('.chat-wrapper');
        var $chatroomContainer = $chatWrapper.find('.chatroom-container');
        var $profileToggle = $toolbar.find('#profileToggle');
        var $ticketToggle = $toolbar.find('#ticketToggle');

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
                maxHeight: '100%',
                padding: 0
            });

            $profileToggle.hasClass('active') && $profilePanel.addClass('d-none');
            $ticketToggle.hasClass('active') && $ticketPanel.addClass('d-none');
        } else {
            $toolbar.removeAttr('style');
            $ctrlPanel.removeAttr('style').addClass('d-sm-block');
            $chatWrapper.removeAttr('style');
            $chatroomContainer.removeAttr('style');
            $profileToggle.hasClass('active') && $profilePanel.removeClass('d-none');
            $ticketToggle.hasClass('active') && $ticketPanel.removeClass('d-none');
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

    $profilePanel.on('click', '.user-info .btn-update-name', changeConsumerDisplayName);
    $profilePanel.on('click', '.assignees-select .dropdown-item', userAssignMessager);
    $profilePanel.on('click', '.fields-select .dropdown-item', multiSelectChange);
    $profilePanel.on('click', '.leave-group-room button', userLeaveGroupRoom);
    $profilePanel.on('click', '.profile-confirm button', userInfoConfirm);
    $profilePanel.on('click', '.tag-chip .remove-chip', userRemoveTag);
    $profilePanel.on('keydown', '.tags-wrapper .tag-input', userAddTag);
    // =====end profile event=====

    // =====start utility event=====
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
    ]).then(function([appsRes, appsChatroomsRes, appsFieldsRes, consumersRes, groupsRes, usersRes]) {
        apps = appsRes.data;
        appsChatrooms = appsChatroomsRes.data;
        appsFields = appsFieldsRes.data;
        consumers = consumersRes.data;
        groups = groupsRes.data;
        users = usersRes.data;

        // 向 server 登記 socket
        return new Promise(function(resolve) {
            chatshierSocket.emit(SOCKET_EVENTS.USER_REGISTRATION, userId, resolve);
        });
    }).then(function() {
        return initChatData(apps);
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
                    $.notify('與伺服器失去了連線', { type: 'warning' });
                    resolve();
                });
            }).then(function() {
                return new Promise(function(resolve) {
                    socket.once(SOCKET_EVENTS.RECONNECT, function() {
                        $.notify('已恢復與伺服器的連線', { type: 'info' });
                        resolve();
                    });
                });
            }).then(function() {
                return new Promise(function(resolve) {
                    socket.emit(SOCKET_EVENTS.USER_REGISTRATION, userId, resolve);
                });
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
            var senderMsger;
            consumersFromSocket && Object.assign(consumers, consumersFromSocket);

            // 根據發送的時間從早到晚排序
            messages.sort(function(a, b) {
                return new Date(a.time).getTime() - new Date(b.time).getTime();
            });

            if (!appsChatrooms[appId]) {
                appsChatrooms[appId] = { chatrooms: {} };
            }

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
                    if (SYSTEM === message.from && 'imagemap' === message.type) {
                        message.from = CHATSHIER;
                    }
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
                            uiRequireData.person.photo = LOGOS[LINE_GROUP];
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

                    var person = CHATSHIER === message.from ? consumers[recipientUid] : consumers[senderUid];
                    var consumerUid = person ? person.platformUid : '';

                    var shouldHide = false;
                    if (isGroupChatroom) {
                        person = Object.assign({}, users[userId]);
                        person.photo = logos[app.type];
                        var $chatroomProfileGroup = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
                        shouldHide = $chatroomProfileGroup.hasClass('d-none');
                        $chatroomProfileGroup = $chatroomProfileGroup.replaceWith(generateProfileHtml(appId, chatroomId, consumerUid, person));
                        shouldHide && $chatroomProfileGroup.addClass('d-none');
                    } else if (senderUid && person) {
                        var $personProfileGroup = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + consumerUid + '"]');
                        shouldHide = $personProfileGroup.hasClass('d-none');
                        $personProfileGroup = $personProfileGroup.replaceWith(generateProfileHtml(appId, chatroomId, consumerUid, person));
                        shouldHide && $personProfileGroup.addClass('d-none');
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

                var $openedChatroomNow = $chatContentPanel.find('.chat-content.shown');
                var _appId = $openedChatroomNow.attr('app-id');
                var _chatroomId = $openedChatroomNow.attr('chatroom-id');
                if (_appId === appId && _chatroomId === chatroomId) {
                    var $messageInputContainer = $submitMessageInput.parents('.message-input-container');
                    $messageInputContainer.find('button').removeAttr('disabled');
                    $messageInputContainer.find('input').removeAttr('disabled');
                    $submitMessageInput.attr('placeholder', '輸入訊息...');
                }
            });
        });

        socket.on(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_CLIENT, function(data) {
            var senderUid = data.senderUid;
            if (senderUid === userId) {
                return;
            }

            var appId = data.appId;
            var chatroomId = data.chatroomId;
            var messager = data.messager;
            var messagerId = messager._id;
            var platformUid = messager.platformUid;

            var app = apps[appId];
            var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
            var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;

            var agents = appsAgents[appId].agents;
            var assigneeIds = (messager.assigned_ids || []).filter((agentUserId) => !!agents[agentUserId]);

            var $assignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.assigned');
            var $unassignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unassigned');
            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
            !isGroupChatroom && (tablinksSelectQuery += '[platform-uid="' + platformUid + '"]');
            var $appChatroom = $ctrlPanelChatroomCollapse.find('.collapse.app-types[app-type="' + app.type + '"] ' + tablinksSelectQuery);

            var assigneeIdsOld = appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId].assigned_ids || [];
            var tagsOld = appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId].tags || [];
            var isAlreadyAssignedToMe = assigneeIdsOld.indexOf(userId) >= 0;
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = messager;
            var isAssignedToMe = assigneeIds.indexOf(userId) >= 0;

            // 檢查 messager 更新內容的 assigned_ids 是否有包含自已
            // 有的話檢查此聊天室是否已有被加入至已指派
            // 沒有的話複製聊天室的 tablink 至已指派中
            if (isAssignedToMe) {
                $unassignedCollapse.find(tablinksSelectQuery).remove();
                var $assignedChatroom = $assignedCollapse.find(tablinksSelectQuery);
                if (0 === $assignedChatroom.length) {
                    $assignedCollapse.prepend($appChatroom.clone());
                    $.notify('"' + users[senderUid].name + '" 將客戶 "' + consumers[platformUid].name + '" 指派給你處理', { type: 'info' });
                }
            } else {
                $assignedCollapse.find(tablinksSelectQuery).remove();
                var $unassignedChatroom = $unassignedCollapse.find(tablinksSelectQuery);
                if (0 === $unassignedChatroom.length) {
                    $unassignedCollapse.prepend($appChatroom.clone());
                }

                if (isAlreadyAssignedToMe) {
                    $.notify('"' + users[senderUid].name + '" 移除了客戶 "' + consumers[platformUid].name + '" 給你的指派', { type: 'info' });
                }
            }

            // 更新 UI 資料
            var person = consumers[platformUid];
            person.photo = person.photo || 'image/user_large.png';
            var $profileGroup = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]');
            $profileGroup.replaceWith(generateProfileHtml(appId, chatroomId, platformUid, person));

            var tagsNew = messager.tags || [];
            var tagsAdd = tagsNew.filter(function(tag) {
                return tagsOld.indexOf(tag) < 0;
            });
            var tagsRemove = tagsOld.filter(function(tag) {
                return tagsNew.indexOf(tag) < 0;
            });

            if (1 === tagsAdd.length) {
                $.notify('"' + users[senderUid].name + '" 對客戶 "' + consumers[platformUid].name + '" 新增了 "' + tagsAdd.join('') + '" 標籤', { type: 'info' });
            } else if (1 === tagsRemove.length) {
                $.notify('"' + users[senderUid].name + '" 對客戶 "' + consumers[platformUid].name + '" 移除了 "' + tagsRemove.join('') + '" 標籤', { type: 'info' });
            } else {
                $.notify('"' + users[senderUid].name + '" 更新了客戶 "' + consumers[platformUid].name + '" 的資料', { type: 'info' });
            }
        });

        socket.on(SOCKET_EVENTS.CONSUMER_FOLLOW, function(data) {
            var appId = data.appId;
            var chatroomId = data.chatroomId;
            var messager = data.messager;
            var messagerId = messager._id;

            if (!appsChatrooms[appId]) {
                appsChatrooms[appId] = { chatrooms: {} };
            }

            if (!appsChatrooms[appId].chatrooms[chatroomId]) {
                appsChatrooms[appId].chatrooms[chatroomId] = { messagers: {} };
            }
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = messager;

            var $openedChatroomNow = $chatContentPanel.find('.chat-content.shown');
            var _appId = $openedChatroomNow.attr('app-id');
            var _chatroomId = $openedChatroomNow.attr('chatroom-id');
            if (_appId === appId && _chatroomId === chatroomId) {
                var $messageInputContainer = $submitMessageInput.parents('.message-input-container');
                $messageInputContainer.find('button').removeAttr('disabled');
                $messageInputContainer.find('input').removeAttr('disabled');
                $submitMessageInput.attr('placeholder', '輸入訊息...');
            }
        });

        socket.on(SOCKET_EVENTS.CONSUMER_UNFOLLOW, function(data) {
            var appId = data.appId;
            var chatroomId = data.chatroomId;
            var messager = data.messager;
            var messagerId = messager._id;

            if (!appsChatrooms[appId]) {
                appsChatrooms[appId] = { chatrooms: {} };
            }

            if (!appsChatrooms[appId].chatrooms[chatroomId]) {
                appsChatrooms[appId].chatrooms[chatroomId] = { messagers: {} };
            }
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = messager;

            var $openedChatroomNow = $chatContentPanel.find('.chat-content.shown');
            var _appId = $openedChatroomNow.attr('app-id');
            var _chatroomId = $openedChatroomNow.attr('chatroom-id');
            if (_appId === appId && _chatroomId === chatroomId) {
                var $messageInputContainer = $submitMessageInput.parents('.message-input-container');
                $messageInputContainer.find('button').attr('disabled', true);
                $messageInputContainer.find('input').attr('disabled', true);
                $submitMessageInput.attr('placeholder', '對方已取消關注');
            }
        });

        socket.on(SOCKET_EVENTS.USER_ADD_GROUP_MEMBER_TO_CLIENT, function(data) {
            var group = data.group;
            var adderUser = data.user;

            function yesToAddGroup() {
                $('.alert[data-notify="container"] #yesAddGroupBtn').attr('disabled', true);

                var groupId = data.groupId;
                var memberId = data.memberId;
                return api.groupsMembers.update(groupId, memberId, userId, { status: true }).then(function() {
                    return Promise.all([
                        api.apps.findAll(userId),
                        api.appsChatrooms.findAll(userId),
                        api.appsFields.findAll(userId),
                        api.consumers.findAll(userId),
                        api.groups.findAll(userId),
                        api.users.find(userId)
                    ]);
                }).then(function([appsRes, appsChatroomsRes, appsFieldsRes, consumersRes, groupsRes, usersRes]) {
                    apps = appsRes.data;
                    appsChatrooms = appsChatroomsRes.data;
                    appsFields = appsFieldsRes.data;
                    consumers = consumersRes.data;
                    groups = groupsRes.data;
                    users = usersRes.data;
                    return initChatData(apps);
                }).then(function() {
                    addGroupNotify && addGroupNotify.close();
                    $.notify('您已加入 "' + (group ? group.name : '') + '" 群組', { type: 'success' });
                }).catch(function() {
                    addGroupNotify && addGroupNotify.close();
                    $.notify('加入群組失敗，可至 設定->內部群組 重新加入', { type: 'success' });
                });
            }

            function noToAddGroup() {
                addGroupNotify && addGroupNotify.close();
            }

            $(document).on('click', '.alert[data-notify="container"] #yesAddGroupBtn', yesToAddGroup);
            $(document).on('click', '.alert[data-notify="container"] #noAddGroupBtn', noToAddGroup);

            var addGroupNotify = $.notify({
                icon: 'fas fa-users fa-fw',
                title: '群組邀請',
                message: '"' + (adderUser ? adderUser.name : '') + '" 邀請你加入他的 "' + (group ? group.name : '') + '" 群組'
            }, {
                type: 'info',
                delay: 15000,
                template: (
                    '<div data-notify="container" class="col-sm-3 alert alert-{0}" role="alert">' +
                        '<div class="font-weight-bold">' +
                            '<i class="mr-2" data-notify="icon"></i>' +
                            '<span data-notify="title">{1}</span>' +
                        '</div>' +
                        '<div class="my-2" data-notify="message">{2}</div>' +
                        '<div class="text-right">' +
                            '<button type="button" class="mr-1 btn btn-info" id="yesAddGroupBtn">是</button>' +
                            '<button type="button" class="ml-1 btn btn-light" id="noAddGroupBtn">否</button>' +
                        '</div>' +
                    '</div>'
                ),
                onClose: function() {
                    $(document).off('click', '.alert[data-notify="container"] #yesAddGroupBtn', yesToAddGroup);
                    $(document).off('click', '.alert[data-notify="container"] #noAddGroupBtn', noToAddGroup);
                }
            });
        });

        socket.on(SOCKET_EVENTS.USER_REMOVE_GROUP_MEMBER_TO_CLIENT, function(data) {
            var executeUser = users[data.userId];
            $.notify('您已被' + (executeUser ? ' "' + executeUser.name + '" ' : '') + '踢出了群組', { type: 'info' });

            return Promise.all([
                api.apps.findAll(userId),
                api.appsChatrooms.findAll(userId),
                api.appsFields.findAll(userId),
                api.consumers.findAll(userId),
                api.groups.findAll(userId),
                api.users.find(userId)
            ]).then(function([appsRes, appsChatroomsRes, appsFieldsRes, consumersRes, groupsRes, usersRes]) {
                apps = appsRes.data;
                appsChatrooms = appsChatroomsRes.data;
                appsFields = appsFieldsRes.data;
                consumers = consumersRes.data;
                groups = groupsRes.data;
                users = usersRes.data;
                return initChatData(apps);
            });
        });
    }

    function initChatData(apps) {
        chatroomList.length = 0;
        $chatroomBody.empty();
        $profileWrapper.empty();
        $ticketWrapper.empty();

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
                '<img class="app-icon" src="' + LOGOS[LINE] + '" />' +
                '<span>' + LINE + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types" app-type="' + LINE + '"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + FACEBOOK + '">' +
                '<img class="app-icon" src="' + LOGOS[FACEBOOK] + '" />' +
                '<span>' + FACEBOOK + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-down collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types" app-type="' + FACEBOOK + '"></div>' +
            '<li class="text-light nested list-group-item has-collapse" app-type="' + CHATSHIER + '">' +
                '<img class="app-icon" src="' + LOGOS[CHATSHIER] + '" />' +
                '<span>' + CHATSHIER + '</span>' +
                '<i class="ml-auto py-1 fas fa-chevron-up collapse-icon"></i>' +
            '</li>' +
            '<div class="collapse nested app-types show" app-type="' + CHATSHIER + '"></div>'
        );

        appsAgents = {};
        for (var appId in apps) {
            if (!appsChatrooms[appId]) {
                appsChatrooms[appId] = { chatrooms: {} };
            }

            if (!appsFields[appId]) {
                appsFields[appId] = { fields: {} };
            }

            var app = apps[appId];
            var chatrooms = appsChatrooms[appId].chatrooms;

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

            for (var chatroomId in chatrooms) {
                var chatroom = chatrooms[chatroomId];
                var uiRequireData = {
                    appId: appId,
                    name: app.name,
                    type: app.type,
                    chatroomId: chatroomId,
                    chatroom: chatroom
                };

                if (CHATSHIER === app.type) {
                    uiRequireData.person = Object.assign({}, users[userId]);
                    uiRequireData.person.photo = LOGOS[app.type];
                    uiRequireData.platformUid = userId;
                } else if (!!chatroom.platformGroupId) {
                    uiRequireData.person = Object.assign({}, users[userId]);
                    uiRequireData.person.photo = LOGOS[LINE_GROUP];
                    uiRequireData.platformUid = userId;
                }else {
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
        if (maxScrollHeight > 0 && !window.localStorage.getItem('isCtrlPanelPutAway')) {
            $('#ctrlPanel .scroll-bottom').removeClass('d-none');
        }
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
            chatroomPhoto = CHATSHIER === opts.appType ? 'image/group.png' : LOGOS[LINE_GROUP];
            chatroomName = chatroom.name || DEFAULT_CHATROOM_NAME;
        }

        var html = (
            '<li class="text-light nested list-group-item tablinks" ' + 'app-id="' + opts.appId + '" chatroom-id="' + opts.chatroomId + '" ' + (!isGroupChatroom ? 'platform-uid="' + opts.platformUid + '"' : '') + ' app-type="' + opts.appType + '">' +
                '<img class="app-icon consumer-photo" src="' + chatroomPhoto + '" />' +
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
            'template' === message.type ||
            'imagemap' === message.type
        );

        // 如果訊息是來自於 Chatshier 或 系統自動回覆 的話，訊息一律放在右邊
        // 如果訊息是來自於其他平台的話，訊息一律放在左邊
        var shouldRightSide =
            (appType !== CHATSHIER && (SYSTEM === message.from || CHATSHIER === message.from || VENDOR === message.from)) ||
            (appType === CHATSHIER && userId === platformUid);

        var contentType = imageContentType(message);

        return (
            '<div class="mb-3 message" message-time="' + message.time + '" message-type="' + message.type + '">' +
                '<div class="messager-name ' + (shouldRightSide ? 'text-right' : 'text-left') + '">' +
                    imageContentBadge(message.type) +
                    '<span class="sender-name">' + senderName + '</span>' +
                '</div>' +
                '<span class="message-group ' + (shouldRightSide ? 'right-side' : 'left-side') + '">' +
                    '<span class="content ' + (isMedia ? 'media' : 'words') + contentType + '">' + srcHtml + '</span>' +
                    '<span class="send-time">' + toTimeStr(message.time) + '</span>' +
                '</span>' +
            '</div>'
        );
    }

    function imageContentType(message) {
        switch (message.type) {
            case 'template':
                return ` ${message.template.type}-format`;
            case 'imagemap':
                return ' imagemap-format';
            default:
                return '';
        }
    }

    function imageContentBadge(type) {
        switch (type) {
            case 'template':
                return `<span class="mr-2 px-2 py-1 template-btn badge badge-pill badge-dark">模板訊息</span>`;
            case 'imagemap':
                return `<span class="mr-2 px-2 py-1 template-btn badge badge-pill badge-dark">圖文訊息</span>`;
            default:
                return '';
        }
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
            iconSrc: LOGOS[appType] || '',
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
                $consumerPhotos.attr('src', consumer.photo);
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
            var agents = appsAgents[appId].agents;
            var assigneeIds = (messagerConsumer.assigned_ids || []).filter((agentUserId) => !!agents[agentUserId]);

            if (assigneeIds.indexOf(userId) >= 0) {
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
            '<div class="chat-content d-none" app-id="' + appId + '" chatroom-id="' + chatroomId + '">' +
                '<div class="message-panel">' + totalMessageHtml + '</div>' +
            '</div>'
        );

        // if (requireData.position) {
        //     $('.chat-content[app-id="' + appId + '"]' + '[chatroom-id="' + requireData.chatroomId + '"]').on('scroll', function() {
        //         detectScrollTop($(this));
        //     });
        // }
    }

    function messageToPanelHtml(message, appType) {
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
                // 目前錢掌櫃的模板訊息尚未支援 FACEBOOK
                // 因此不顯示模板訊息
                if (FACEBOOK === appType) {
                    return '';
                }

                if (!message.template) {
                    let messageText = linkify(message.text || '');
                    return '<span class="text-content">' + messageText + '</span>';
                }
                return templateMessageType(message.template);
            case 'file':
                // var fileName = message.src.split('/').pop();
                return (
                    '<i class="fas fa-file fa-fw file-icon"></i>' +
                    '<span class="text-content">' + message.text + '\n<a href="' + message.src + '" download="' + message.src + '" target="_blank">' + message.src + '</a></span>'
                );
            case 'imagemap':
                return (
                    '<div class="imagemap-message-container">' +
                        `<img class="imagemap-image" src="${message.src || ''}" />` +
                        `<div class="imagemap-message-content row mx-0">${(message.imagemap ? photoFormShow(message) : '')}</div>` +
                    '</div>'
                );
            case 'text':
                var messageText = message.text || '';
                messageText = linkify(messageText);

                if (emojiData) {
                    emojiData.setText(messageText);
                    messageText = emojiData.editor ? emojiData.editor.html() : messageText;
                }
                return '<span class="text-content">' + messageText + '</span>';
            default:
                return '';
        }
    }

    function photoFormShow(message) {
        let box1, box2, box3, box4, box5, box6, str1, str2, str3, str4, str5, str6;
        switch (message.imagemap.form) {
            case 'form8':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                str3 = !message.imagemap.actions[2].text ? imagemapLink(message.imagemap.actions[2].linkUri) : imagemapText(message.imagemap.actions[2].text);
                str4 = !message.imagemap.actions[3].text ? imagemapLink(message.imagemap.actions[3].linkUri) : imagemapText(message.imagemap.actions[3].text);
                str5 = !message.imagemap.actions[4].text ? imagemapLink(message.imagemap.actions[4].linkUri) : imagemapText(message.imagemap.actions[4].text);
                str6 = !message.imagemap.actions[5].text ? imagemapLink(message.imagemap.actions[5].linkUri) : imagemapText(message.imagemap.actions[5].text);
                box1 = `<div class="box" id="box1" style="width: 33%; padding-top: 20%;">${str1}</div>`;
                box2 = `<div class="box" id="box2" style="width: 33%; padding-top: 20%;">${str2}</div>`;
                box3 = `<div class="box" id="box3" style="width: 33%; padding-top: 20%;">${str3}</div>`;
                box4 = `<div class="box" id="box4" style="width: 33%; padding-top: 20%;">${str4}</div>`;
                box5 = `<div class="box" id="box5" style="width: 33%; padding-top: 20%;">${str5}</div>`;
                box6 = `<div class="box" id="box6" style="width: 33%; padding-top: 20%;">${str6}</div>`;
                return box1 + box2 + box3 + box4 + box5 + box6;
            case 'form7':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                str3 = !message.imagemap.actions[2].text ? imagemapLink(message.imagemap.actions[2].linkUri) : imagemapText(message.imagemap.actions[2].text);
                box1 = `<div class="box" id="box1" style="width: 100%; height: 50%; padding-top: 20%;">${str1}</div>`;
                box2 = `<div class="box" id="box2" style="width: 100%; height: 25%; padding-top: 10%;">${str2}</div>`;
                box3 = `<div class="box" id="box3" style="width: 100%; height: 25%; padding-top: 10%;">${str3}</div>`;
                return box1 + box2 + box3;
            case 'form6':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                str3 = !message.imagemap.actions[2].text ? imagemapLink(message.imagemap.actions[2].linkUri) : imagemapText(message.imagemap.actions[2].text);
                box1 = `<div class="box" id="box1" style="width: 100%; padding-top: 20%;">${str1}</div>`;
                box2 = `<div class="box" id="box2" style="width: 50%; padding-top: 20%;">${str2}</div>`;
                box3 = `<div class="box" id="box3" style="width: 50%; padding-top: 20%;">${str3}</div>`;
                return box1 + box2 + box3;
            case 'form5':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                str3 = !message.imagemap.actions[2].text ? imagemapLink(message.imagemap.actions[2].linkUri) : imagemapText(message.imagemap.actions[2].text);
                str4 = !message.imagemap.actions[3].text ? imagemapLink(message.imagemap.actions[3].linkUri) : imagemapText(message.imagemap.actions[3].text);
                box1 = '<div class="box" id="box1" style="width: 50%; padding-top: 20%;">' + str1 + '</div>';
                box2 = '<div class="box" id="box2" style="width: 50%; padding-top: 20%;">' + str2 + '</div>';
                box3 = '<div class="box" id="box3" style="width: 50%; padding-top: 20%;">' + str3 + '</div>';
                box4 = '<div class="box" id="box4" style="width: 50%; padding-top: 20%;">' + str4 + '</div>';
                return box1 + box2 + box3 + box4;
            case 'form4':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                str3 = !message.imagemap.actions[2].text ? imagemapLink(message.imagemap.actions[2].linkUri) : imagemapText(message.imagemap.actions[2].text);
                box1 = `<div class="box" id="box1" style="width: 100%; padding-top: 13%;">${str1}</div>`;
                box2 = `<div class="box" id="box2" style="width: 100%; padding-top: 13%;">${str2}</div>`;
                box3 = `<div class="box" id="box3" style="width: 100%; padding-top: 13%;">${str3}</div>`;
                return box1 + box2 + box3;
            case 'form3':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                box1 = '<div class="box" id="box1" style="width: 100%; padding-top: 20%;">' + str1 + '</div>';
                box2 = '<div class="box" id="box2" style="width: 100%; padding-top: 20%;">' + str2 + '</div>';
                return box1 + box2;
            case 'form2':
                str1 = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                str2 = !message.imagemap.actions[1].text ? imagemapLink(message.imagemap.actions[1].linkUri) : imagemapText(message.imagemap.actions[1].text);
                box1 = '<div class="box col-sm" id="box1" style="padding-top: 45%">' + str1 + '</div>';
                box2 = '<div class="box col-sm" id="box2" style="padding-top: 45%">' + str2 + '</div>';
                return box1 + box2;
            case 'form1':
                let str = !message.imagemap.actions[0].text ? imagemapLink(message.imagemap.actions[0].linkUri) : imagemapText(message.imagemap.actions[0].text);
                box1 = '<div class="box" id="box1" style="width: 100%; padding-top: 45%">' + str + '</div>';
                return box1;
            default:
                return '';
        }
    }

    function imagemapLink(url) {
        return `<span class="imagemap-text-space p-3"><a href="${url}" target="_blank">導入連結</a></span>`;
    }

    function imagemapText(text) {
        return `<span class="imagemap-text-space p-3">${text}</span>`;
    }

    function templateMessageType(template) {
        return (
            '<div class="d-flex template-container">' +
                (function() {
                    switch (template.type) {
                        case 'confirm':
                            return (
                                '<div class="template-sm">' +
                                    `<div class="d-flex flex-wrap align-items-center template-sm-title">
                                        <span class="p-2">${18 >= template.text.length ? template.text : `${template.text.substring(0, 17)}...`}</span>
                                    </div>` +
                                    '<div class="d-flex flex-row justify-content-between template-sm-buttons">' +
                                        (function() {
                                            return template.actions.map((action, i) => (
                                                `<div class="d-flex flex-column justify-content-center my-auto px-3 template-sm-button${i + 1}">
                                                    <span class="template-confirm">${8 >= action.label.length ? action.label : `${action.label.substring(0, 6)}...`}</span>
                                                    <span class="template-confirm">(${4 >= getTemplateOutput(action).length ? getTemplateOutput(action) : `${getTemplateOutput(action).substring(0, 4)}...`})</span>
                                                </div>`
                                            )).join('');
                                        })() +
                                    '</div>' +
                                '</div>'
                            );
                        case 'buttons':
                            return (
                                '<div class="template ml-1">' +
                                    (function() {
                                        if (template.thumbnailImageUrl) {
                                            return (
                                                '<div class="text-center top-img-container">' +
                                                    `<img class="template-image image-fit" src="${template.thumbnailImageUrl}" alt="未顯示圖片" />` +
                                                '</div>'
                                            );
                                        }
                                        return '';
                                    })() +
                                    `<div class="template-title py-2 px-3">
                                        <span class="template-title">${template.title}</span>
                                    </div>` +
                                    `<div class="template-desc py-2 px-3">
                                        <span class="template-desc">${template.text}</span>
                                    </div>` +
                                    '<div class="d-flex flex-column py-2 template-buttons">' +
                                        (function() {
                                            return template.actions.map((action, i) => {
                                                let label = action.label || '';
                                                return (
                                                    `<div class="d-flex flex-column justify-content-center my-1 px-3 template-button${i + 1}">
                                                        <span class="template-button">${10 >= label.length ? label : `${label.substring(0, 9)}...`}</span>
                                                        <span class="template-button">(輸出：${10 >= getTemplateOutput(action).length ? getTemplateOutput(action) : `${getTemplateOutput(action).substring(0, 9)}...`})</span>
                                                    </div>`
                                                );
                                            }).join('');
                                        })() +
                                    '</div>' +
                                '</div>'
                            );
                        case 'carousel':
                            return template.columns.map((column) => (
                                '<div class="template ml-1">' +
                                    '<div class="text-center top-img-container">' +
                                        `<img src="${column.thumbnailImageUrl}" class="template-image image-fit" alt="未顯示圖片" />` +
                                    '</div>' +
                                    `<div class="template-title py-2 px-3">
                                        <span class="template-title">${column.title}</span>
                                    </div>` +
                                    `<div class="template-desc py-2 px-3">
                                        <span class="template-desc">${column.text}</span>
                                    </div>` +
                                    '<div class="d-flex flex-column py-2 template-buttons">' +
                                        (function() {
                                            return column.actions.map((action, i) => {
                                                let label = action.label || '';
                                                return (
                                                    `<div class="d-flex flex-column justify-content-center my-1 px-3 template-button${i + 1}">
                                                        <span class="template-button">${10 >= label.length ? label : `${label.substring(0, 9)}...`}</span>
                                                        <span class="template-button">(輸出：${10 >= getTemplateOutput(action).length ? getTemplateOutput(action) : `${getTemplateOutput(action).substring(0, 9)}...`})</span>
                                                    </div>`
                                                );
                                            }).join('');
                                        })() +
                                    '</div>' +
                                '</div>'
                            )).join('');
                        default:
                    }
                })() +
            '</div>'
        );
    }

    function getTemplateOutput(action) {
        switch (action.type) {
            case 'uri':
                return action.uri || '';
            case 'text':
                return action.text || '';
            case 'postback':
                return '互動資料';
            default:
                return '';
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

            if (SYSTEM === message.from && 'imagemap' === message.type) {
                message.from = CHATSHIER;
            }

            var srcHtml = messageToPanelHtml(message, appType);
            if (!srcHtml) {
                continue;
            }
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
        var person = requireData.person;
        if (!person) {
            return;
        }

        var appId = requireData.appId;
        var chatroomId = requireData.chatroomId;
        var platformUid = requireData.platformUid;
        person.photo = person.photo || 'image/user_large.png';
        $profileWrapper.append(generateProfileHtml(appId, chatroomId, platformUid, person));
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

    function generateProfileHtml(appId, chatroomId, platformUid, person) {
        return (
            '<div class="profile-group" app-id="' + appId + '" chatroom-id="' + chatroomId + '" platform-uid="' + platformUid + '">' +
                '<div class="photo-container">' +
                    '<img class="consumer-avatar larger" src="' + person.photo + '" alt="無法顯示相片" />' +
                '</div>' +
                (function() {
                    var app = apps[appId];
                    var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
                    var isGroupChatroom = CHATSHIER === app.type || !!chatroom.platformGroupId;
                    return isGroupChatroom
                        ? generateChatroomProfileHtml(appId, chatroomId)
                        : generatePersonProfileHtml(appId, chatroomId, platformUid, person);
                })() +
            '</div>'
        );
    }

    function generatePersonProfileHtml(appId, chatroomId, platformUid, person) {
        // 不處理已棄用的 fields
        var skipAliases = ['name', 'assigned', 'createdTime', 'lastTime', 'chatCount'];

        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
        var personDisplayName = (messagerSelf.namings && messagerSelf.namings[platformUid]) || '';

        var timezoneGap = new Date().getTimezoneOffset() * 60 * 1000;
        var agents = appsAgents[appId].agents;
        var assigneeIds = (messager.assigned_ids || []).filter((agentUserId) => !!agents[agentUserId]);
        var assigneeNames = assigneeIds.map((agentUserId) => agents[agentUserId].name);
        var assigneeNamesText = assigneeNames.length > 1 ? assigneeNames[0] + ' 及其他 ' + (assigneeNames.length - 1) + ' 名' : assigneeNames.join('');

        return (
            '<form class="about-form">' +
                '<div class="px-2 d-flex align-items-center form-group user-info">' +
                    '<label class="px-0 col-3 col-form-label">' + transJson['Name'] + '</label>' +
                    '<div class="pr-0 col-9 d-flex">' +
                        '<input class="form-control" type="text" placeholder="' + person.name + '" value="' + personDisplayName + '" autocapitalize="none" />' +
                        '<button type="button" class="ml-2 btn btn-primary btn-update-name">變更</button>' +
                    '</div>' +
                '</div>' +

                '<div class="px-2 d-flex align-items-center form-group user-info">' +
                    '<label class="px-0 col-3 col-form-label">' + transJson['First chat date'] + '</label>' +
                    '<div class="pr-0 col-9">' +
                        '<input class="form-control" type="datetime-local" value="' + new Date(new Date(messagerSelf.createdTime).getTime() - timezoneGap).toJSON().split('.').shift() + '" disabled />' +
                    '</div>' +
                '</div>' +

                '<div class="px-2 d-flex align-items-center form-group user-info">' +
                    '<label class="px-0 col-3 col-form-label">' + transJson['Recent chat date'] + '</label>' +
                    '<div class="pr-0 col-9">' +
                        '<input class="form-control" type="datetime-local" value="' + new Date(new Date(messagerSelf.lastTime).getTime() - timezoneGap).toJSON().split('.').shift() + '" disabled />' +
                    '</div>' +
                '</div>' +

                '<div class="px-2 d-flex align-items-center form-group user-info">' +
                    '<label class="px-0 col-3 col-form-label">' + transJson['Chat time(s)'] + '</label>' +
                    '<div class="pr-0 col-9">' +
                        '<input class="form-control" type="text" value="' + messagerSelf.chatCount + '" disabled />' +
                    '</div>' +
                '</div>' +

                '<div class="px-2 d-flex form-group user-info">' +
                    '<label class="px-0 col-3 col-form-label">' + transJson['Assigned'] + '</label>' +
                    '<div class="pr-0 col-9 btn-group btn-block multi-select-wrapper">' +
                        '<button class="btn btn-light btn-border btn-block dropdown-toggle" data-toggle="dropdown" aria-expanded="false">' +
                            '<span class="multi-select-values">' + assigneeNamesText + '</span>' +
                            '<span class="caret"></span>' +
                        '</button>' +
                        '<div class="multi-select-container dropdown-menu assignees-select">' +
                            (function() {
                                return Object.keys(agents).map(function(agentUserId) {
                                    var isAssigned = assigneeIds.indexOf(agentUserId) >= 0;
                                    return (
                                        '<div class="px-3 dropdown-item">' +
                                            '<div class="form-check form-check-inline">' +
                                                '<label class="form-check-label">' +
                                                    '<input type="checkbox" class="form-check-input" value="' + agentUserId + '"' + (isAssigned ? ' checked="true"' : '') + '>' +
                                                    agents[agentUserId].name +
                                                '</label>' +
                                            '</div>' +
                                        '</div>'
                                    );
                                }).join('');
                            })() +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</form>' +
            '<hr />' +
            '<form class="fields-form">' +
                (function() {
                    // 呈現客戶分類條件資料之前先把客戶分類條件資料設定的順序排列
                    var fields = appsFields[appId].fields;
                    var fieldIds = Object.keys(fields);

                    var SETS_TYPES = api.appsFields.SETS_TYPES;
                    var FIELD_TYPES = api.appsFields.TYPES;
                    fieldIds.sort(function(a, b) {
                        let fieldsA = appsFields[appId].fields[a];
                        let fieldsB = appsFields[appId].fields[b];

                        // DEFAULT, SYSTEM 在前 CUSTOM 在後
                        if (FIELD_TYPES.CUSTOM !== fieldsA.type &&
                            FIELD_TYPES.CUSTOM === fieldsB.type) {
                            return false;
                        } else if (FIELD_TYPES.CUSTOM === fieldsA.type &&
                            FIELD_TYPES.CUSTOM !== fieldsB.type) {
                            return true;
                        }
                        return fieldsA.order - fieldsB.order;
                    });

                    var customFields = messager.custom_fields || {};

                    return fieldIds.map(function(fieldId) {
                        var field = fields[fieldId];
                        if (skipAliases.indexOf(field.alias) >= 0) {
                            return '';
                        }

                        var fieldValue;
                        if (field.type === api.appsFields.TYPES.CUSTOM) {
                            fieldValue = customFields[fieldId] ? customFields[fieldId].value : '';
                        } else {
                            fieldValue = undefined !== messager[field.alias] ? messager[field.alias] : '';
                        }

                        switch (field.setsType) {
                            case SETS_TYPES.SELECT:
                                return (
                                    '<div class="px-2 d-flex align-items-center form-group profile-content user-info" field-id="' + fieldId + '">' +
                                        '<label class="px-0 col-3 col-form-label">' + (transJson[field.text] || field.text) + '</label>' +
                                        '<div class="pr-0 col-9">' +
                                            '<select class="form-control field-value" value="' + fieldValue + '">' +
                                                '<option value="">未選擇</option>' +
                                                (function(sets) {
                                                    return sets.map(function(set, i) {
                                                        return (
                                                            '<option value="' + set + '" ' + (set === fieldValue ? 'selected' : '') + '>' + (transJson[sets[i]] || sets[i]) + '</option>'
                                                        );
                                                    }).join('');
                                                })(field.sets) +
                                            '</select>' +
                                        '</div>' +
                                    '</div>'
                                );
                            case SETS_TYPES.MULTI_SELECT:
                                var selectValues = fieldValue instanceof Array ? fieldValue : [];
                                var multiSelectTextArr = selectValues.reduce(function(output, value, i) {
                                    if (!value) {
                                        return output;
                                    }
                                    output.push(field.sets[i]);
                                    return output;
                                }, []);
                                var multiSelectText = multiSelectTextArr.length > 1 ? multiSelectTextArr[0] + ' 及其他 ' + (multiSelectTextArr.length - 1) + ' 項' : multiSelectTextArr.join('');

                                return (
                                    '<div class="px-2 d-flex align-items-center form-group profile-content user-info" field-id="' + fieldId + '">' +
                                        '<label class="px-0 col-3 col-form-label">' + (transJson[field.text] || field.text) + '</label>' +
                                        '<div class="pr-0 col-9 btn-group btn-block multi-select-wrapper">' +
                                            '<button class="btn btn-light btn-border btn-block dropdown-toggle" data-toggle="dropdown" aria-expanded="false">' +
                                                '<span class="multi-select-values">' + multiSelectText + '</span>' +
                                                '<span class="caret"></span>' +
                                            '</button>' +
                                            '<div class="multi-select-container dropdown-menu fields-select">' +
                                                (function(sets) {
                                                    return sets.map(function(set, i) {
                                                        return (
                                                            '<div class="px-3 dropdown-item">' +
                                                                '<div class="form-check form-check-inline">' +
                                                                    '<label class="form-check-label">' +
                                                                        '<input class="form-check-input" type="checkbox" value="' + set + '"' + (selectValues[i] ? ' checked="true"' : '') + '/>' +
                                                                        set +
                                                                    '</label>' +
                                                                '</div>' +
                                                            '</div>'
                                                        );
                                                    }).join('');
                                                })(field.sets) +
                                            '</div>' +
                                        '</div>' +
                                    '</div>'
                                );
                            case SETS_TYPES.CHECKBOX:
                                return (
                                    '<div class="px-2 d-flex align-items-center form-group profile-content user-info" field-id="' + fieldId + '">' +
                                        '<label class="px-0 col-3 col-form-label">' + (transJson[field.text] || field.text) + '</label>' +
                                        '<div class="pr-0 col-9">' +
                                            '<input class="form-control field-value" type="checkbox"' + (fieldValue ? ' checked="true"' : '') + '/>' +
                                        '</div>' +
                                    '</div>'
                                );
                            case SETS_TYPES.DATE:
                                fieldValue = fieldValue || 0;
                                var fieldDateTime = new Date(fieldValue).getTime();
                                fieldDateTime = isNaN(fieldDateTime) ? new Date() : fieldDateTime - timezoneGap;
                                var fieldDateStr = new Date(fieldDateTime).toJSON().split('.').shift();
                                return (
                                    '<div class="px-2 d-flex align-items-center form-group profile-content user-info" field-id="' + fieldId + '">' +
                                        '<label class="px-0 col-3 col-form-label">' + (transJson[field.text] || field.text) + '</label>' +
                                        '<div class="pr-0 col-9">' +
                                            '<input class="form-control field-value" type="datetime-local" value="' + fieldDateStr + '" ' + '/>' +
                                        '</div>' +
                                    '</div>'
                                );
                            case SETS_TYPES.TEXT:
                            case SETS_TYPES.NUMBER:
                            default:
                                var inputType = SETS_TYPES.NUMBER === field.setsType ? 'tel' : 'text';
                                inputType = 'email' === field.alias ? 'email' : inputType;
                                return (
                                    '<div class="px-2 d-flex align-items-center form-group profile-content user-info" field-id="' + fieldId + '">' +
                                        '<label class="px-0 col-3 col-form-label">' + (transJson[field.text] || field.text) + '</label>' +
                                        '<div class="pr-0 col-9">' +
                                            '<input class="form-control field-value" type="' + inputType + '" placeholder="尚未輸入" value="' + fieldValue + '" autocapitalize="none" />' +
                                        '</div>' +
                                    '</div>'
                                );
                        }
                    }).join('');
                })() +
                '<div class="text-center profile-confirm">' +
                    '<button type="button" class="btn btn-info">更新資料</button>' +
                '</div>' +
                '<hr />' +
                '<div class="px-2 d-flex align-items-center form-group tags-wrapper">' +
                    '<label class="px-0 col-3 col-form-label">標籤</label>' +
                    '<div class="pr-0 col-9 tags-container">' +
                        (function() {
                            var tags = messager.tags || [];
                            if (0 === tags.length) {
                                return '<span>無標籤</span>';
                            }

                            return tags.map(function(tag) {
                                return (
                                    '<div class="d-inline-flex align-items-center mx-2 my-1 tag-chip">' +
                                        '<span class="pt-2 pb-2 pl-2 chip-text">' + tag + '</span>' +
                                        '<i class="p-2 fas fa-times remove-chip"></i>' +
                                    '</div>'
                                );
                            }).join('');
                        })() +
                    '</div>' +
                '</div>' +

                '<div class="px-2 d-flex align-items-center form-group tags-wrapper">' +
                    '<label class="px-0 col-3 col-form-label"></label>' +
                    '<div class="pr-0 col-9">' +
                        '<input class="form-control tag-input" type="text" placeholder="新增標籤" autocapitalize="none" />' +
                    '</div>' +
                '</div>' +
            '</form>'
        );
    }

    function generateChatroomProfileHtml(appId, chatroomId) {
        var app = apps[appId];
        var chatroom = appsChatrooms[appId].chatrooms[chatroomId];
        var groupId = apps[appId].group_id;
        var group = groups[groupId];
        var chatroomName = chatroom.name || '';

        return (
            '<div class="px-2 d-flex align-items-center form-group">' +
                '<label class="px-0 col-3 col-form-label">聊天室名稱</label>' +
                '<div class="pr-0 col-9 d-flex profile-content">' +
                    '<input class="form-control chatroom-name" type="text" value="' + chatroomName + '" placeholder="' + DEFAULT_CHATROOM_NAME + '"/>' +
                    '<button class="ml-2 btn btn-primary btn-update-chatroom">更新</button>' +
                '</div>' +
            '</div>' +
            '<div class="px-2 d-flex form-group">' +
                '<label class="px-0 col-3 col-form-label">' + (CHATSHIER === app.type ? '群組成員' : '客戶成員') + '</label>' +
                '<div class="pr-0 col-9 d-flex flex-wrap profile-content">' +
                    (function() {
                        var html = '';
                        if (CHATSHIER === app.type) {
                            for (var memberId in group.members) {
                                var memberUserId = group.members[memberId].user_id;
                                var memberUser = users[memberUserId];
                                html += (
                                    '<div class="person-chip">' +
                                        '<img src="' + (memberUser.photo || 'image/avatar-default.png') + '" class="person-avatar" alt="" />' +
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
                                var consumer = consumers[messager.platformUid] || {};
                                html += (
                                    '<div class="person-chip">' +
                                        '<img src="' + (consumer.photo || 'image/avatar-default.png') + '" class="person-avatar" alt="" onerror="this.src=\'image/user_large.png\'" />' +
                                        '<span>' + consumer.name + '</span>' +
                                    '</div>'
                                );
                            }
                        }
                        return html;
                    })() +
                '</div>' +
            '</div>' +

            '<div class="p-2 leave-group-room text-right' + (CHATSHIER === app.type ? ' d-none' : '') + '">' +
                '<button type="button" class="btn btn-danger">' +
                    '<i class="fas fa-sign-out-alt fa-fw"></i>' +
                    '<span>離開群組</span>' +
                '</button>' +
            '</div>'
        );
    }

    // ==========end initialize function========== //

    // =====start chat function=====
    function userClickTablink() {
        var $eventTablink = $(this);
        var $messageInputContainer = $submitMessageInput.parents('.message-input-container');

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

        let $imagemapArea = $('.message-input-container .imagemap-area');
        let $imagemapContainer = $('.message-input .imagemap-container');
        if (LINE !== appType) {
            $imagemapContainer.addClass('d-none');
        } else {
            $imagemapContainer.removeClass('d-none');
        }
        $imagemapArea.empty().addClass('d-none');

        if (CHATSHIER !== appType) {
            var messagers = chatroom.messagers;

            var messagerNameList = [];
            for (var messagerId in messagers) {
                var _messager = messagers[messagerId];
                var consumer = consumers[_messager.platformUid] || {};
                if (appType === _messager.type) {
                    messagerNameList.push(consumer.name);
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
        var $chatContent = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $profileGroup = $('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        var $ticketGroup = $('.ticket-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        $messageInputContainer.removeClass('d-none');
        $chatContent.siblings().removeClass('shown').addClass('d-none');
        $chatContent.addClass('shown').removeClass('d-none');

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
            $profileToggle.addClass('active');
            $profilePanel.addClass('d-none');
            $ticketToggle.removeClass('active');
            $ticketPanel.removeClass('d-none');
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

        // 如果 1vs1 聊天室中的客戶已經封鎖或解除關注，則無法發送任何訊息給對方
        if (!chatroom.platformGroupId) {
            var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
            if (!chatroom.platformGroupId && messager.isUnfollowed) {
                $messageInputContainer.find('button').attr('disabled', true);
                $messageInputContainer.find('input').attr('disabled', true);
                $submitMessageInput.attr('placeholder', '對方已取消關注');
            } else {
                $messageInputContainer.find('button').removeAttr('disabled');
                $messageInputContainer.find('input').removeAttr('disabled');
                $submitMessageInput.attr('placeholder', '輸入訊息...');
            }
        }
    }

    function readClientMsg() {
        var $selectedTablinks = $('.tablinks.selected').first();
        var appId = $selectedTablinks.attr('app-id');
        var chatroomId = $selectedTablinks.attr('chatroom-id');
        var platformUid = $selectedTablinks.attr('platform-uid');

        if (!(apps[appId] && appsChatrooms[appId])) {
            return;
        }

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
        ev.preventDefault && ev.preventDefault();
        var $evElem = $(ev.target);
        var $contentPanel = $evElem.parentsUntil('.chat-content-panel');
        var $messageView = $contentPanel.siblings('.chatroom-body').find('.chat-content.shown');

        var appId = $messageView.attr('app-id');
        var appType = apps[appId].type;
        var chatroomId = $messageView.attr('chatroom-id');
        var platformMessager = findChatroomMessager(appId, chatroomId, appType);
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var messageText = $submitMessageInput.val();

        if (!(appId && chatroomId && messageText)) {
            return;
        }

        // 發送給各平台時，文字訊息前面加上自己的名稱當成前輟
        var messagePrefix = appType !== CHATSHIER ? '[' + users[userId].name + ']\n' : '';

        /** @type {ChatshierMessage} */
        var messageToSend = {
            from: CHATSHIER,
            time: Date.now(),
            text: messagePrefix + messageText,
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
            !isMobile && $submitMessageInput.data('emojioneArea').setText('');

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

        var kiloByte = 1024;
        var megaByte = kiloByte * 1024;
        var config = window.chatshier.config;
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
        if (fileSize >= kiloByte) {
            fileSize /= kiloByte;
            fileSize = fileSize.toFixed(1) + ' MB';
        } else {
            fileSize = fileSize.toFixed(1) + ' KB';
        }

        // 傳送檔案時，帶上檔案大小當成文字訊息
        var fileText = 'file' === messageType ? '小幫手傳送檔案給你\n檔案名稱: ' + file.name + '\n檔案大小: ' + fileSize : '';

        /** @type {ChatshierMessage} */
        var messageToSend = {
            text: fileText,
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

        return Promise.resolve().then(() => {
            if ('audio' === messageType) {
                return new Promise((resolve) => {
                    var audio = document.createElement('audio');
                    if (!audio) {
                        return resolve(0);
                    }

                    audio.addEventListener('loadedmetadata', function() {
                        let duration = audio.duration * 1000;
                        URL.revokeObjectURL(audio.src);
                        audio.src = audio = void 0;
                        resolve(duration);
                    }, false);
                    audio.src = URL.createObjectURL(file);
                });
            }
            return 0;
        }).then((duration) => {
            if (duration) {
                messageToSend.duration = duration;
            }

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
        });
    }

    function showImagemapArea() {
        let $imagemapBtn = $(this);
        if ($imagemapBtn.attr('disabled')) {
            return;
        }

        let $imagemapArea = $('.message-input-container .imagemap-area');
        if (!$imagemapArea.hasClass('d-none')) {
            $imagemapArea.addClass('d-none');
            return;
        }

        if (!$imagemapArea.html()) {
            let appId = $imagemapBtn.parents('.message-input-container').siblings('.chatroom-body').find('.chat-content.shown').attr('app-id');
            return api.appsImagemaps.findAll(appId, userId).then((resJson) => {
                let appsImagemaps = resJson.data;
                if (!appsImagemaps[appId]) {
                    $imagemapBtn.attr('disabled', true);
                    return;
                }
                $imagemapBtn.removeAttr('disabled');

                let imagemaps = appsImagemaps[appId].imagemaps;
                let imagemapIds = Object.keys(imagemaps).filter((imagemapId) => !imagemaps[imagemapId].isDeleted);

                $imagemapArea.html(
                    imagemapIds.map((imagemapId) => {
                        return `<button class="m-2 btn btn-secondary btn-sm send-imagemap-btn" id="sendImagemapBtn" app-id="${appId}" imagemap-id="${imagemapId}">${imagemaps[imagemapId].title}</button>`;
                    }).join('')
                );
                $imagemapArea.removeClass('d-none');
            }).catch(() => {
                $.notify('載入圖文訊息失敗', { type: 'danger' });
            });
        } else {
            $imagemapArea.removeClass('d-none');
        }
    }

    function sendImagemap(ev) {
        ev.preventDefault();
        var $evElem = $(ev.target);
        var $contentPanel = $evElem.parentsUntil('.chat-content-panel');
        var $messageView = $contentPanel.siblings('.chatroom-body').find('.chat-content.shown');

        let appId = $(this).attr('app-id');
        let imagemapId = $(this).attr('imagemap-id');
        var appType = apps[appId].type;
        var chatroomId = $messageView.attr('chatroom-id');
        var platformMessager = findChatroomMessager(appId, chatroomId, appType);
        var messagerSelf = findMessagerSelf(appId, chatroomId);

        if (!(appId && chatroomId)) {
            return;
        }

        return api.appsImagemaps.findOne(appId, imagemapId, userId).then((resJson) => {
            let imagemap = {
                type: resJson.data[imagemapId].type,
                baseUrl: resJson.data[imagemapId].baseUrl,
                altText: resJson.data[imagemapId].altText,
                baseSize: resJson.data[imagemapId].baseSize,
                actions: resJson.data[imagemapId].actions,
                form: resJson.data[imagemapId].form,
                messager_id: messagerSelf._id
            };

            /** @type {ChatshierChatSocketBody} */
            var socketBody = {
                app_id: appId,
                type: 'LINE',
                chatroom_id: chatroomId,
                senderUid: userId,
                recipientUid: platformMessager.platformUid,
                messages: [imagemap]
            };

            var $loadingElem = generateLoadingJqElem();
            $messageView.find('.message-panel').append($loadingElem);
            scrollMessagePanelToBottom(appId, chatroomId);

            var $imagemapArea = $('.message-input-container .imagemap-area');
            $imagemapArea.addClass('d-none');

            return new Promise(function(resolve, reject) {
                $submitMessageInput.val('');
                !isMobile && $submitMessageInput.data('emojioneArea').setText('');

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
        }).catch((ERR) => {
            $.notify('發送imagemap失敗', { type: 'danger' });
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
                    $chatroomTablinks.find('.app-icon').attr('src', consumer.photo);
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
        var srcHtml = messageToPanelHtml(_message, appType);
        if (!srcHtml) {
            return;
        }

        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var chatSelectQuery = '.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]';
        var $messagePanel = $chatContentPanel.find(chatSelectQuery + ' .message-panel');

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

    function userRemoveTag(ev) {
        var $profileGroup = $(ev.target).parents('.profile-group');
        var appId = $profileGroup.attr('app-id');
        var chatroomId = $profileGroup.attr('chatroom-id');
        var platformUid = $profileGroup.attr('platform-uid');
        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
        var messagerId = messager._id;
        var tags = messager.tags || [];

        var tag = $(ev.target).siblings('.chip-text').text();
        var tagIdx = tags.indexOf(tag);
        if (tagIdx < 0) {
            return Promise.resolve();
        }

        tags.splice(tagIdx, 1);
        var putMessager = {
            tags: tags
        };

        return api.appsChatroomsMessagers.update(appId, chatroomId, messagerId, userId, putMessager).then(function(resJson) {
            var _appsChatroomsMessagers = resJson.data;
            var _messager = _appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = _messager;

            var person = consumers[platformUid];
            person.photo = person.photo || 'image/user_large.png';
            $profileGroup.replaceWith(generateProfileHtml(appId, chatroomId, platformUid, person));
            $profilePanel.scrollTop($profilePanel.prop('scrollHeight'));

            return new Promise(function(resolve, reject) {
                chatshierSocket.emit(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_SERVER, {
                    appId: appId,
                    chatroomId: chatroomId,
                    messager: _messager,
                    senderUid: userId
                }, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    }

    function userAddTag(ev) {
        if (13 !== ev.keyCode) {
            return;
        }
        ev.preventDefault();

        var $profileGroup = $(ev.target).parents('.profile-group');
        var appId = $profileGroup.attr('app-id');
        var chatroomId = $profileGroup.attr('chatroom-id');
        var platformUid = $profileGroup.attr('platform-uid');
        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
        var messagerId = messager._id;
        var tags = messager.tags || [];

        var tag = ev.target.value;
        if (tags.indexOf(tag) >= 0) {
            // 已存在的標籤不要重複加入
            return Promise.resolve();
        }

        tags.unshift(tag);
        var putMessager = {
            tags: tags
        };

        return api.appsChatroomsMessagers.update(appId, chatroomId, messagerId, userId, putMessager).then(function(resJson) {
            var _appsChatroomsMessagers = resJson.data;
            var _messager = _appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = _messager;

            var person = consumers[platformUid];
            person.photo = person.photo || 'image/user_large.png';
            $profileGroup.replaceWith(generateProfileHtml(appId, chatroomId, platformUid, person));
            $profilePanel.scrollTop($profilePanel.prop('scrollHeight'));

            return new Promise(function(resolve, reject) {
                chatshierSocket.emit(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_SERVER, {
                    appId: appId,
                    chatroomId: chatroomId,
                    messager: _messager,
                    senderUid: userId
                }, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    }

    function changeConsumerDisplayName(ev) {
        var $profileGroup = $(ev.target).parents('.profile-group');
        var appId = $profileGroup.attr('app-id');
        var chatroomId = $profileGroup.attr('chatroom-id');
        var platformUid = $profileGroup.attr('platform-uid');
        var messagerSelf = findMessagerSelf(appId, chatroomId);
        var messagerId = messagerSelf._id;

        var namings = messagerSelf.namings || {};
        var naming = $(ev.target).siblings('.form-control').val() || '';
        namings[platformUid] = naming;

        var putMessager = {
            namings: namings
        };

        return api.appsChatroomsMessagers.update(appId, chatroomId, messagerId, userId, putMessager).then(function(resJson) {
            var _appsChatroomsMessagers = resJson.data;
            var _messager = _appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = _messager;

            var person = consumers[platformUid];
            person.photo = person.photo || 'image/user_large.png';
            $profileGroup.replaceWith(generateProfileHtml(appId, chatroomId, platformUid, person));

            // 將聊天訊息的名稱以及聊天室的名稱做更新
            var consumer = consumers[platformUid];
            var displayName = (putMessager.namings && putMessager.namings[platformUid]) || consumer.name;
            var $messagePanel = $chatContentPanel.find('[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
            $messagePanel.find('.messager-name.text-left span').text(displayName);
            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]';
            $(tablinksSelectQuery + ' .app-name').text(displayName);
        });
    }

    function userInfoConfirm(ev) {
        if (!confirm('確定要更新對象用戶的個人資料嗎？')) {
            return;
        }

        var $profileGroup = $(ev.target).parents('.profile-group');
        var appId = $profileGroup.attr('app-id');
        var chatroomId = $profileGroup.attr('chatroom-id');

        var $fieldRows = $profileGroup.find('.fields-form .user-info');
        var fields = appsFields[appId].fields;
        var SETS_TYPES = api.appsFields.SETS_TYPES;

        var putMessager = {};
        $fieldRows.each(function(i, elem) {
            var $fieldRow = $(elem);
            var fieldId = $fieldRow.attr('field-id');
            var field = fields[fieldId];

            var value = '';
            var $fieldValue = $fieldRow.find('.field-value');
            switch (field.setsType) {
                case SETS_TYPES.NUMBER:
                    value = parseInt($fieldValue.val(), 10);
                    value = !isNaN(value) ? value : '';
                    break;
                case SETS_TYPES.DATE:
                    value = $fieldValue.val();
                    value = value ? new Date(value).getTime() : 0;
                    break;
                case SETS_TYPES.CHECKBOX:
                    value = $fieldValue.prop('checked');
                    break;
                case SETS_TYPES.MULTI_SELECT:
                    var $checkboxes = $fieldValue.find('input[type="checkbox"]:checked');
                    var selectVals = [];
                    $checkboxes.each(function(i, elem) {
                        selectVals.push($(elem).val());
                    });
                    value = selectVals;
                    break;
                case SETS_TYPES.TEXT:
                case SETS_TYPES.SELECT:
                default:
                    value = $fieldValue.val();
                    break;
            }

            if (value !== null && value !== undefined) {
                if (field.alias) {
                    putMessager[field.alias] = value;
                } else {
                    // 沒有別名的屬性代表是自定義的客戶分類條件資料
                    putMessager.custom_fields = putMessager.custom_fields || {};
                    putMessager.custom_fields[fieldId] = {
                        value: value
                    };
                }
            }
        });

        var phoneRule = /^0\d{9,}$/;
        var emailRule = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>().,;\s@"]+\.{0,1})+[^<>().,;:\s@"]{2,})$/;
        if ('number' === typeof putMessager.age && !(putMessager.age >= 1 && putMessager.age <= 150)) {
            $.notify('年齡限制 1 ~ 150 歲', { type: 'warning' });
            return;
        } else if (putMessager.email && !emailRule.test(putMessager.email)) {
            $.notify('電子郵件不符合格式', { type: 'warning' });
            return;
        } else if (putMessager.phone && !phoneRule.test(putMessager.phone)) {
            $.notify('電話號碼不符合格式, ex: 0912XXXXXX', { type: 'warning' });
            return;
        }

        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
        var messagerId = messager._id;
        return api.appsChatroomsMessagers.update(appId, chatroomId, messagerId, userId, putMessager).then(function(resJson) {
            var _appsChatroomsMessagers = resJson.data;
            var _messager = _appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
            // 將成功更新的資料覆蓋前端本地端的全域 app 資料
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = messager = _messager;

            // 將更新的用戶資料廣播給群組內的使用者
            return new Promise(function(resolve, reject) {
                chatshierSocket.emit(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_SERVER, {
                    appId: appId,
                    chatroomId: chatroomId,
                    messager: _messager,
                    senderUid: userId
                }, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }).then(function() {
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
            chatroomList.splice(chatroomList.indexOf(chatroomId), 1);
        });
    }

    function userAssignMessager(ev) {
        var $checkInput;
        if ('input' !== ev.target.localName) {
            $checkInput = $(ev.target).find('.form-check-input');
            $checkInput.prop('checked', !$checkInput.prop('checked'));
            ev.preventDefault();
        } else {
            $checkInput = $(ev.target);
        }
        var isChecked = $checkInput.prop('checked');

        var $profileGroup = $(ev.target).parents('.profile-group');
        var appId = $profileGroup.attr('app-id');
        var chatroomId = $profileGroup.attr('chatroom-id');
        var platformUid = $profileGroup.attr('platform-uid');
        var messager = findChatroomMessager(appId, chatroomId, apps[appId].type);
        var messagerId = messager._id;

        var agents = appsAgents[appId].agents;
        var assigneeIds = (messager.assigned_ids || []).filter((agentUserId) => !!agents[agentUserId]);
        var assignedId = $checkInput.val();

        var idx = assigneeIds.indexOf(assignedId);
        if (isChecked) {
            idx < 0 && assignedId && assigneeIds.push(assignedId);
        } else {
            idx >= 0 && assigneeIds.splice(idx, 1);
        }

        var putMessager = {
            assigned_ids: assigneeIds
        };

        var $dropdownToggle = $(ev.target).parents('.dropdown-menu').siblings('.dropdown-toggle');
        $dropdownToggle.attr('disabled', true);
        return api.appsChatroomsMessagers.update(appId, chatroomId, messagerId, userId, putMessager).then(function(resJson) {
            var _appsChatroomsMessagers = resJson.data;
            var _messager = _appsChatroomsMessagers[appId].chatrooms[chatroomId].messagers[messagerId];
            appsChatrooms[appId].chatrooms[chatroomId].messagers[messagerId] = _messager;

            var agents = appsAgents[appId].agents;
            assigneeIds = (_messager.assigned_ids || []).filter((agentUserId) => !!agents[agentUserId]);

            return new Promise(function(resolve, reject) {
                chatshierSocket.emit(SOCKET_EVENTS.BROADCAST_MESSAGER_TO_SERVER, {
                    appId: appId,
                    chatroomId: chatroomId,
                    messager: _messager,
                    senderUid: userId
                }, function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }).then(function() {
            var assigneeNames = assigneeIds.map(function(assignedId) {
                return users[assignedId].name;
            });
            var displayText = assigneeNames.join(',');
            if (assigneeNames.length > 1) {
                displayText = assigneeNames[0] + ' 及其他 ' + (assigneeNames.length - 1) + ' 名';
            }
            $dropdownToggle.find('.multi-select-values').text(displayText);

            var $assignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.assigned');
            var $unassignedCollapse = $ctrlPanelChatroomCollapse.find('.collapse.unassigned');
            var tablinksSelectQuery = '.tablinks[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"][platform-uid="' + platformUid + '"]';
            var $appChatroom = $ctrlPanelChatroomCollapse.find('.collapse.app-types[app-type="' + apps[appId].type + '"] ' + tablinksSelectQuery);

            if (assigneeIds.indexOf(userId) >= 0) {
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

            $dropdownToggle.removeAttr('disabled');
        }).catch(function() {
            $.notify('指派失敗', { type: 'danger' });
            $checkInput.prop('checked', false);
            $dropdownToggle.removeAttr('disabled');
        });
    }

    function multiSelectChange(ev) {
        var $checkInput;
        if ('input' !== ev.target.localName) {
            $checkInput = $(ev.target).find('.form-check-input');
            $checkInput.prop('checked', !$checkInput.prop('checked'));
            ev.preventDefault();
        } else {
            $checkInput = $(ev.target);
        }

        var $selectContainer = $checkInput.parents('.multi-select-container');
        var $selectValues = $selectContainer.parents('.multi-select-wrapper').find('.multi-select-values');

        var valArr = [];
        var textArr = [];
        var $checkboxes = $selectContainer.find('input[type="checkbox"]');
        $checkboxes.each(function(i, elem) {
            var $checkbox = $(elem);
            if ($checkbox.prop('checked')) {
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

            $('.tablinks').each(function(i, elem) {
                var $tablink = $(elem);
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
        $('.tablinks').each(function(i, elem) {
            var $tablinkElem = $(elem);
            var appId = $tablinkElem.attr('app-id');
            var chatroomId = $tablinkElem.attr('chatroom-id');
            var panel = $('.chat-content[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"] .message-panel');
            var color = '';
            var display = false;

            // 客戶名單搜尋
            $tablinkElem.find('.app-name').each(function(i, elem) {
                var $content = $(elem).parents('.tablinks');
                var text = $(elem).text();

                if (text.toLowerCase().indexOf(searchStr) !== -1) {
                    $content.parents('.collapse').addClass('show');
                    $content.removeClass('d-none');
                    display = true;
                } else {
                    $content.addClass('d-none');
                }
            });
            // 聊天室搜尋
            panel.find('.message').each(function(i, elem) {
                var $message = $(elem);
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
        $('.tablinks-area .tablinks').each(function(i, elem) {
            var $tablinkElem = $(elem);
            $tablinkElem.removeClass('d-none').css({
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

    function addZero(val) {
        return val < 10 ? '0' + val : val;
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
