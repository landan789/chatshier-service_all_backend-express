module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let elasticsearch = require('elasticsearch');

    class LogCore {
        constructor () {
            this.client = new elasticsearch.Client({
                host: CHATSHIER.ELASTICSEARCH.HOST + ':' + CHATSHIER.ELASTICSEARCH.PORT,
                log: 'trace'
            });
        }

        insert(type, body) {
            /* eslint-disable no-multi-spaces */
            return this.client.index({
                index: CHATSHIER.ELASTICSEARCH.INDEX, // DATABASE
                type: type,                           // TABLE
                body: body                            // ROW
            });
        }

        update(type, id, body) {
            return this.client.update({
                index: CHATSHIER.ELASTICSEARCH.INDEX, // DATABASE
                type: type,                           // TABLE
                id: id,
                body: body                            // ROW
            });
        }
    };

    return LogCore;
})();
