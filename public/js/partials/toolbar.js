(function() {
    var $navTitle = $('#navTitle');
    $navTitle.text(document.title.replace(' | Chatshier', ''));

    var $sideMenuToggle = $('#sideMenuToggle');
    var $sideMenu = $('#sideMenu');
    var $sideMenuBackdrop = $('#sideMenuBackdrop');
    $sideMenuToggle.on('click', toggleSideMenu);
    $sideMenu.find('.menu-toggle').on('click', closeSideMenu);
    $sideMenuBackdrop.on('click', closeSideMenu);

    var $sideMenuMessages = $('#sideMenuMessages');
    var $collapseIcon = $sideMenuMessages.find('.fas');
    var $sideMenuMessagesCollapse = $('#sideMenuMessagesCollapse');
    $sideMenuMessages.on('click', function() {
        $sideMenuMessagesCollapse.collapse('toggle');

        if ($collapseIcon.hasClass('fa-chevron-down')) {
            $collapseIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        } else if ($collapseIcon.hasClass('fa-chevron-up')) {
            $collapseIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    });

    var $toolbarOptionsDropdown = $('#toolbarOptionsDropdown');
    $toolbarOptionsDropdown.on('click', function() {
        $toolbarOptionsDropdown.toggleClass('show');
    });

    function toggleSideMenu() {
        $sideMenu.toggleClass('d-none').toggleClass('sm');
        $sideMenuBackdrop.toggleClass('d-none');
    }

    function closeSideMenu() {
        $sideMenu.addClass('d-none').removeClass('sm');
        $sideMenuBackdrop.addClass('d-none');
    }
})();
