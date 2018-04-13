(function() {
    var $sideMenuToggle = $('#sideMenuToggle');
    var $sideMenu = $('#sideMenu');
    var $sideMenuBackdrop = $('#sideMenuBackdrop');
    $sideMenuToggle.on('click', toggleSideMenu);
    $sideMenu.find('.menu-toggle').on('click', closeSideMenu);
    $sideMenuBackdrop.on('click', closeSideMenu);

    var $sideMenuCollapses = $sideMenu.find('.has-collapse');
    $sideMenuCollapses.on('click', toggleCollapse);

    var $sideMenuAddApp = $('#sideMenuAddApp');
    $sideMenuAddApp.on('click', showAppInsertModal);

    var Swiper = window.Swiper;
    var sideMenuSwiper = new Swiper('.swiper-container#sideMenu', {
        loop: false,
        initialSlide: 1,
        threshold: 10, // 撥動超過 10px 才進行 slide 動作
        pagination: {
            el: '#sideMenu .swiper-pagination'
        }
    });

    function toggleSideMenu() {
        $sideMenu.toggleClass('d-none').toggleClass('sm');
        $sideMenuBackdrop.toggleClass('d-none');
    }

    function toggleCollapse() {
        $(this).next().collapse('toggle');

        var $collapseIcon = $(this).find('.collapse-icon');
        if ($collapseIcon.hasClass('fa-chevron-down')) {
            $collapseIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        } else if ($collapseIcon.hasClass('fa-chevron-up')) {
            $collapseIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    }

    function closeSideMenu() {
        $sideMenu.addClass('d-none').removeClass('sm');
        $sideMenuBackdrop.addClass('d-none');
    }

    function showAppInsertModal() {
        console.log(this);
    }
})();
