module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

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
                        return Promise.reject(ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsKeywordreplies);
                });
            }).then((appsKeywordreplies) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsKeywordreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let keywordreplyId = req.params.keywordreplyid;

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.find(appId, keywordreplyId).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(ERROR.APP_KEYWORDREPLY_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsKeywordreplies);
                });
            }).then((appsKeywordreplies) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsKeywordreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;

            let postKeywordreply = {
                keyword: req.body.keyword || '',
                subKeywords: req.body.subKeywords || [],
                type: req.body.type || '',
                text: req.body.text || '',
                status: !!req.body.status,
                src: req.body.src || '',
                template_id: req.body.template_id || '',
                imagemap_id: req.body.imagemap_id || ''
            };

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.insert(appId, postKeywordreply).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(ERROR.APP_KEYWORDREPLY_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsKeywordreplies);
                });
            }).then((appsKeywordreplies) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsKeywordreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let keywordreplyId = req.params.keywordreplyid;

            let putKeywordreply = {};
            ('string' === typeof req.body.type) && (putKeywordreply.type = req.body.type);
            ('string' === typeof req.body.keyword) && (putKeywordreply.keyword = req.body.keyword);
            (req.body.subKeywords instanceof Array) && (putKeywordreply.subKeywords = req.body.subKeywords);
            ('string' === typeof req.body.text) && (putKeywordreply.text = req.body.text);
            ('boolean' === typeof req.body.status) && (putKeywordreply.status = req.body.status);
            ('string' === typeof req.body.src) && (putKeywordreply.src = req.body.src);
            ('string' === typeof req.body.template_id) && (putKeywordreply.template_id = req.body.template_id);
            ('string' === typeof req.body.imagemap_id) && (putKeywordreply.imagemap_id = req.body.imagemap_id);

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.update(appId, keywordreplyId, putKeywordreply).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(ERROR.APP_KEYWORDREPLY_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsKeywordreplies);
                });
            }).then((appsKeywordreplies) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsKeywordreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let keywordreplyId = req.params.keywordreplyid;

            return this.appsRequestVerify(req).then(() => {
                return appsKeywordrepliesMdl.remove(appId, keywordreplyId).then((appsKeywordreplies) => {
                    if (!(appsKeywordreplies && appsKeywordreplies[appId])) {
                        return Promise.reject(ERROR.APP_KEYWORDREPLY_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsKeywordreplies);
                });
            }).then((appsKeywordreplies) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsKeywordreplies
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };
    }

    return new AppsKeywordrepliesController();
})();
