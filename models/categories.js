module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CATEGORIES = 'categories';

    class CategoriesModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(CATEGORIES, ModelCore.CategoriesSchema);
        }
    }

    return new CategoriesModel();
})();
