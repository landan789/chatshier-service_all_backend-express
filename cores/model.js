module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let mongoClient = require('mongodb').MongoClient;
    let url = 'mongodb://' + CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT + '/' + CHATSHIER.MONGODB.DATABASE;
    class ModelCore {
        constructor () {
            this.connectPromise = new Promise((resolve, reject) => {
                console.log(url);
                mongoClient.connect(url, (err, client) => {
                    if (err) {
                        console.log(err, 'failed to connect to MongoDB...');
                        reject(new Error());
                    }
                    resolve(client);
                });
            });

            // this.dbPromise = this.connectPromise.then((clinet) => {
            //     return new Promise((resolve, reject) => {
            //         let db = clinet.db(CHATSHIER.MONGODB.DATABASE);
            //         resolve(db);
            //     });
            // });
        }
    };

    return ModelCore;
})();