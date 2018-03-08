window.googleClientHelper = (function() {
    var initPromise = null;
    var googleAuth = null;

    var googleClient = {
        auth: function() {
            return googleAuth;
        },
        /**
         * 有需要使用時才 fetch gapi script
         */
        loadAPI: function() {
            var apiScript = document.getElementById('google_api');
            if (apiScript) {
                return Promise.resolve();
            }

            apiScript = document.createElement('script');
            apiScript.id = 'google_api';
            apiScript.async = apiScript.defer = true;

            var readyPromise = new Promise(function(resolve) {
                apiScript.onload = function() {
                    apiScript.onload = null;
                    resolve();
                };
                apiScript.src = 'https://apis.google.com/js/api.js';
                document.head.appendChild(apiScript);
            });

            return readyPromise;
        },
        init: function(configUrl) {
            if (initPromise) {
                return initPromise;
            }

            initPromise = new Promise(function(resolve) {
                window.gapi.load('client:auth2', resolve);
            }).then(function() {
                return window.fetch(configUrl);
            }).then(function(res) {
                return res.json();
            }).then(function(config) {
                // 此 google calendar 的 key 使用 9thflr.rd@gmail.com
                return window.gapi.client.init({
                    apiKey: config.API_KEY,
                    clientId: config.CLIENT_ID,
                    discoveryDocs: config.DISCOVERY_DOCS,
                    scope: config.SCOPES
                });
            }).then(function() {
                return window.gapi.auth2.getAuthInstance();
            }).then(function(auth) {
                googleAuth = auth;
                return googleAuth;
            });

            return initPromise;
        },
        signIn: function() {
            // 必須等待 gapi init 後建立 iframe 才可進行 signIn 動作
            // 否則瀏覽器預設會阻擋 popup 視窗
            if (!googleAuth) {
                return Promise.reject(new Error('no_google_auth_instance'));
            }

            // https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiauth2signinoptions
            var signInOpts = {
                prompt: 'select_account' // 每一次進行登入時都 popup 出選擇帳號的視窗
            };

            return googleAuth.signIn(signInOpts).then(function(currentUser) {
                if (!currentUser) {
                    return;
                }
                return currentUser.getBasicProfile();
            });
        },
        signOut: function() {
            if (!googleAuth) {
                return Promise.reject(new Error('no_google_auth_instance'));
            }
            return googleAuth.signOut();
        }
    };

    return googleClient;
})();
