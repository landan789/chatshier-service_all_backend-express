module.exports = (function() {
    const request = require('request');
    const CHATSHIER_CFG = require('../config/chatshier');

    const API_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify';

    class GoogleReCaptchaHelper {
        constructor() {
            if (CHATSHIER_CFG && CHATSHIER_CFG.GOOGLE) {
                this.recaptchaSecretKey = CHATSHIER_CFG.GOOGLE.RECAPTCHA_SECRET_KEY;
            }
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
         * @param {string} recaptchaResponse
         */
        verifyingUserResponse(recaptchaResponse) {
            let options = {
                url: API_ENDPOINT + '?secret=' + this.recaptchaSecretKey + '&response=' + recaptchaResponse,
                method: 'POST'
            };

            return this._sendRequest(options);
            // .then((resJson) => {
            //     if (!resJson.success) {
            //         let ERROR = {};
            //         resJson['error-codes'].forEach((errorCode) => {
            //             ERROR.CODE = errorCode;
            //             switch (errorCode) {
            //                 case 'missing-input-secret':
            //                     ERROR.MSG = 'The secret parameter is missing.';
            //                     break;
            //                 case 'invalid-input-secret':
            //                     ERROR.MSG = 'The secret parameter is invalid or malformed.';
            //                     break;
            //                 case 'missing-input-response':
            //                     ERROR.MSG = 'The response parameter is missing.';
            //                     break;
            //                 case 'invalid-input-response':
            //                     ERROR.MSG = 'The response parameter is invalid or malformed.';
            //                     break;
            //                 case 'bad-request':
            //                     ERROR.MSG = 'The request is invalid or malformed.';
            //                     break;
            //                 case 'timeout-or-duplicate':
            //                     ERROR.MSG = 'The response parameter is expired.';
            //                     break;
            //                 default:
            //                     ERROR.MSG = 'Unknown';
            //                     break;
            //             }
            //         });
            //         return Promise.reject(ERROR);
            //     }
            //     return resJson;
            // });
        }
    }

    return new GoogleReCaptchaHelper();
})();
