module.exports = (function() {
    const LogCore = require('../cores/log');
    const WEBHOOKS = 'webhooks';

    class WebhooksLog extends LogCore {
        constructor() {
            super();
            this.type = 'webhook';
        }

        insert(body) {
            return super.insert(this.type, body);
        }

        update(id, body) {
            return super.update(this.type, id, body);
        }
    }
    return new WebhooksLog();
})();
