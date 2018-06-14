module.exports = (function() {
    const WEBHOOKS = 'webhooks';
    const CHATSHIER = require('../config/chatshier');

    let LogCore = require('../cores/log');

    class WebhooksLog extends LogCore {
        constructor() {
            super();
            let file = new this.winston.transports.File({ filename: CHATSHIER.LOG.PATH + '/' + WEBHOOKS + '.log' });
            let console = new this.winston.transports.Console();
            this.logger.clear();
            this.logger.add(console);
            this.logger.add(file);
        }
        start(message) {
            return super.start(message);
        }

        succed(message) {
            return super.succed(message);
        }

        fail(message) {
            return super.fail(message);
        }
    }

    return new WebhooksLog();
})();
