module.exports = (function() {
    /** @type {any} */
    const ERROR = require('../config/error.json');

    class RouterHelper {
        /**
         * middleware: redirect to website path /signin
         */

        requestNotExistentPath(req, res, next) {
            res.redirect('/signin');
        }
        /**
         * middleware: respone 400
         */
        requestNotExistentApi(req, res, next) {
            let json = {
                status: 0,
                msg: ERROR.REQUESTED_NOT_EXISTENT_API.MSG
            };
            res.status(400).json(json);
        }
    };
    return new RouterHelper();
})();
