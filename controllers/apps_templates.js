module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');
    const storageHlp = require('../helpers/storage');

    let appsTemplatesMdl = require('../models/apps_templates');

    class AppsTemplatesController extends ControllerCore {
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
                return appsTemplatesMdl.find(appIds).then((appsTemplates) => {
                    if (!appsTemplates) {
                        return Promise.reject(ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsTemplates);
                });
            }).then((appsTemplates) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTemplates
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let templateId = req.params.templateid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }
                return appsTemplatesMdl.find(appId, templateId);
            }).then((appsTemplates) => {
                if (!(appsTemplates && appsTemplates[appId])) {
                    return Promise.reject(ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                }
                return Promise.resolve(appsTemplates);
            }).then((appsTemplates) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTemplates
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let postTemplate = {
                type: req.body.type || '',
                name: req.body.name || '',
                altText: req.body.altText || '',
                template: req.body.template || ''
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }

                return appsTemplatesMdl.insert(appId, postTemplate).then((appsTemplates) => {
                    if (!appsTemplates || (appsTemplates && 0 === Object.keys(appsTemplates).length)) {
                        return Promise.reject(ERROR.APP_TEMPLATE_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(appsTemplates);
                });
            }).then((appsTemplates) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsTemplates
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let templateId = req.params.templateid;

            let putTemplateData = {};
            ('string' === typeof req.body.type) && (putTemplateData.type = req.body.type);
            ('string' === typeof req.body.name) && (putTemplateData.name = req.body.name);
            ('string' === typeof req.body.altText) && (putTemplateData.altText = req.body.altText);
            ('object' === typeof req.body.template) && (putTemplateData.template = req.body.template);

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }

                if (!templateId) {
                    return Promise.reject(ERROR.TEMPLATEID_WAS_EMPTY);
                }
                return appsTemplatesMdl.update(appId, templateId, putTemplateData);
            }).then((appsTemplate) => {
                if (!appsTemplate) {
                    return Promise.reject(ERROR.APP_TEMPLATE_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsTemplate);
            }).then((appsTemplate) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE,
                    data: appsTemplate
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let templateId = req.params.templateid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }

                if (!templateId) {
                    return Promise.reject(ERROR.TEMPLATEID_WAS_EMPTY);
                }

                return appsTemplatesMdl.remove(appId, templateId).then((appsTemplates) => {
                    if (!(appsTemplates && appsTemplates[appId])) {
                        return Promise.reject(ERROR.APP_TEMPLATE_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsTemplates);
                });
            }).then((appsTemplates) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsTemplates
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new AppsTemplatesController();
})();
