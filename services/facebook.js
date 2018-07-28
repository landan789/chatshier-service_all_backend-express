module.exports = (function() {
    const request = require('request');
    const chatshierCfg = require('../config/chatshier');

    const API_ENDPOINT = 'https://graph.facebook.com';

    class FacebookService {
        constructor() {
            if (chatshierCfg && chatshierCfg.FACEBOOK) {
                this.appId = chatshierCfg.FACEBOOK.APP_ID;
                this.appSecret = chatshierCfg.FACEBOOK.APP_SECRET;
                this.appAccessToken = chatshierCfg.FACEBOOK.CLIENT_TOKEN;
                this.version = chatshierCfg.FACEBOOK.VERSION || 'v3.0';
            }
        }

        /**
         * @param {string} shortLivedToken
         * @returns {Promise<{ access_token: string, token_type: string }>}
         */
        exchangeLongLivedToken(shortLivedToken) {
            let urlQuery = '?grant_type=fb_exchange_token&client_id=' + this.appId + '&client_secret=' + this.appSecret + '&fb_exchange_token=' + shortLivedToken;
            let options = {
                method: 'GET',
                url: API_ENDPOINT + '/oauth/access_token' + urlQuery
            };
            return this._sendRequest(options);
        }

        /**
         * @param {string} pageId
         * @param {string} fbUserLongToken
         * @returns {Promise<{ access_token: string, token_type: string }>}
         */
        requestPageToken(pageId, fbUserLongToken) {
            let urlQuery = '?fields=access_token&access_token=' + fbUserLongToken;
            let options = {
                method: 'GET',
                url: API_ENDPOINT + '/' + pageId + urlQuery
            };
            return this._sendRequest(options).then((res) => {
                return this.exchangeLongLivedToken(res.access_token);
            });
        }

        /**
         * @param {string} pageId
         * @param {string} pageToken
         */
        setFanPageSubscribeApp(pageId, pageToken) {
            let options = {
                method: 'POST',
                url: API_ENDPOINT + '/' + this.version + '/' + pageId + '/subscribed_apps?access_token=' + pageToken
            };
            return this._sendRequest(options);
        }

        /**
         * @param {string} pageId
         * @param {string} pageToken
         */
        setFanPageUnsubscribeApp(pageId, pageToken) {
            let options = {
                method: 'DELETE',
                url: API_ENDPOINT + '/' + this.version + '/' + pageId + '/subscribed_apps?access_token=' + pageToken
            };
            return this._sendRequest(options);
        }

        _sendRequest(options) {
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
        }
    }

    return new FacebookService();
})();
