/// <reference path='../../../typings/client/index.d.ts' />

window.OneSignal = window.OneSignal || [];

window.oneSignalHelper = (function() {
    var OneSignal = window.OneSignal;
    var readyPromise = null;

    var oneSignalHelper = {
        loadSDK: function() {
            var sdkScript = document.getElementById('onesignal_sdk');
            if (sdkScript) {
                return Promise.resolve();
            }

            return new Promise(function(resolve, reject) {
                sdkScript = document.createElement('script');
                sdkScript.id = 'onesignal_sdk';
                sdkScript.async = true;

                sdkScript.onload = function(ev) {
                    sdkScript.onload = sdkScript.onerror = void 0;
                    OneSignal = window.OneSignal = window.OneSignal || [];
                    resolve(ev);
                };
                sdkScript.onerror = function(ev) {
                    sdkScript.onload = sdkScript.onerror = void 0;
                    reject(ev);
                };
                sdkScript.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
                document.head.appendChild(sdkScript);
            });
        },
        init: function() {
            if (readyPromise) {
                return readyPromise;
            }

            readyPromise = oneSignalHelper.loadSDK().then(function() {
                if (!OneSignal.initialized) {
                    // https://documentation.onesignal.com/docs/web-push-sdk#section--init-
                    OneSignal.init({
                        appId: '4353dd8a-9cb2-4958-a5b5-d669afce4ca6',
                        subdomainName: 'service-fea-ch',
                        path: '/',
                        safariWebId: 'web.onesignal.auto.64337d6b-67cd-4296-b41c-d41bc6b4a874',
                        httpPermissionRequest: {
                            enable: true
                        },
                        promptOptions: {
                            actionMessage: '快訂閱喔',
                            acceptButtonText: '訂閱',
                            cancelButtonText: '不了！謝謝'
                        },
                        welcomeNotification: {
                            disable: false,
                            title: '歡迎',
                            message: '感謝訂閱好棒棒！',
                            url: 'https://www.chatshier.com'
                        },
                        notifyButton: {
                            enable: false
                        },
                        persistNotification: true,
                        webhooks: {},
                        autoRegister: false
                    });

                    return new Promise(function(resolve) {
                        OneSignal.once('initialize', function() {
                            console.info('=== OneSignal initialized ===');
                            resolve(OneSignal);
                        });
                    });
                }
                console.info('=== OneSignal initialized ===');
                return OneSignal;
            });
            return readyPromise;
        },
        /** @returns {Promise<'default'|'granted'|'denied'>} */
        getNotificationPermission: function() {
            return oneSignalHelper.init().then(function() {
                return new Promise(function(resolve) {
                    OneSignal.getNotificationPermission(resolve);
                });
            });
        },
        getSubscriptionState() {
            return Promise.all([
                OneSignal.isPushNotificationsSupported(),
                OneSignal.isPushNotificationsEnabled(),
                OneSignal.isOptedOut(),
                OneSignal.getSubscription()
            ]).then(function(result) {
                return {
                    isPushSupported: result.shift(),
                    isPushEnabled: result.shift(),
                    isOptedOut: result.shift(),
                    isSubscribed: result.shift()
                };
            });
        },
        setSubscription: function(isSubscribed) {
            return oneSignalHelper.getSubscriptionState().then(function(state) {
                if (!state.isPushSupported) {
                    return;
                }

                if (state.isPushEnabled) {
                    window.OneSignal.setSubscription(isSubscribed);
                } else {
                    if (state.isOptedOut) {
                        window.OneSignal.setSubscription(isSubscribed);
                    } else {
                        window.OneSignal.registerForPushNotifications();
                    }
                }
            });
        }
    };

    return oneSignalHelper;
})();
