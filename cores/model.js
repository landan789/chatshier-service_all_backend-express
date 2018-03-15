module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let mongoose = require('mongoose');

    let url = 'mongodb://' + CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT + '/' + CHATSHIER.MONGODB.DATABASE;

    // DB 連線只需要做一次，故放 class 外面
    let db = mongoose.connection;
    db.on('error', () => {
        console.log('[FAILED] ' + url + ' failed to connect ...');
    });
    db.once('open', () => {
        console.log('[SUCCED] ' + url + ' succeded to connect ...');
    });
    class ModelCore {
        constructor () {
            
        }

        Schema (schema) {
            return new mongoose.Schema(schema);
        }

        model (name, schema) {
            return mongoose.model(name, schema);
        }
    };

    return ModelCore;
})();