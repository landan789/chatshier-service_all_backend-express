/// <reference path='../../../typings/client/index.d.ts' />

(function() {
    var HAS_COOKIES = parseInt('001', 2);
    var HAS_USER = parseInt('010', 2);
    var IS_LOGIN_SIGNUP_PAGE = parseInt('100', 2);

    var NO_COOKIES = parseInt('000', 2);
    var NO_USER = parseInt('000', 2);
    var NOT_LOGIN_SIGNUP_PAGE = parseInt('000', 2);

    var PREPARE_TIME = 5 * 60 * 1000;
    var CHSR_COOKIE = window.chatshierCookie.CHSR_COOKIE;
    var cookieManager = window.chatshierCookie.manager;
    var api = window.restfulAPI;

    var remainingTimer = null;

    /**
     * jwt automatically refreshes 10 minutes before jwt expires
     */
    function jwtRefresh() {
        remainingTimer && window.clearTimeout(remainingTimer);
        remainingTimer = void 0;

        function nextPromise() {
            let userId;

            return new Promise((resolve, reject) => {
                let jwt = window.localStorage.getItem('jwt');
                let payload;

                try {
                    payload = window.jwt_decode(jwt);
                } catch (ex) {
                    reject(ex);
                    return;
                }

                userId = payload.uid;
                let remainingTime = payload.exp - PREPARE_TIME - Date.now();
                if (remainingTime < 0) {
                    remainingTime = 0;
                }
                remainingTimer && window.clearTimeout(remainingTimer);
                remainingTimer = window.setTimeout(resolve, remainingTime);
            }).then(() => {
                return api.sign.refresh(userId);
            }).then((response) => {
                let jwt = response.jwt;
                window.localStorage.setItem('jwt', jwt);
                window.restfulAPI && window.restfulAPI.setJWT(jwt);
                return nextPromise();
            });
        }

        return nextPromise().catch(() => {
            window.location.replace('/signout');
        });
    }
    window.jwtRefresh = jwtRefresh;

    let state = getState();
    if (state === (NOT_LOGIN_SIGNUP_PAGE | NO_USER | HAS_COOKIES) ||
        state === (NOT_LOGIN_SIGNUP_PAGE | HAS_USER | NO_COOKIES) ||
        state === (IS_LOGIN_SIGNUP_PAGE | NO_USER | HAS_COOKIES) ||
        state === (IS_LOGIN_SIGNUP_PAGE | HAS_USER | NO_COOKIES)) {
        // 登入資訊不齊全，一律進行登出動作
        window.location.replace('/signout');
    } else if (state === (NOT_LOGIN_SIGNUP_PAGE | HAS_USER | HAS_COOKIES)) {
        // 使用者已進入登入後的其他頁面，並且依舊是登入狀態
        $(document).ready(function() {
            $('#loadingWrapper').fadeOut(function() {
                // 淡出後，此元素已不需要，從 DOM 上移除
                document.body.removeChild(this);
            });
            jwtRefresh();
        });
    } else if (state === (IS_LOGIN_SIGNUP_PAGE | HAS_USER | HAS_COOKIES)) {
    // 已經登入後再瀏覽登入或註冊頁面的話，直接導向聊天室頁面
        window.location.replace('/chat');
    } else if (state === (NOT_LOGIN_SIGNUP_PAGE | NO_USER | NO_COOKIES)) {
    // 沒有進行登入卻欲瀏覽其他登入或註冊以外的頁面，直接導向登入頁面
        window.location.replace('/signin');
    } else if (state === (IS_LOGIN_SIGNUP_PAGE | NO_USER | NO_COOKIES)) {
    // 已在登入頁面並且沒有登入資料
    }

    function getState() {
        let state = parseInt('000', 2);
        let username = cookieManager.getCookie(CHSR_COOKIE.USER_NAME);
        let email = cookieManager.getCookie(CHSR_COOKIE.USER_EMAIL);
        let pathname = window.location.pathname;

        if (username && email) {
            state = state | HAS_COOKIES;
        }

        if (window.localStorage.getItem('jwt')) {
            state = state | HAS_USER;
        }

        if ('/signin' === pathname || '/signup' === pathname) {
            state = state | IS_LOGIN_SIGNUP_PAGE;
        }

        return state;
    }
})();
