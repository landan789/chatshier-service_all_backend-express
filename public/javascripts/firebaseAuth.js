const IS_COOKIES = '001';
const IS_USER = '010';
const IS_LOGIN_SIGNUP_PAGE = '100';

const NOT_COOKIES = '000';
const NOT_USER = '000';
const NOT_LOGIN_SIGNUP_PAGE = '000';

var serviceUrl = location.host;
var domain = serviceUrl.replace(/^[\w\-]+\./i, '.').replace(/\:\d+$/i, '');

// Initialize Firebase
firebase.initializeApp(config);
const auth = firebase.auth();
const database = firebase.database();
// log in status

var firbaseEvent = new Event('firebaseAuth');
window.addEventListener('firebaseAuth', function(e) {

    auth.onAuthStateChanged(user => {
        var state = getState(user);

        if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {
            location = '/login';
        } else if (state === (NOT_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
            clearCookie('name', domain);
            clearCookie('email', domain);
            location = '/login';
        } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
            logout(() => {
                location = '/login';
            });

        } else if (state === (NOT_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
            //
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | NOT_COOKIES)) {
            //
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | NOT_USER | IS_COOKIES)) {
            clearCookie('name', domain);
            clearCookie('email', domain);
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | NOT_COOKIES)) {
            logout();
        } else if (state === (IS_LOGIN_SIGNUP_PAGE | IS_USER | IS_COOKIES)) {
            location = '/chat';

        }

    });
}, false);




// functions
function logout(callback) {
    auth.signOut()
        .then(response => {
            clearCookie('name', domain);
            clearCookie('email', domain);
            callback();
        })
}

function clearCookie(name, domain) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; " + "domain=" + domain;
}

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
    return "";
}

function getState(user) {
    var state = '000';
    var name = getCookie('name');
    var email = getCookie('email');
    var pathname = location.pathname;

    if ('' !== name && '' !== email) {
        state = state | '001';
    }

    if (user) {
        state = state | '010';
    }

    if ('/login' === pathname || '/signup' === pathname) {
        state = state | '100';
    }

    return state;

}