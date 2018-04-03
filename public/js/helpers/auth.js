(function() {
    var HAS_COOKIES = parseInt('001', 2);
    var HAS_USER = parseInt('010', 2);
    var IS_LOGIN_SIGNUP_PAGE = parseInt('100', 2);

    var NO_COOKIES = parseInt('000', 2);
    var NO_USER = parseInt('000', 2);
    var NOT_LOGIN_SIGNUP_PAGE = parseInt('000', 2);

    var CHSR_COOKIE = window.chatshierCookie.CHSR_COOKIE;
    var cookieManager = window.chatshierCookie.manager;
    var api = window.restfulAPI;
    const REFRESH_TIME = 5 * 1000;

    /**
     * automatically refresh when the time before jwt expired time 10 minutes
     */
    function jwtRefresh() {
        return nextPromise().then(() => {
            // nothing to do
        }).catch(() => {
            window.location.replace('/logout');
        });

        function nextPromise() {
            let userId;

            return new Promise((resolve, reject) => {
                let jwt = window.localStorage.getItem('jwt');
                let payload = window.jwt_decode(jwt);
                let exp;

                try {
                    payload = window.jwt_decode(window.localStorage.getItem('jwt'));
                    exp = payload.exp;
                    userId = payload.uid;
                } catch (ex) {
                    exp = 0;
                }

                let time = exp - Date.now() - REFRESH_TIME;
                if (0 > time) {
                    time = 0;
                }
                window.setTimeout(() => {
                    resolve();
                }, time);
            }).then(() => {
                return api.sign.refresh(userId);
            }).then((response) => {
                let jwt = response.jwt;
                window.localStorage.setItem('jwt', jwt);
                window.restfulAPI && window.restfulAPI.setJWT(jwt);
            }).then(() => {
                return nextPromise();
            });
        }
    }

    let state = getState();
    if (state === (NOT_LOGIN_SIGNUP_PAGE | NO_USER | HAS_COOKIES) ||
        state === (NOT_LOGIN_SIGNUP_PAGE | HAS_USER | NO_COOKIES) ||
        state === (IS_LOGIN_SIGNUP_PAGE | NO_USER | HAS_COOKIES) ||
        state === (IS_LOGIN_SIGNUP_PAGE | HAS_USER | NO_COOKIES)) {
        // 登入資訊不齊全，一律進行登出動作
        window.location.replace('/logout');
    } else if (state === (NOT_LOGIN_SIGNUP_PAGE | HAS_USER | HAS_COOKIES)) {
        // 使用者已進入登入後的其他頁面，並且依舊是登入狀態
        $(document).ready(function() {
            $('#loading').fadeOut();
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
