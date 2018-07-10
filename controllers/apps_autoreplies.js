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
                    return Promise.resolve(appsAutoreplies);
                });
            }).then((appsAutoreplies) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAutoreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
                    return Promise.resolve(appsAutoreplies);
                });
            }).then((appsAutoreplies) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAutoreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res, next) {
            let appId = req.params.appid;
            let postAutoreply = {
                type: req.body.type || '',
                title: req.body.title || '',
                startedTime: undefined !== req.body.startedTime ? req.body.startedTime : 0,
                endedTime: undefined !== req.body.endedTime ? req.body.endedTime : 0,
                timezoneOffset: undefined !== req.body.timezoneOffset ? req.body.timezoneOffset : 0,
                text: req.body.text || '',
                periods: req.body.periods || [],
                src: req.body.src || '',
                template_id: req.body.template_id || '',
                imagemap_id: req.body.imagemap_id || ''
            };

            return this.appsRequestVerify(req).then(() => {
                if (!postAutoreply.title) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_TITLE_WAS_EMPTY);
                }

                return appsAutorepliesMdl.insert(appId, postAutoreply).then((appsAutoreplies) => {
                    if (!appsAutoreplies) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsAutoreplies);
                });
            }).then((appsAutoreplies) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsAutoreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let autoreplyId = req.params.autoreplyid;
            let putAutoreply = {};
            ('string' === typeof req.body.type) && (putAutoreply.type = req.body.type);
            ('string' === typeof req.body.title) && (putAutoreply.title = req.body.title);
            ('number' === typeof req.body.startedTime) && (putAutoreply.startedTime = req.body.startedTime);
            ('number' === typeof req.body.endedTime) && (putAutoreply.endedTime = req.body.endedTime);
            ('string' === typeof req.body.text) && (putAutoreply.text = req.body.text);
            ('number' === typeof req.body.timezoneOffset) && (putAutoreply.timezoneOffset = req.body.timezoneOffset);
            (req.body.periods instanceof Array) && (putAutoreply.periods = req.body.periods);
            ('string' === typeof req.body.src) && (putAutoreply.src = req.body.src);
            ('string' === typeof req.body.template_id) && (putAutoreply.template_id = req.body.template_id);
            ('string' === typeof req.body.imagemap_id) && (putAutoreply.imagemap_id = req.body.imagemap_id);

            return this.appsRequestVerify(req).then(() => {
                if (!autoreplyId) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_AUTOREPLYID_WAS_EMPTY);
                }

                if (!putAutoreply.title) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_TITLE_WAS_EMPTY);
                }

                return appsAutorepliesMdl.findAutoreplies(appId).then((autoreplies) => {
                    if (!autoreplies) {
                        return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                    }

                    // 判斷 autoreplies 中是否有目前 autoreplyId
                    if (!autoreplies[autoreplyId]) {
                        return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    }

                    return appsAutorepliesMdl.update(appId, autoreplyId, putAutoreply).then((appsAutoreplies) => {
                        if (!(appsAutoreplies && appsAutoreplies[appId])) {
                            return Promise.reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_UPDATE);
                        }
                        return Promise.resolve(appsAutoreplies);
                    });
                });
            }).then((appsAutoreplies) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAutoreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
                    return Promise.resolve(appsAutoreplies);
                });
            }).then((appsAutoreplies) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAutoreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }

    return new AppsAutorepliesController();
}());
