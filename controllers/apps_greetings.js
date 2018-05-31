module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsGreetingsMdl = require('../models/apps_greetings');

    class AppsGreetingsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsGreetingsMdl.find(appIds).then((appsGreetings) => {
                    if (!appsGreetings) {
                        return Promise.reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                    }
                    return appsGreetings;
                });
            }).then((appsGreetings) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsGreetings
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let greetingId = req.params.greetingid;

            return this.appsRequestVerify(req).then(() => {
                if (!greetingId) {
                    return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
                }

                return appsGreetingsMdl.find(appId, greetingId).then((appsGreetings) => {
                    if (!(appsGreetings && appsGreetings[appId])) {
                        return Promise.reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                    }
                    return appsGreetings;
                });
            }).then((appGreeting) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appGreeting
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let type = req.body.type;
            let text = req.body.text;
            let postGreeting = {
                type: type,
                text: text
            };

            return this.appsRequestVerify(req).then(() => {
                return appsGreetingsMdl.insert(appId, postGreeting).then((appsGreetings) => {
                    if (!(appsGreetings && appsGreetings[appId])) {
                        return Promise.reject(API_ERROR.APP_GREETING_FAILED_TO_INSERT);
                    }
                    return appsGreetings;
                });
            }).then((appsGreetings) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsGreetings
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }

        putOne(req, res) {

            let appId = req.params.appid;
            let greetingId = req.params.greetingid;
            let type = req.body.type;
            let text = req.body.text;

            let putGreeting = {
                type,
                text
            };

            return this.appsRequestVerify(req).then(() => {
                if (!greetingId) {
                    return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
                }

                return appsGreetingsMdl.update(appId, greetingId, putGreeting).then((appsGreetings) => {
                    if (!(appsGreetings && appsGreetings[appId])) {
                        return Promise.reject(API_ERROR.APP_GREETING_FAILED_TO_INSERT);
                    }
                    return appsGreetings;
                });
            }).then((appsGreetings) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsGreetings
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let greetingId = req.params.greetingid;

            return this.appsRequestVerify(req).then(() => {
                if (!greetingId) {
                    return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
                }

                return appsGreetingsMdl.remove(appId, greetingId).then((appsGreetings) => {
                    if (!(appsGreetings && appsGreetings[appId])) {
                        return Promise.reject(API_ERROR.APP_GREETING_FAILED_TO_REMOVE);
                    }
                    return appsGreetings;
                });
            }).then((appsGreetings) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsGreetings
                };
                return this.successJson(req, res, suc)
            }).catch((err) => {
                return this.errorJson(req, res, err)
            });
        }
    }

    return new AppsGreetingsController();
}());
