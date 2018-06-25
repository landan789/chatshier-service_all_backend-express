module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    const START = 'START';
    const SUCCED = 'SUCCED';
    const FAIL = 'FAIL';

    let winston = require('winston');

    class LogCore {
        constructor () {
            this.logger = winston.createLogger({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            });
        }

        start(message) {
            let json = {};
            json.level = 'info';
            json.status = START;
            json.message = message;
            return this.logger.log(json);
        }

        succed(message) {
            let json = {};
            json.level = 'info';
            json.status = SUCCED;
            json.message = message;
            return this.logger.log(json);
        }

        fail(message) {
            let json = {};
            json.level = 'info';
            json.status = FAIL;
            json.message = message;
            return this.logger.log(json);
        }
    };

    LogCore.winston = winston;

    return LogCore;
})();
