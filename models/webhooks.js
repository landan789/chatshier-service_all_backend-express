module.exports = (function() {
    const ModelCore = require('../cores/model');
    const WEBHOOKS = 'webhooks';

    class WebhooksModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(WEBHOOKS, this.WebhooksSchema);
        }

        insert(webhook, callback) {
            let webhooks;
            let _webhook = new this.Model();
            _webhook.url = webhook.url || '';
            _webhook.body = webhook.body || '';
            _webhook.createdTime = webhook.updatedTime = Date.now();

            return _webhook.save().then((__webhook) => {
                let _query = {
                    '_id': __webhook._id
                };
                return this.Model.findOne(_query);
            }).then((webhook) => {
                let _webhook = {
                    createdTime: webhook.createdTime,
                    updatedTime: webhook.updatedTime,
                    url: webhook.url,
                    body: webhook.body
                };
                webhooks = {
                    [webhook._id]: _webhook
                };
                return webhooks;
            }).then((webhooks) => {
                ('function' === typeof callback) && callback(webhooks);
                return webhooks;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new WebhooksModel();
})();
