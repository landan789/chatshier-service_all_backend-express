(function() {
    var IS_COOKIES = parseInt('001', 2);
    var IS_USER = parseInt('010', 2);
    var IS_LOGIN_SIGNUP_PAGE = parseInt('100', 2);

    var NOT_COOKIES = parseInt('000', 2);
    var NOT_USER = parseInt('000', 2);
    var NOT_LOGIN_SIGNUP_PAGE = parseInt('000', 2);

    var serviceUrl = location.host;
    var domain = serviceUrl.replace(/^[\w-]+\./i, '.').replace(/:\d+$/i, '');

    auth.ready = (function() {
        var readyPromiseResolver;
        var readyPromiseRejecter;
        var readyPromise = new Promise((resolve, reject) => {
            readyPromiseResolver = resolve;
            readyPromiseRejecter = reject;
        });

        auth.onAuthStateChanged((currentUser) => {
            var state = getState(currentUser);
            var asyncFlag = false;

            if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {
                location.replace('/logout');
            } else if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
                location.replace('/logout');
            } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
                location.replace('/logout');
            } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
                asyncFlag = true;

                $('#loading').fadeOut();
                currentUser.getIdToken(false).then((jwt) => {
                    window.localStorage.setItem('jwt', jwt);
                    readyPromiseResolver(currentUser);
                }).catch(function(error) {
                    // Handle error
                    if (error) {
                        readyPromiseRejecter(error);
                    }
                });
            } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {

            } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
                location.replace('/logout');
            } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
                location.replace('/logout');
            } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
                location.replace('/chat');
            }

            !asyncFlag && readyPromiseResolver(currentUser);
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
            state = state | IS_COOKIES;
        }

        if (user) {
            state = state | IS_USER;
        }

        if ('/login' === pathname || '/signup' === pathname) {
            state = state | IS_LOGIN_SIGNUP_PAGE;
        }

        return state;
    }
})();
