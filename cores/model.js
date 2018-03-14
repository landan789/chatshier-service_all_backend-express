module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let mongoClient = require('mongodb').MongoClient;
    let url = CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT;
    class ModelCore {
        constructor () {
            this.connectPromise = new Promise((resolve, reject) => {
                mongoClient.connect(url, (err, client) => {
                    if (err) {
                        reject(new Error());
                    }
                    resolve(client);
                });
            });

            this.dbPromise = this.connectPromise.then((clinet) => {
                return new Promise((resolve, reject) => {
                    let db = clinet.db(CHATSHIER.MONGODB.DATABASE);
                    resolve(db);
                });
            });
        }
    };

    return new ModelCore();
})();