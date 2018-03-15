// https://documentation.onesignal.com/reference
module.exports = (function() {
    const oneSignalCfg = require('../config/onesignal');
    const request = require('request');

    const sendRequest = (options) => {
        return new Promise((resolve, reject) => {
            request(options, (error, res, body) => {
                if (error || res.statusCode >= 300) {
                    return reject(body);
                }

                let hasJsonHeader =
                    (res.headers['Content-Type'] && res.headers['Content-Type'].includes('application/json')) ||
                    (res.headers['content-type'] && res.headers['content-type'].includes('application/json'));
                resolve(hasJsonHeader && 'string' === typeof body ? JSON.parse(body) : body);
            });
        });
    };

    class OneSignalHelper {
        constructor() {
            this.API_ENDPOINT = oneSignalCfg.API_ENDPOINT;
            this.APPID = oneSignalCfg.APPID;
            this.REST_API_KEY = oneSignalCfg.REST_API_KEY;
            this.USER_AUTH_KEY = oneSignalCfg.USER_AUTH_KEY;
            this.headers = {
                'Content-Type': 'application/json; charset=utf-8'
            };
        }

        /** @private */
        _headersBuilder(headers) {
            return Object.assign(headers, this.headers);
        }

        /**
         * @returns {Promise<OneSignal.App[]>}
         */
        viewApps() {
            let options = {
                method: 'GET',
                url: this.API_ENDPOINT + '/apps',
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.USER_AUTH_KEY
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @returns {Promise<OneSignal.App>}
         */
        viewApp(appId) {
            let options = {
                method: 'GET',
                url: this.API_ENDPOINT + '/apps/' + appId,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.USER_AUTH_KEY
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {number} [limit=300]
         * @param {number} [offset=0]
         * @returns {Promise<OneSignal.Devices>}
         */
        viewDevices(appId, limit, offset) {
            limit = limit || 300;
            offset = !offset ? 0 : offset;

            let options = {
                method: 'GET',
                url: this.API_ENDPOINT + '/players?app_id=' + appId + '&limit=' + limit + '&offset=' + offset,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.REST_API_KEY
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} playerId
         * @returns {Promise<OneSignal.Device>}
         */
        viewDevice(playerId) {
            let options = {
                method: 'GET',
                url: this.API_ENDPOINT + '/players/' + playerId,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.REST_API_KEY
                })
            };
            return sendRequest(options);
        }

        /**
         * @param {string} appId
         * @param {number} [limit=300]
         * @param {number} [offset=0]
         * @returns {Promise<OneSignal.Notifications>}
         */
        viewNotifications(appId, limit, offset) {
            limit = limit || 50;
            offset = !offset ? 0 : offset;

            let options = {
                method: 'GET',
                url: this.API_ENDPOINT + '/notifications?app_id=' + appId + '&limit=' + limit + '&offset=' + offset,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.REST_API_KEY
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
            let options = {
                method: 'GET',
                url: this.API_ENDPOINT + '/notifications/' + notificationId + '?app_id=' + appId,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.REST_API_KEY
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
            let options = {
                method: 'POST',
                url: this.API_ENDPOINT + '/notifications/?app_id=' + appId,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.REST_API_KEY
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
            let options = {
                method: 'DELETE',
                url: this.API_ENDPOINT + '/notifications/' + notificationId + '?app_id=' + appId,
                headers: this._headersBuilder({
                    Authorization: 'Basic ' + this.REST_API_KEY
                })
            };
            return sendRequest(options);
        }
    }

    let instance = new OneSignalHelper();

    // /** @type {OneSignal.Notification} */
    // let notification = {
    //     included_segments: ['Active Users'],
    //     contents: {
    //         en: 'Test notification'
    //     }
    // };
    // instance.createNotification(instance.APPID, notification).then((resJson) => {
    //     console.log(resJson);
    // });

    return instance;
})();
