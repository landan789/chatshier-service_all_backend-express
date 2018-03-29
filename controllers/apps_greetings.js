module.exports = (function() {
    let API_ERROR = require('../config/api_error');
    let API_SUCCESS = require('../config/api_success');
    let util = require('util'); 

    let controllerCre = require('../cores/controller');

    let appsGreetingsMdl = require('../models/apps_greetings');

    function AppsGreetingsController() {}

    util.inherits(AppsGreetingsController, controllerCre.constructor);

    AppsGreetingsController.prototype.getAll = function(req, res) {
        return AppsGreetingsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
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
    };

    AppsGreetingsController.prototype.getOne = function(req, res) {
        let appId = '';
        let greetingId = req.params.greetingid;

        return AppsGreetingsController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
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
    };

    AppsGreetingsController.prototype.postOne = (req, res) => {
        let type = req.body.type;
        let text = req.body.text;
        let createdTime = req.body.createdTime;
        let postGreeting = {
            type: type,
            text: text,
            createdTime : createdTime
        };
        return AppsGreetingsController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            let appId = checkedAppId;
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
    };

    AppsGreetingsController.prototype.deleteOne = (req, res) => {
        let appId = req.params.appid;
        let greetingId = req.params.greetingid;

        return AppsGreetingsController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
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
    };

    return new AppsGreetingsController();
}());
