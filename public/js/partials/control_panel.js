(function() {
    var PUT_ANINATE_DRATION = 300;
    var BREAKPOINT_SM = 576;
    // var BREAKPOINT_MD = 768;
    // var BREAKPOINT_LG = 992;

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
    window.isMobileBrowser() && $edgeToggleContainer.addClass('hover');

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
        $ctrlPanel.on('click', '.simple-list .chatroom-item', function() {
            window.location.assign('/chat');
        });
    } else {
        $ctrlPanel.on('click', '.simple-list .chatroom-item', switchCtrlPanel);
    }
    $ctrlPanel.on('click', '.simple-list .messages-item', function() {
        return switchCtrlPanel().then(function() {
            $ctrlPanel.find('.swiper-slide-active').animate({ scrollTop: window.innerHeight }, 300);
        });
    });

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

    // 監聽 window 的尺寸變更事件，當寬度小於 sm 時
    // 如果 control panel 使處於 收起 狀態，則將之復原
    window.addEventListener('resize', function(ev) {
        if (ev.target.innerWidth < BREAKPOINT_SM && $ctrlPanel.hasClass('put-away')) {
            return switchCtrlPanel();
        }
    });
    // 如果從 localStorage 得知目前 Control Panel 是處於收起狀態，則一載入頁面後就將之收起
    var isCtrlPanelPutAway = window.localStorage.getItem('isCtrlPanelPutAway');
    isCtrlPanelPutAway && window.innerWidth >= BREAKPOINT_SM && switchCtrlPanel();

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
        $pageWrappers.removeClass('put-away');

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
        $pageWrappers.removeClass('put-away');

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
        $pageWrappers.toggleClass('put-away');

        isCtrlPanelPutAway = $ctrlPanel.hasClass('put-away');
        window.localStorage.setItem('isCtrlPanelPutAway', isCtrlPanelPutAway);

        return new Promise(function(resolve) {
            window.setTimeout(resolve, PUT_ANINATE_DRATION + 50);
        }).then(function() {
            ctrlPanelSwiper.update();
            $ctrlPanel.find('.detail-list').toggle();
            $ctrlPanel.find('.simple-list').toggle();
        });
    }

    function showAppInsertModal() {

    }
})();
