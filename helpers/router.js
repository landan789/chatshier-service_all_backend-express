module.exports = (function() {
    var API_ERROR = require('../config/api_error');

    class RouterHelper {
        /**
         * middleware: redirect to website path /signin
         */

        requestNotExistentPath(req, res, next) {
            res.redirect('/signin');
            return;
        }
        /**
         * middleware: respone 400
         */
        requestNotExistentApi(req, res, next) {
            let json = {
                status: 0,
                msg: API_ERROR.REQUESTED_NOT_EXISTENT_API.MSG
            };
            res.status(400).json(json);
            return;
        }
    };
    return new RouterHelper();
})();
