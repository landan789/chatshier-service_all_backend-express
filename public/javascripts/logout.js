(function() {
    if (!window.urlConfig) {
        console.warn('Please set up the configuration file of /config/url-config.js');
    }

    var serviceUrl = location.host;
    var domain = serviceUrl.replace(/^[\w-]+\./i, '.').replace(/:\d+$/i, '');

    var clearCookie = function(name, domain) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; ' + 'domain=' + domain;
    };

    var logout = function(callback) {
        clearCookie('name', domain);
        clearCookie('email', domain);
        auth.signOut().then(function() {
            callback();
        });
    };

    logout(function() {
        location.replace('/login');
    });
})();
