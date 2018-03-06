/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var CHSR_COOKIE = window.chatshierCookie.CHSR_COOKIE;
    var cookieManager = window.chatshierCookie.manager;

    var logout = function() {
        cookieManager.deleteCookie(CHSR_COOKIE.USER_NAME);
        cookieManager.deleteCookie(CHSR_COOKIE.USER_EMAIL);
        window.localStorage.removeItem('jwt');

        return window.auth.signOut();
    };

    window.googleClientHelper.loadAPI().then(function() {
        var url = window.googleCalendarHelper.configJsonUrl;
        return window.googleClientHelper.init(url);
    }).then(function(gAuth) {
        if (!gAuth.isSignedIn.get()) {
            return;
        }
        return gAuth.signOut();
    }).then(function() {
        return logout();
    }).then(function() {
        // window.location.replace('/signin');
    });
})();
