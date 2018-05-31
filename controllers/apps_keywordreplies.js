module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsKeywordrepliesMdl = require('../models/apps_keywordreplies');

    class AppsKeywordrepliesController extends ControllerCore {
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
                return appsKeywordrepliesMdl.find(appIds).then((appsKeywordreplies) => {
                    if (!appsKeywordreplies) {
                        return Promise.reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                    }
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsKeywordreplies
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let keywordreplyId = req.params.keywordreplyid;

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.find(appId, keywordreplyId).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                    }
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsKeywordreplies
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let postKeywordreply = {
                keyword: req.body.keyword || '',
                subKeywords: req.body.subKeywords || '',
                text: req.body.text || '',
                replyCount: req.body.replyCount ? req.body.replyCount : 0,
                status: !!req.body.status
            };

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.insert(appId, postKeywordreply).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_INSERT);
                    }
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsKeywordreplies
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let keywordreplyId = req.params.keywordreplyid;
            let putKeywordreply = {
                keyword: req.body.keyword || '',
                subKeywords: req.body.subKeywords || '',
                text: req.body.text || '',
                replyCount: 0,
                status: !!req.body.status
            };

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.update(appId, keywordreplyId, putKeywordreply).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_UPDATE);
                    }
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsKeywordreplies
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let keywordreplyId = req.params.keywordreplyid;

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.remove(appId, keywordreplyId).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(API_ERROR.APP_KEYWORDREPLY_FAILED_TO_REMOVE);
                    }
                    return appsKeywordreplies;
                });
            }).then((appsKeywordreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsKeywordreplies
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        };
    }

    return new AppsKeywordrepliesController();
})();
