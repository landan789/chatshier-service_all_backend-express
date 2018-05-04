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
    var fbParams = window.chatshier ? window.chatshier.facebook : {};

    var facebookHelper = {
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
                FB.init(fbParams);
                return new Promise(function(resolve) {
                    FB.getLoginStatus(resolve);
                });
            });

            return initPromise;
        },
        getFanPages: function() {
            return new Promise(function(resolve) {
                FB.api('/me/accounts', resolve);
            });
        },
        getFanPageDetail: function(pageId) {
            return new Promise(function(resolve) {
                FB.api('/' + pageId, resolve);
            });
        },
        getFanPageSubscribeApp: function(pageId, pageToken) {
            return new Promise(function(resolve) {
                FB.api('/' + pageId + '/subscribed_apps?access_token=' + pageToken, resolve);
            });
        },
        setFanPageSubscribeApp: function(pageId, pageToken) {
            return new Promise(function(resolve) {
                FB.api('/' + pageId + '/subscribed_apps?access_token=' + pageToken, 'POST', resolve);
            });
        },
        /**
         * @returns {Promise<fb.AuthResponse>}
         */
        signIn: function() {
            return new Promise((resolve) => {
                FB.login(resolve, { scope: 'email' });
            });
        },
        /**
         * @returns {Promise<fb.AuthResponse>}
         */
        signInForPages: function() {
            return new Promise((resolve) => {
                /** @type {fb.LoginOptions} */
                var fbOpts = {
                    auth_type: 'reauthenticate',
                    scope: 'manage_pages,publish_pages,pages_messaging,pages_messaging_subscriptions',
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
