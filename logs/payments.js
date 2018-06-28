module.exports = (function() {
    const PAYMENTS = 'payments';
    const CHATSHIER = require('../config/chatshier');

    let LogCore = require('../cores/log');
    let File = LogCore.winston.transports.File;
    let Console = LogCore.winston.transports.Console;

    class PaymentsLog extends LogCore {
        constructor() {
            super();

            let file = new File({ filename: CHATSHIER.LOG.PATH + '/' + PAYMENTS + '.log' });
            let console = new Console();

            this.logger.clear();
            this.logger.add(console);
            this.logger.add(file);
        }
    }

    return new PaymentsLog();
})();
