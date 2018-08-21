module.exports = (function() {
    const request = require('request');
    const CHATSHIER_CFG = require('../config/chatshier');
    const GenericTemplateBuilder = require('facebook-bot-messenger').GenericTemplateBuilder;

    const API_ENDPOINT = 'https://graph.facebook.com';

    class FacebookService {
        constructor() {
            if (CHATSHIER_CFG && CHATSHIER_CFG.FACEBOOK) {
                this.appId = CHATSHIER_CFG.FACEBOOK.APP_ID;
                this.appSecret = CHATSHIER_CFG.FACEBOOK.APP_SECRET;
                this.appAccessToken = CHATSHIER_CFG.FACEBOOK.CLIENT_TOKEN;
                this.version = CHATSHIER_CFG.FACEBOOK.VERSION || 'v3.0';
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

        /**
         * @param {string} recipientUid
         * @param {Chatshier.Models.Template} templateMessage
         */
        templateMessageToFbJson(recipientUid, templateMessage) {
            let template = templateMessage.template;
            let columns = template.columns ? template.columns : [template];
            let elements = columns.map((column) => {
                let element = {
                    title: column.title,
                    subtitle: column.text
                };

                if (!element.title && element.subtitle) {
                    element.title = element.subtitle;
                    delete element.subtitle;
                }

                if (column.thumbnailImageUrl) {
                    element.image_url = column.thumbnailImageUrl;
                }

                if (column.defaultAction) {
                    element.default_action = {
                        type: 'web_url',
                        url: column.defaultAction.uri
                    };
                }

                let actions = column.actions || [];
                if (actions.length > 0) {
                    element.buttons = actions.map((action) => {
                        /** @type {string} */
                        let type = action.type;
                        let button = {
                            type: type,
                            title: action.label
                        };

                        if ('uri' === action.type) {
                            if (action.uri && action.uri.startsWith('tel:')) {
                                button.type = 'phone_number';
                                button.payload = action.uri.replace('tel:', '');
                            } else {
                                button.type = 'web_url';
                                button.url = action.uri;
                            }
                        } else if ('message' === action.type) {
                            button.type = 'postback';
                            button.payload = JSON.stringify({ action: 'SEND_REPLY_TEXT', replyText: action.text || '' });
                        } else {
                            button.type = 'postback';
                            button.payload = action.data || '{}';
                        }
                        return button;
                    });
                }
                return element;
            });

            let templateBuilder = new GenericTemplateBuilder(elements);
            let templateJson = {
                recipient: {
                    id: recipientUid
                },
                message: {
                    attachment: {
                        type: 'template',
                        payload: templateBuilder.buildTemplate()
                    }
                }
            };
            return templateJson;
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
