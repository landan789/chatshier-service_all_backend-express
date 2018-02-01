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

    // var serviceUrl = location.host;
    // var domain = serviceUrl.replace(/^[\w-]+\./i, '.').replace(/:\d+$/i, '');

    auth.ready = (function() {
        var readyPromiseResolver;
        var readyPromiseRejecter;
        var readyPromise = new Promise(function(resolve, reject) {
            readyPromiseResolver = resolve;
            readyPromiseRejecter = reject;
        });

        $(document).ready(function() {
            auth.authStateListener = auth.onAuthStateChanged(function(currentUser) {
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
                    currentUser.getIdToken(false).then(function(jwt) {
                        window.localStorage.setItem('jwt', jwt);
                        readyPromiseResolver(currentUser);
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
                    location.replace('/login');
                } else if (state === (IS_LOGIN_SIGNUP_PAGE | NO_USER | NO_COOKIES)) {
                    // 已在登入頁面並且沒有登入資料
                }

                !asyncFlag && readyFlag && readyPromiseResolver(currentUser);
            });
        });

        return readyPromise;
    })();

    function getCookie(cName) {
        // if (document.cookie.length > 0) {
        //     var cStart = document.cookie.indexOf(cName + '=');
        //     if (-1 === cStart) {
        //         cStart += cName.length + 1;
        //         var cEnd = document.cookie.indexOf(';', cStart);
        //         if (-1 === cEnd) cEnd = document.cookie.length;
        //         return unescape(document.cookie.substring(cStart, cEnd));
        //     }
        // }

        var cookieValue = '; ' + document.cookie;
        var parts = cookieValue.split('; ' + cName + '=');
        if (2 === parts.length) {
            return unescape(parts.pop().split(';').shift());
        }
        return '';
    }

    function getState(user) {
        var state = parseInt('000', 2);
        var name = getCookie('name');
        var email = getCookie('email');
        var pathname = location.pathname;

        if ('' !== name && '' !== email) {
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
