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
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.find(appIds, null, (appGreetings) => {
                        if (!appGreetings) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                            return;
                        }
                        resolve(appGreetings);
                    });
                });
            }).then((greetings) => {
                let result = greetings !== undefined ? greetings : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: result
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        getOne(req, res) {
            let appId;
            let greetingId = req.params.greetingid;

            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;

                if (!greetingId) {
                    return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
                };

                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.find(appId, greetingId, (appGreeting) => {
                        if (!appGreeting) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_FIND);
                            return;
                        }
                        resolve(appGreeting);
                    });
                });
            }).then((appGreeting) => {
                let result = appGreeting || {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: result
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        postOne(req, res) {
            let type = req.body.type;
            let text = req.body.text;
            let postGreeting = {
                type: type,
                text: text
            };
            let appId;

            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.insert(appId, postGreeting, (result) => {
                        if (!result) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_INSERT);
                            return;
                        }
                        resolve(result);
                    });
                });
            }).then((greeting) => {
                let result = greeting !== undefined ? greeting : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: result
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
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
            return this.appsRequestVerify(req).then((checkedAppId) => {
                return new Promise((resolve, reject) => {
                    appsGreetingsMdl.update(appId, greetingId, putGreeting, (appsGreetings) => {
                        if (!appsGreetings) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_INSERT);
                            return;
                        }
                        resolve(appsGreetings);
                    });
                });
            }).then((appsGreetings) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsGreetings || {}
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let greetingId = req.params.greetingid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                return new Promise((resolve, reject) => { // 取得目前appId下所有greetings
                    if (!greetingId) {
                        reject(API_ERROR.GREETINGID_WAS_EMPTY);
                        return;
                    } else if (!checkedAppIds.includes(appId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                        return;
                    };

                    // 刪除指定的 greeting
                    appsGreetingsMdl.remove(appId, greetingId, (appsGreetings) => {
                        if (!appsGreetings) {
                            reject(API_ERROR.APP_GREETING_FAILED_TO_REMOVE);
                            return;
                        }
                        resolve(appsGreetings);
                    });
                });
            }).then((appsGreetings) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsGreetings
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }
    }

    return new AppsGreetingsController();
}());
