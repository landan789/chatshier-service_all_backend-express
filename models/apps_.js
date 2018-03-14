module.exports = (function() {
    let ModelCre = require('../cores/model');
    class AppsModel extends ModelCre {
        constructor() {
            super();
            // this.model = this.dbPromise.then((db) => {
            //     return db.getCollection('apps');
            // });
        }
        // find(appIds) {
        //     return new Promise((resolve, reject) => {
        //         this.model.find({}, ((err, apps) => {
        //             if (err) {
        //                 reject(new Error(err));
        //             }
        //             resolve(apps);
        //         }));
        //     });
        // }
    }
    return new AppsModel();
})();