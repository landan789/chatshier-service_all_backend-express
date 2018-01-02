const IS_COOKIES = parseInt('001', 2);
const IS_USER = parseInt('010', 2);
const IS_LOGIN_SIGNUP_PAGE = parseInt('100', 2);

const NOT_COOKIES = parseInt('000', 2);
const NOT_USER = parseInt('000', 2);
const NOT_LOGIN_SIGNUP_PAGE = parseInt('000', 2);

var serviceUrl = location.host;
var domain = serviceUrl.replace(/^[\w\-]+\./i, '.').replace(/\:\d+$/i, '');

auth.onAuthStateChanged((user) => {
    var state = getState(user);
    if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {
        location = '/logout';
    } else if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
        location = '/logout';
    } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
        location = '/logout';

    } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
        $('#loading').fadeOut();

    } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {

    } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
        location = '/logout';

    } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
        location = '/logout';
    } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
        location = '/chat';

    }

});

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