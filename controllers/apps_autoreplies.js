module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsAutorepliesMdl = require('../models/apps_autoreplies');

    class AppsAutorepliesController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsAutorepliesMdl.find(appIds).then((appsAutoreplies) => {
                    if (!appsAutoreplies) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                    }
                    return appsAutoreplies;
                });
            }).then((data) => {
                let apps = data;
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: apps
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let autoreplyId = req.params.autoreplyid;

            return this.appsRequestVerify(req).then(() => {
                return appsAutorepliesMdl.find(appId, autoreplyId).then((appsAutoreplies) => {
                    if (!(appsAutoreplies && appsAutoreplies[appId])) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                    }
                    return appsAutoreplies;
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        postOne(req, res, next) {
            let appId = req.params.appid;
            let autoreply = {
                title: req.body.title || '',
                startedTime: undefined !== req.body.startedTime ? req.body.startedTime : 0,
                endedTime: undefined !== req.body.endedTime ? req.body.endedTime : 0,
                timezoneOffset: undefined !== req.body.timezoneOffset ? req.body.timezoneOffset : 0,
                text: req.body.text || '',
                periods: req.body.periods || []
            };

            return this.appsRequestVerify(req).then(() => {
                return appsAutorepliesMdl.insert(appId, autoreply).then((appsAutoreplies) => {
                    if (!appsAutoreplies) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_INSERT);
                    }
                    return appsAutoreplies;
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let autoreplyId = req.params.autoreplyid;
            let autoreply = {};
            ('string' === typeof req.body.title) && (autoreply.title = req.body.title);
            ('number' === typeof req.body.startedTime) && (autoreply.startedTime = req.body.startedTime);
            ('number' === typeof req.body.endedTime) && (autoreply.endedTime = req.body.endedTime);
            ('string' === typeof req.body.text) && (autoreply.text = req.body.text);
            ('number' === typeof req.body.timezoneOffset) && (autoreply.timezoneOffset = req.body.timezoneOffset);
            (req.body.periods instanceof Array) && (autoreply.periods = req.body.periods);

            return this.appsRequestVerify(req).then(() => {
                if (!autoreplyId) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_AUTOREPLYID_WAS_EMPTY);
                };

                if ('' === autoreply.title) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_TITLE_WAS_EMPTY);
                };

                if ('' === autoreply.text) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_TEXT_WAS_EMPTY);
                };

                return appsAutorepliesMdl.findAutoreplies(appId).then((autoreplies) => {
                    if (!autoreplies) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                    }

                    // 判斷 autoreplies 中是否有目前 autoreplyId
                    if (!autoreplies[autoreplyId]) {
                        return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    }

                    return appsAutorepliesMdl.update(appId, autoreplyId, autoreply).then((appsAutoreplies) => {
                        if (!(appsAutoreplies && appsAutoreplies[appId])) {
                            return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_UPDATE);
                        }
                        return appsAutoreplies;
                    });
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let autoreplyId = req.params.autoreplyid;

            return this.appsRequestVerify(req).then(() => {
                if (!autoreplyId) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_AUTOREPLYID_WAS_EMPTY);
                }
                return appsAutorepliesMdl.findAutoreplies(appId);
            }).then((autoreplies) => {
                if (!autoreplies) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                }
                // 判斷 appId 中是否有目前 autoreplyId
                if (!autoreplies[autoreplyId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                }

                return appsAutorepliesMdl.remove(appId, autoreplyId).then((appsAutoreplies) => {
                    if (!appsAutoreplies) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_REMOVE);
                    }
                    return appsAutoreplies;
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        };
    }

    return new AppsAutorepliesController();
}());
