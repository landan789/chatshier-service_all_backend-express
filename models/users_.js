module.exports = (function() {
    let ModelCore = require('../cores/model');
    let COLLECTION = 'users';
    class UsersModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(COLLECTION, this.RootSchema);
        }

        find(query) {
            return this.Model.find(query);
        }
    }
    return new UsersModel();
    
})();
