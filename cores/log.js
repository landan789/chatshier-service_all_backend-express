module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    const START = 'START';
    const SUCCED = 'SUCCED';
    const FAIL = 'FAIL';

    let elasticsearch = require('elasticsearch');
    let winston = require('winston');

    let logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.json(),
            winston.format.timestamp()
        )
    });

    class LogCore {
        constructor () {
            this.logger = logger;
            this.winston = winston;
        }

        start(message, type) {
            let json = {};
            json.level = 'info';
            json.status = START;
            json.message = message;
            json.type = type;
            return this.logger.log(json);
        }

        succed(message, type) {
            let json = {};
            json.level = 'info';
            json.status = SUCCED;
            json.message = message;
            json.type = type;
            return this.logger.log(json);
        }

        fail(message, type) {
            let json = {};
            json.level = 'info';
            json.status = FAIL;
            json.message = message;
            json.type = type;
            return this.logger.log(json);
        }
    };

    return LogCore;
})();
