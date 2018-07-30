/// <reference path='../../../typings/client/index.d.ts' />

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

            return new Promise(function(resolve, reject) {
                apiScript = document.createElement('script');
                apiScript.id = 'google_api';
                apiScript.async = apiScript.defer = true;
                apiScript.onload = function(ev) {
                    apiScript.onload = apiScript.onerror = void 0;
                    resolve(ev);
                };
                apiScript.onerror = function(ev) {
                    apiScript.onload = apiScript.onerror = void 0;
                    reject(ev);
                };
                apiScript.src = 'https://apis.google.com/js/client:platform.js';
                document.head.appendChild(apiScript);
            });
        },
        init: function(GOOGLE_CALENDAR) {
            if (initPromise) {
                return initPromise;
            }
            initPromise = new Promise(function(resolve) {
                window.gapi.load('client:auth2', function() {
                    resolve();
                });
            }).then(function() {
                // 此 google calendar 的 key 使用 9thflr.rd@gmail.com
                return window.gapi.client.init({
                    apiKey: GOOGLE_CALENDAR.API_KEY,
                    clientId: GOOGLE_CALENDAR.CLIENT_ID,
                    discoveryDocs: GOOGLE_CALENDAR.DISCOVERY_DOCS,
                    scope: GOOGLE_CALENDAR.SCOPES
                });
            }).then(function() {
                // google client 初始化完成後，iframe 會保留在 document body 裡
                // 會造成 page 被 block 住，導致網路傳輸可能出現問題
                // 因此當 api 初始化完成時，就將此 iframe 移除
                var gOauthIframe = document.querySelector('[id^="oauth2relay"][name^="oauth2relay"]');
                gOauthIframe && document.body.removeChild(gOauthIframe);
                return window.gapi.auth2.getAuthInstance();
            }).then(function(auth) {
                googleAuth = auth;
                return googleAuth.isSignedIn.get();
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
