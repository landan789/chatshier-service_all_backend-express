/// <reference path='../../typings/client/index.d.ts' />

// Initialize Firebase
window.firebase.initializeApp(window.config);
window.auth = window.firebase.auth();
window.database = window.firebase.database();
// log in status

(function() {
    var HAS_COOKIES = parseInt('001', 2);
    var HAS_USER = parseInt('010', 2);
    var IS_LOGIN_SIGNUP_PAGE = parseInt('100', 2);

    var NO_COOKIES = parseInt('000', 2);
    var NO_USER = parseInt('000', 2);
    var NOT_LOGIN_SIGNUP_PAGE = parseInt('000', 2);

    var CHSR_COOKIE = window.chatshierCookie.CHSR_COOKIE;
    var cookieManager = window.chatshierCookie.manager;

    window.auth.ready = (function() {
        var readyPromiseResolver;
        var readyPromiseRejecter;
        var readyPromise = new Promise(function(resolve, reject) {
            readyPromiseResolver = resolve;
            readyPromiseRejecter = reject;
        });

        function keepTokenRefresh(currentUser) {
            // 每 55 分鐘更新一次 firebase token
            return new Promise(function(resolve) {
                window.setTimeout(function() {
                    resolve();
                }, 55 * 60 * 1000);
            }).then(function() {
                return currentUser.getIdToken(true);
            }).then(function(jwt) {
                window.localStorage.setItem('jwt', jwt);
                return keepTokenRefresh(currentUser);
            });
        }

        $(document).ready(function() {
            window.auth.authStateListener = window.auth.onAuthStateChanged(function(currentUser) {
                var state = getState(currentUser);
                var asyncFlag = false;
                var readyFlag = false;

                if (state === (NOT_LOGIN_SIGNUP_PAGE | NO_USER | HAS_COOKIES) ||
                    state === (NOT_LOGIN_SIGNUP_PAGE | HAS_USER | NO_COOKIES) ||
                    state === (IS_LOGIN_SIGNUP_PAGE | NO_USER | HAS_COOKIES) ||
                    state === (IS_LOGIN_SIGNUP_PAGE | HAS_USER | NO_COOKIES)) {
                    // 登入資訊不齊全，一律進行登出動作
                    location.replace('/logout');
                } else if (state === (NOT_LOGIN_SIGNUP_PAGE | HAS_USER | HAS_COOKIES)) {
                    // 使用者已進入登入後的其他頁面，並且依舊是登入狀態
                    asyncFlag = readyFlag = true;
                    $('#loading').fadeOut();

                    // 更新 firebase jwt 並寫入到 localStorage
                    // https://firebase.google.com/docs/reference/js/firebase.User#getIdToken
                    currentUser.getIdToken(true).then(function(jwt) {
                        window.localStorage.setItem('jwt', jwt);
                        readyPromiseResolver(currentUser);
                        return keepTokenRefresh(currentUser);
                    }).catch(function(error) {
                        // Handle error
                        if (error) {
                            readyPromiseRejecter(error);
                        }
                    });
                } else if (state === (IS_LOGIN_SIGNUP_PAGE | HAS_USER | HAS_COOKIES)) {
                    // 已經登入後再瀏覽登入或註冊頁面的話，直接導向聊天室頁面
                    readyFlag = true;
                    location.replace('/chat');
                } else if (state === (NOT_LOGIN_SIGNUP_PAGE | NO_USER | NO_COOKIES)) {
                    // 沒有進行登入卻欲瀏覽其他登入或註冊以外的頁面，直接導向登入頁面
                    location.replace('/signin');
                } else if (state === (IS_LOGIN_SIGNUP_PAGE | NO_USER | NO_COOKIES)) {
                    // 已在登入頁面並且沒有登入資料
                }

                !asyncFlag && readyFlag && readyPromiseResolver(currentUser);
            });
        });

        return readyPromise;
    })();

    function getState(user) {
        var state = parseInt('000', 2);
        var username = cookieManager.getCookie(CHSR_COOKIE.USER_NAME);
        var email = cookieManager.getCookie(CHSR_COOKIE.USER_EMAIL);
        var pathname = location.pathname;

        if (username && email) {
            state = state | HAS_COOKIES;
        }

        if (user) {
            state = state | HAS_USER;
        }

        if ('/login' === pathname || '/signup' === pathname) {
            state = state | IS_LOGIN_SIGNUP_PAGE;
        }

        return state;
    }
})();
