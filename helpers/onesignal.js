// https://documentation.onesignal.com/reference
module.exports = (function() {
    const CHATSHIER_CFG = require('../config/chatshier');
    const request = require('request');

    const API_ENDPOINT = 'https://onesignal.com/api/v1';
    const APIKEY_NOT_FOUND = new Error('APIKEY_NOT_FOUND');
    const APIKEY_TABLE = CHATSHIER_CFG.ONESIGNAL_APIKEYS;

    const sendRequest = (options) => {
        return new Promise((resolve, reject) => {
            request(options, (error, res, body) => {
                let canParseJSON =
                    (res.headers['Content-Type'] && res.headers['Content-Type'].includes('application/json')) ||
                    (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) ||
                    ('string' === typeof body && body.length > 0 &&
                    ((body.startsWith('{') && body.endsWith('}')) || (body.startsWith('[') && body.endsWith(']'))));

                body = canParseJSON && 'string' === typeof body ? JSON.parse(body) : body;

                if (error || res.statusCode >= 300) {
                    return reject(body);
                }
                resolve(body);
            });
        });
    };

    class OneSignalHelper {
        constructor() {
            this.headers = {
                'Content-Type': 'application/json; charset=utf-8'
            };
        }

        /**
         * @param {string} appId
         * @param {number} [limit=300]
         * @param {number} [offset=0]
         * @returns {Promise<OneSignal.Devices>}
         */
        viewDevices(appId, limit = 300, offset = 0) {
            let restApiKey = APIKEY_TABLE[appId];
            if (!restApiKey) {
                return Promise.reject(APIKEY_NOT_FOUND);
            }

            let options = {
                method: 'GET',
                url: API_ENDPOINT + '/players?app_id=' + appId + '&limit=' + limit + '&offset=' + offset,
                headers: Object.assign(this.headers, {
                    Authorization: 'Basic ' + restApiKey
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {string} playerId
         * @returns {Promise<OneSignal.Device>}
         */
        viewDevice(appId, playerId) {
            let restApiKey = APIKEY_TABLE[appId];
            if (!restApiKey) {
                return Promise.reject(APIKEY_NOT_FOUND);
            }

            let options = {
                method: 'GET',
                url: API_ENDPOINT + '/players/' + playerId,
                headers: Object.assign(this.headers, {
                    Authorization: 'Basic ' + restApiKey
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {number} [limit=50]
         * @param {number} [offset=0]
         * @returns {Promise<OneSignal.Notifications>}
         */
        viewNotifications(appId, limit = 50, offset = 0) {
            let restApiKey = APIKEY_TABLE[appId];
            if (!restApiKey) {
                return Promise.reject(APIKEY_NOT_FOUND);
            }

            let options = {
                method: 'GET',
                url: API_ENDPOINT + '/notifications?app_id=' + appId + '&limit=' + limit + '&offset=' + offset,
                headers: Object.assign(this.headers, {
                    Authorization: 'Basic ' + restApiKey
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {string} notificationId
         * @returns {Promise<OneSignal.Notification>}
         */
        viewNotification(appId, notificationId) {
            let restApiKey = APIKEY_TABLE[appId];
            if (!restApiKey) {
                return Promise.reject(APIKEY_NOT_FOUND);
            }

            let options = {
                method: 'GET',
                url: API_ENDPOINT + '/notifications/' + notificationId + '?app_id=' + appId,
                headers: Object.assign(this.headers, {
                    Authorization: 'Basic ' + restApiKey
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {OneSignal.Notification} notification
         * @returns {Promise<{ id: string, recipients: number, errors?: any }>}
         */
        createNotification(appId, notification) {
            let restApiKey = APIKEY_TABLE[appId];
            if (!restApiKey) {
                return Promise.reject(APIKEY_NOT_FOUND);
            }

            let options = {
                method: 'POST',
                url: API_ENDPOINT + '/notifications/?app_id=' + appId,
                headers: Object.assign(this.headers, {
                    Authorization: 'Basic ' + restApiKey
                }),
                json: notification
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {string} notificationId
         * @returns {Promise<{ success: 'true' }>}
         */
        cancelNotification(appId, notificationId) {
            let restApiKey = APIKEY_TABLE[appId];
            if (!restApiKey) {
                return Promise.reject(APIKEY_NOT_FOUND);
            }

            let options = {
                method: 'DELETE',
                url: API_ENDPOINT + '/notifications/' + notificationId + '?app_id=' + appId,
                headers: Object.assign(this.headers, {
                    Authorization: 'Basic ' + restApiKey
                })
            };
            return sendRequest(options);
        }
    }

    return new OneSignalHelper();
})();
