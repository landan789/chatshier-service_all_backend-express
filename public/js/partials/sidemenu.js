(function() {
    var $toolbar = $('.toolbar');
    var $sideMenu = $('#sideMenu');
    var $sideMenuBackdrop = $('#sideMenuBackdrop');
    $toolbar.on('click', '.side-menu-toggle', toggleSideMenu);
    $sideMenu.on('click', '.menu-toggle', toggleSideMenu);
    $sideMenu.on('click', '.has-collapse', toggleCollapse);
    $sideMenuBackdrop.on('click', closeSideMenu);

    var $sideMenuAddApp = $('#sideMenuAddApp');
    $sideMenuAddApp.on('click', showAppInsertModal);

    if ('/chat' !== window.location.pathname) {
        var $sideMenuChatroomItem = $('#sideMenuChatroomItem');
        $sideMenuChatroomItem.removeClass('has-collapse');
        $sideMenuChatroomItem.find('.collapse-icon').remove();
        $sideMenuChatroomItem.on('click', function() {
            window.location.assign('/chat');
        });
        $sideMenuChatroomItem.siblings('#sideMenuChatroomCollapse').remove();
        $sideMenuChatroomItem = void 0;
    }

    var Swiper = window.Swiper;
    var sideMenuSwiper = new Swiper('#sideMenu.swiper-container', {
        loop: false,
        initialSlide: 1,
        threshold: 10, // 撥動超過 10px 才進行 slide 動作
        pagination: {
            el: '#sideMenu .swiper-pagination'
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

    function toggleSideMenu() {
        $sideMenu.hasClass('d-none') ? openSideMenu() : closeSideMenu();
    }

    function openSideMenu() {
        if ($sideMenu.hasClass('animating')) {
            return;
        }
        $sideMenu.removeClass('d-none').addClass(['animated', 'animating', 'slide-in']);
        $sideMenuBackdrop.removeClass('d-none');
        sideMenuSwiper.update();
        $sideMenu.on('animationend oAnimationEnd webkitAnimationEnd', function() {
            $sideMenu.off('animationend oAnimationEnd webkitAnimationEnd');
            $sideMenu.removeClass(['animating', 'slide-in']);
        });
    }

    function closeSideMenu() {
        if ($sideMenu.hasClass('animating')) {
            return;
        }
        $sideMenu.addClass(['animating', 'slide-out']);
        $sideMenuBackdrop.addClass('d-none');
        $sideMenu.on('animationend oAnimationEnd webkitAnimationEnd', function() {
            $sideMenu.off('animationend oAnimationEnd webkitAnimationEnd');
            $sideMenu.removeClass(['animated', 'animating', 'slide-out']).addClass('d-none');
        });
    }

    function showAppInsertModal() {

    }
})();
