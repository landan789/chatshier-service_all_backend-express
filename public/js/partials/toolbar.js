(function() {
    var BREAKPOINT_SM = 576;
    // var BREAKPOINT_MD = 768;
    var BREAKPOINT_LG = 992;

    var $navTitle = $('#navTitle');
    $navTitle.text(document.title.replace(' | Chatshier', ''));

    var $toolbar = $('.toolbar');
    var $profileToggle = $toolbar.find('#profileToggle');
    var $ticketToggle = $toolbar.find('#ticketToggle');
    $toolbar.on('click', '#profileToggle, #ticketToggle', togglePanel);

    var $toolbarOptionsDropdown = $toolbar.find('#toolbarOptionsDropdown');
    $toolbar.on('click', '#toolbarOptionsDropdown', function() {
        $toolbarOptionsDropdown.toggleClass('show');
    });

    var $chatContentPanel = $('#chatContentPanel');
    var $profilePanel = $('#profilePanel');
    var $ticketPanel = $('#ticketPanel');

    // 監聽 window resize 事件，監聽當有 用戶資料 或 待辦事項被開啟時
    // 視窗有變更時的邏輯處理
    window.addEventListener('resize', function(ev) {
        if ($profileToggle.hasClass('active') || $ticketToggle.hasClass('active')) {
            if (ev.target.innerWidth < BREAKPOINT_LG) {
                $chatContentPanel.addClass('d-none');
            } else if (ev.target.innerWidth >= BREAKPOINT_LG &&
                $chatContentPanel.hasClass('d-none')) {
                $chatContentPanel.removeClass('d-none');
            }
        }
    });

    function togglePanel() {
        var $selectedTablink = $('#ctrlPanel .tablinks.selected');
        if (0 === $selectedTablink.length) {
            return;
        }

        var appId = $selectedTablink.attr('app-id');
        var chatroomId = $selectedTablink.attr('chatroom-id');

        var $shownChatroom = $('.chat-content.shown[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        if (0 === $shownChatroom.length) {
            return;
        }

        var $toggleElem = $(this);
        var toggleElemId = $toggleElem.attr('id');
        $toggleElem.toggleClass('active');

        // 切換 用戶資料 或 待辦事項 時，如果視窗寬度小於 lg 尺寸時
        // 將聊天室視窗關閉，使用戶資料 或 待辦事項的視窗佔全寬度
        switch (toggleElemId) {
            case 'profileToggle':
                $ticketToggle.removeClass('active');
                $ticketPanel.addClass('d-none');
                $profilePanel.toggleClass('d-none');

                if (window.innerWidth < BREAKPOINT_LG) {
                    if ($profilePanel.hasClass('d-none')) {
                        $chatContentPanel.removeClass('d-none');
                    } else {
                        $chatContentPanel.addClass('d-none');
                    }
                } else {
                    $chatContentPanel.removeClass('d-none');
                }

                $profilePanel.find('.profile-group').addClass('d-none');
                $profilePanel.find('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]').removeClass('d-none');
                break;
            case 'ticketToggle':
                $profileToggle.removeClass('active');
                $profilePanel.addClass('d-none');
                $ticketPanel.toggleClass('d-none');

                if (window.innerWidth < BREAKPOINT_LG) {
                    if ($ticketPanel.hasClass('d-none')) {
                        $chatContentPanel.removeClass('d-none');
                    } else {
                        $chatContentPanel.addClass('d-none');
                    }
                } else {
                    $chatContentPanel.removeClass('d-none');
                }

                $ticketPanel.find('.ticket-group').addClass('d-none');
                $ticketPanel.find('.ticket-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]').removeClass('d-none');
                break;
            default:
                break;
        }
    }
})();
