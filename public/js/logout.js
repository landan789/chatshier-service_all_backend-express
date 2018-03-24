/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var CHSR_COOKIE = window.chatshierCookie.CHSR_COOKIE;
    var cookieManager = window.chatshierCookie.manager;

    var logout = function() {
        cookieManager.deleteCookie(CHSR_COOKIE.USER_NAME);
        cookieManager.deleteCookie(CHSR_COOKIE.USER_EMAIL);
        window.localStorage.removeItem('jwt');

        window.firebase.initializeApp(window.config);
        return window.firebase.auth().signOut();
    };

    return logout().then(() => {
        return window.googleClientHelper.loadAPI().then(function() {
            var url = window.googleCalendarHelper.configJsonUrl;
            return window.googleClientHelper.init(url);
        });
    }).then(function(isSignedIn) {
        if (!isSignedIn) {
            return;
        }
        return window.googleClientHelper.signOut();
    }).catch(function(err) {
        console.error(err);
        // catch google auth 登出
        // 有無問題都繼續往下執行
    }).then(function() {
        window.location.replace('/signin');
    });
})();
