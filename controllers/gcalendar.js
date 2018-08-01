module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');

    class GCalendarController extends ControllerCore {
        constructor() {
            super();
            this.postEvent = this.postEvent.bind(this);
        }

        postEvent(req, res) {

        }
    }

    return new GCalendarController();
})();
