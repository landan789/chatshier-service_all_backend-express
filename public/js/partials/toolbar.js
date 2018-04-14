(function() {
    var BREAKPOINT_SM = 576;
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

    function togglePanel() {
        var $selectedTablink = $('#sideMenu .tablinks.selected');
        if (0 === $selectedTablink.length) {
            return;
        }

        var appId = $selectedTablink.attr('app-id');
        var chatroomId = $selectedTablink.attr('chatroom-id');
        var appType = $selectedTablink.attr('app-type');

        var $shownChatroom = $('.chat-content.shown[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]');
        if (0 === $shownChatroom.length) {
            return;
        }

        var $toggleElem = $(this);
        var toggleElemId = $toggleElem.attr('id');
        $toggleElem.toggleClass('active');

        switch (toggleElemId) {
            case 'profileToggle':
                $ticketToggle.removeClass('active');
                $ticketPanel.addClass('d-none');
                $profilePanel.toggleClass('d-none');

                if (window.innerWidth <= BREAKPOINT_SM) {
                    if ($profilePanel.hasClass('d-none')) {
                        $chatContentPanel.removeClass('d-none');
                    } else {
                        $chatContentPanel.addClass('d-none');
                    }
                }

                $profilePanel.find('.profile-group').hide();
                $profilePanel.find('.profile-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]').show();
                break;
            case 'ticketToggle':
                $profileToggle.removeClass('active');
                $profilePanel.addClass('d-none');
                $ticketPanel.toggleClass('d-none');

                if (window.innerWidth <= BREAKPOINT_SM) {
                    if ($ticketPanel.hasClass('d-none')) {
                        $chatContentPanel.removeClass('d-none');
                    } else {
                        $chatContentPanel.addClass('d-none');
                    }
                }

                $ticketPanel.find('.ticket-group').hide();
                $ticketPanel.find('.ticket-group[app-id="' + appId + '"][chatroom-id="' + chatroomId + '"]').show();
                break;
            default:
                break;
        }
    }
})();
