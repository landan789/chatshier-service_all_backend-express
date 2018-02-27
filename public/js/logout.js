/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var CHSR_COOKIE = window.chatshierCookie.CHSR_COOKIE;
    var cookieManager = window.chatshierCookie.manager;

    var logout = function() {
        cookieManager.deleteCookie(CHSR_COOKIE.USER_NAME);
        cookieManager.deleteCookie(CHSR_COOKIE.USER_EMAIL);

        return window.auth.signOut();
    };

    logout().then(function() {
        // location.replace('/login');
    });
})();
