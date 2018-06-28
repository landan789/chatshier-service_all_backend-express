module.exports = (function() {
    const WEBHOOKS = 'webhooks';
    const CHATSHIER = require('../config/chatshier');

    let LogCore = require('../cores/log');
    let File = LogCore.winston.transports.File;
    let Console = LogCore.winston.transports.Console;

    class WebhooksLog extends LogCore {
        constructor() {
            super();

            let file = new File({ filename: CHATSHIER.LOG.PATH + '/' + WEBHOOKS + '.log' });
            let console = new Console();

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
