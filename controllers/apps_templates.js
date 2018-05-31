module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
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
                return appsTemplatesMdl.find(appIds);
            }).then((appsTemplates) => {
                if (!appsTemplates) {
                    return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                }
                return appsTemplates;
            }).then((appsTemplates) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTemplates || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let templateId = req.params.templateid;

            return this.appsRequestVerify(req).then(() => {
                return appsTemplatesMdl.find(appId, templateId);
            }).then((appsTemplates) => {
                if (!appsTemplates) {
                    return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                }
                return appsTemplates;
            }).then((appsTemplates) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsTemplates || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let postTemplate = {
                keyword: req.body.keyword || '',
                type: req.body.type || '',
                altText: req.body.altText || '',
                template: req.body.template || ''
            };

            return this.appsRequestVerify(req).then(() => {
                return appsTemplatesMdl.insert(appId, postTemplate).then((appsTemplates) => {
                    if (!appsTemplates || (appsTemplates && 0 === Object.keys(appsTemplates).length)) {
                        return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_INSERT);
                    }
                    return appsTemplates;
                });
            }).then((appsTemplates) => {
                let templateId = Object.keys(appsTemplates[appId].templates)[0];
                let template = appsTemplates[appId].templates[templateId];

                if (template.template.thumbnailImageUrl) {
                    let fromPathArray = template.template.thumbnailImageUrl.split('/');
                    let src = fromPathArray[fromPathArray.length - 1];
                    let fromPath = `/temp/${src}`;
                    let toPath = `/apps/${appId}/template/${templateId}/src/${src}`;
                    return storageHlp.filesMoveV2(fromPath, toPath).then(() => {
                        return appsTemplates;
                    });
                } else if (template.template.columns) {
                    return Promise.all(template.template.columns.map((column) => {
                        if (!column.thumbnailImageUrl) {
                            return Promise.resolve();
                        }

                        let fromPathArray = column.thumbnailImageUrl.split('/');
                        let src = fromPathArray[fromPathArray.length - 1];
                        let fromPath = `/temp/${src}`;
                        let toPath = `/apps/${appId}/template/${templateId}/src/${src}`;
                        return storageHlp.filesMoveV2(fromPath, toPath);
                    })).then(() => {
                        return appsTemplates;
                    });
                }
                return appsTemplates;
            }).then((appsTemplates) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsTemplates || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let templateId = req.params.templateid;

            let putTemplateData = {
                type: req.body.type || '',
                keyword: req.body.keyword || '',
                altText: req.body.altText || '',
                template: req.body.template || ''
            };

            return this.appsRequestVerify(req).then((checkedAppId) => {
                if (checkedAppId.length >= 2) {
                    return Promise.reject(API_ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }
                appId = checkedAppId.pop();
                if (!templateId) {
                    return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
                }
                return appsTemplatesMdl.update(appId, templateId, putTemplateData);
            }).then((appsTemplate) => {
                if (!appsTemplate) {
                    return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsTemplate);
            }).then((appsTemplate) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE,
                    data: appsTemplate || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }

        deleteOne(req, res) {
            let templateId = req.params.templateid;
            let appId;
            return this.appsRequestVerify(req).then((checkedAppId) => {
                if (checkedAppId.length >= 2) {
                    return Promise.reject(API_ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }
                appId = checkedAppId.pop();
                if (!templateId) {
                    return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
                };
                return appsTemplatesMdl.remove(appId, templateId);
            }).then((appsTemplates) => {
                if (!appsTemplates) {
                    return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_REMOVE);
                }
                return Promise.resolve(appsTemplates);
            }).then((appsTemplates) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
                    data: appsTemplates || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorHandler(err, res);
            });
        }
    }
    return new AppsTemplatesController();
})();
