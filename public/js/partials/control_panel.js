(function() {
    // var chatshier = window.chatshier || {};
    // var api = window.restfulAPI;
    // var userId;
    // try {
    //     var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
    //     userId = payload.uid;
    // } catch (ex) {
    //     userId = '';
    // }

    var $pageWrappers = $('.page-wrapper');
    var $toolbar = $('.toolbar');
    var $ctrlPanel = $('#ctrlPanel');
    var $ctrlPanelBackdrop = $('#ctrlPanelBackdrop');
    $toolbar.on('click', '.ctrl-panel-toggle', toggleCtrlPanel);
    $ctrlPanel.on('click', '.menu-toggle', toggleCtrlPanel);
    $ctrlPanel.on('click', '.has-collapse', toggleCollapse);
    $ctrlPanelBackdrop.on('click', closeCtrlPanel);

    var $ctrlPanelAddApp = $('#ctrlPanelAddApp');
    $ctrlPanelAddApp.on('click', showAppInsertModal);

    var $edgeToggleContainer = $('#edgeToggleContainer');
    $edgeToggleContainer.on('click', '.edge-toggle-btn', switchCtrlPanel);

    if ('/chat' !== window.location.pathname) {
        var $ctrlPanelChatroomItem = $('#ctrlPanelChatroomItem');
        $ctrlPanelChatroomItem.removeClass('has-collapse');
        $ctrlPanelChatroomItem.find('.collapse-icon').remove();
        $ctrlPanelChatroomItem.on('click', function() {
            window.location.assign('/chat');
        });
        $ctrlPanelChatroomItem.siblings('#ctrlPanelChatroomCollapse').remove();
        $ctrlPanelChatroomItem = void 0;

        // 聊天室其他頁面不需要顯示聊天室訊息搜尋功能
        $ctrlPanel.find('#messageSearch').remove();

        // // 聊天室其他頁面關閉新增，編輯 apps 功能
        // $ctrlPanel.find('#appsSlide').remove();
        // $ctrlPanel.find('.swiper-pagination').remove();
    }
    // Todo: 功能尚未完成，關閉新增，編輯 apps 功能
    $ctrlPanel.find('#appsSlide').remove();
    $ctrlPanel.find('.swiper-pagination').remove();

    var Swiper = window.Swiper;
    var ctrlPanelSwiper = new Swiper('#ctrlPanel.swiper-container', {
        loop: false,
        initialSlide: 1,
        threshold: 10, // 撥動超過 10px 才進行 slide 動作
        pagination: {
            el: '#ctrlPanel .swiper-pagination'
        }
    });

    function toggleCollapse() {
        $(this).next().collapse('toggle');

        var $collapseIcon = $(this).find('.collapse-icon');
        if ($collapseIcon.hasClass('fa-chevron-down')) {
            $collapseIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        } else if ($collapseIcon.hasClass('fa-chevron-up')) {
            $collapseIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    }

    function toggleCtrlPanel() {
        $ctrlPanel.hasClass('d-none') ? openCtrlPanel() : closeCtrlPanel();
    }

    /**
     * 開啟 controll panel (only sm)
     */
    function openCtrlPanel() {
        // 確保移除 switchCtrlPanel 套用的樣式，確保 style 動作正常
        $ctrlPanel.removeClass('put-away');
        $edgeToggleContainer.removeClass('put-away');
        $pageWrappers.removeClass('full-width');

        if ($ctrlPanel.hasClass('animating')) {
            $ctrlPanel.removeClass('animating');
            return;
        }

        $ctrlPanel.removeClass('d-none').addClass(['animated', 'animating', 'slide-in']);
        $ctrlPanelBackdrop.removeClass('d-none');
        ctrlPanelSwiper.update();
        $ctrlPanel.on('animationend oAnimationEnd webkitAnimationEnd', function() {
            $ctrlPanel.off('animationend oAnimationEnd webkitAnimationEnd');
            $ctrlPanel.removeClass(['animating', 'slide-in']);
        });
    }

    /**
     * 關閉 controll panel (only sm)
     */
    function closeCtrlPanel() {
        // 確保移除 switchCtrlPanel 套用的樣式，確保 style 動作正常
        $ctrlPanel.removeClass('put-away');
        $edgeToggleContainer.removeClass('put-away');
        $pageWrappers.removeClass('full-width');

        if ($ctrlPanel.hasClass('animating')) {
            $ctrlPanel.removeClass('animating');
            return;
        }
        $ctrlPanel.addClass(['animating', 'slide-out']);
        $ctrlPanelBackdrop.addClass('d-none');
        $ctrlPanel.on('animationend oAnimationEnd webkitAnimationEnd', function() {
            $ctrlPanel.off('animationend oAnimationEnd webkitAnimationEnd');
            $ctrlPanel.removeClass(['animated', 'animating', 'slide-out']).addClass('d-none');
        });
    }

    /**
     * 用來切換 controll panel 顯示與否 (only md,lg,xl)
     */
    function switchCtrlPanel() {
        $ctrlPanel.toggleClass('put-away');
        $edgeToggleContainer.toggleClass('put-away');
        $pageWrappers.toggleClass('full-width');
    }

    function showAppInsertModal() {

    }
})();
