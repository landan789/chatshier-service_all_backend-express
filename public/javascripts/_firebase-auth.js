const IS_COOKIES = parseInt('001', 2);
const IS_USER = parseInt('010', 2);
const IS_LOGIN_SIGNUP_PAGE = parseInt('100', 2);

const NOT_COOKIES = parseInt('000', 2);
const NOT_USER = parseInt('000', 2);
const NOT_LOGIN_SIGNUP_PAGE = parseInt('000', 2);

var serviceUrl = location.host;
var domain = serviceUrl.replace(/^[\w\-]+\./i, '.').replace(/\:\d+$/i, '');

auth.ready = (function() {
    var readyPromiseResolver;
    var readyPromiseRejecter;
    var readyPromise = new Promise((resolve, reject) => {
        readyPromiseResolver = resolve;
        readyPromiseRejecter = reject;
    });

    var authStateListener = auth.onAuthStateChanged((user) => {
        var state = getState(user);
        if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {
            location = '/logout';
            readyPromiseResolver(user);
        } else if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
            location = '/logout';
            readyPromiseResolver(user);
        } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
            location = '/logout';
            readyPromiseResolver(user);
        } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
            $('#loading').fadeOut();
            firebase.auth().currentUser.getIdToken(false).then((jwt) => {
                localStorage.setItem('jwt', jwt);
                readyPromiseResolver(user);
            }).catch(function(error) {
                // Handle error
                if (error) {
                    readyPromiseRejecter(error);
                }
            });
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {
            readyPromiseResolver(user);
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
            location = '/logout';
            readyPromiseResolver(user);
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
            location = '/logout';
            readyPromiseResolver(user);
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
            location = '/chat';
            readyPromiseResolver(user);
        }
        authStateListener(); // Release event listener
        readyPromiseResolver(user);
    });

    return readyPromise;
})();

function getCookie(cName) {
    if (document.cookie.length > 0) {
        cStart = document.cookie.indexOf(cName + "=");
        if (cStart != -1) {
            cStart = cStart + cName.length + 1;
            cEnd = document.cookie.indexOf(";", cStart);
            if (cEnd == -1) cEnd = document.cookie.length;
            return unescape(document.cookie.substring(cStart, cEnd));
        }
    }
    return '';
}

function getState(user) {
    var state = parseInt('000', 2);
    var name = getCookie('name');
    var email = getCookie('email');
    var pathname = location.pathname;

    if ('' !== name && '' !== email) {
        state = state | parseInt('001', 2);
    }

    if (user) {
        state = state | parseInt('010', 2);
    }

    if ('/login' === pathname || '/signup' === pathname) {
        state = state | parseInt('100', 2);
    }

    return state;

}