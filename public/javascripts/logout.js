if ('undefined' === typeof window.urlConfig) {
    console.warn('Please set up the configuration file of /config/url-config.js');
}

var serviceUrl = location.host;
var domain = serviceUrl.replace(/^[\w\-]+\./i, '.').replace(/\:\d+$/i, '');

logout(() => {
    location = '/login';
});

function logout(callback) {
    clearCookie('name', domain);
    clearCookie('email', domain);
    auth.signOut()
        .then(response => {

            callback();
        })
}

function clearCookie(name, domain) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; " + "domain=" + domain;
}