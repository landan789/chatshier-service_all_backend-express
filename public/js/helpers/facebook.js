window.facebookHelper = (function() {
    var initPromise = null;
    var fbAuth = null;

    var language =
        (navigator.languages && navigator.languages[0]) ||
        navigator.language ||
        navigator.userLanguage;
    var fbsdkUrl = 'https://connect.facebook.net/' + language + '/sdk.js';
    var fbsdkId = 'facebook-jssdk';
    /** @type {fb.InitParams} */
    var fbConfig = window.chatshier ? window.chatshier.facebook : {};

    var facebookHelper = {
        PAGES_SCOPES: 'manage_pages,publish_pages',
        auth: function() {
            return fbAuth;
        },
        /**
         * 有需要使用時才 fetch facebook js sdk
         */
        loadAPI: function() {
            var sdkScript = document.getElementById(fbsdkId);
            if (sdkScript) {
                return Promise.resolve();
            }

            return new Promise(function(resolve, reject) {
                sdkScript = document.createElement('script');
                sdkScript.id = fbsdkId;
                sdkScript.async = sdkScript.defer = true;
                sdkScript.onload = function(ev) {
                    sdkScript.onload = sdkScript.onerror = void 0;
                    resolve(ev);
                };
                sdkScript.onerror = function(ev) {
                    sdkScript.onload = sdkScript.onerror = void 0;
                    reject(ev);
                };
                sdkScript.src = fbsdkUrl;
                document.head.appendChild(sdkScript);
            });
        },
        /**
         * @returns {Promise<fb.AuthResponse>}
         */
        init: function(configUrl) {
            if (initPromise) {
                return initPromise;
            }

            initPromise = facebookHelper.loadAPI().then(function() {
                FB.init(fbConfig);
                return new Promise(function(resolve) {
                    FB.getLoginStatus(resolve);
                });
            });

            return initPromise;
        },
        /**
         * @param {string} [scope="email"]
         * @returns {Promise<fb.AuthResponse>}
         */
        signIn: function(scope) {
            scope = scope || 'email';
            return new Promise((resolve) => {
                /** @type {fb.LoginOptions} */
                var fbOpts = {
                    scope: scope,
                    return_scopes: true
                };
                FB.login(resolve, fbOpts);
            });
        },
        /**
         * @returns {Promise<fb.AuthResponse>}
         */
        signOut: function() {
            return new Promise((resolve) => {
                FB.logout(resolve);
            });
        }
    };

    return facebookHelper;
})();
