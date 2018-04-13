(function() {
    var $navTitle = $('#navTitle');
    $navTitle.text(document.title.replace(' | Chatshier', ''));

    var $toolbarOptionsDropdown = $('#toolbarOptionsDropdown');
    $toolbarOptionsDropdown.on('click', function() {
        $toolbarOptionsDropdown.toggleClass('show');
    });

    var $chatroomToggle = $('.toolbar #chatroomToggle');
    $chatroomToggle.on('click', toggleChatroom);

    var $profileToggle = $('.toolbar #profileToggle');
    $profileToggle.on('click', toggleProfile);

    function toggleChatroom() {
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

        var $chatroomContainer = $shownChatroom.parents('.chatroom-container');
        $chatroomContainer.find('.chat-content-panel').removeClass('d-none');
    }

    function toggleProfile() {
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

        var $chatroomContainer = $shownChatroom.parents('.chatroom-container');
        $chatroomContainer.find('.chat-content-panel').addClass('d-none');
        $chatroomContainer.find('.profile-panel').removeClass('d-none');
    }
})();
