module.exports = (function() {
    const request = require('request');
    const chatshierCfg = require('../config/chatshier');

    const API_ENDPOINT = 'https://graph.facebook.com';

    class FacebookService {
        constructor() {
            this.appId = chatshierCfg.FACEBOOK.appId;
            this.appSecret = chatshierCfg.FACEBOOK.appSecret;
            this.appAccessToken = chatshierCfg.FACEBOOK.appAccessToken;
        }

        _sendRequest(options) {
            return new Promise((resolve, reject) => {
                request(options, (error, res, body) => {
                    if (error || res.statusCode >= 300) {
                        return reject(body);
                    }

                    let canParseJSON =
                        (res.headers['Content-Type'] && res.headers['Content-Type'].includes('application/json')) ||
                        (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) ||
                        ('string' === typeof body && body.length > 0 &&
                        (('{' === body[0] && '}' === body[body.length - 1]) || ('[' === body[0] && ']' === body[body.length - 1])));
                    resolve(canParseJSON && 'string' === typeof body ? JSON.parse(body) : body);
                });
            });
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
    }

    return new FacebookService();
})();
