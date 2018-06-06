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
                return appsTemplatesMdl.find(appIds).then((appsTemplates) => {
                    if (!appsTemplates) {
                        return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                    }
                    return appsTemplates;
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
                    return Promise.reject(API_ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }
                return appsTemplatesMdl.find(appId, templateId);
            }).then((appsTemplates) => {
                if (!appsTemplates) {
                    return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                }
                return appsTemplates;
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
                keyword: req.body.keyword || '',
                type: req.body.type || '',
                altText: req.body.altText || '',
                template: req.body.template || ''
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }

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
                    // return Promise.all(template.template.columns.map((column) => {
                    //     if (!column.thumbnailImageUrl) {
                    //         return Promise.resolve();
                    //     }

                    //     let fromPathArray = column.thumbnailImageUrl.split('/');
                    //     let src = fromPathArray[fromPathArray.length - 1];
                    //     let fromPath = `/temp/${src}`;
                    //     let toPath = `/apps/${appId}/template/${templateId}/src/${src}`;
                    //     return storageHlp.filesMoveV2(fromPath, toPath);
                    // })).then(() => {
                    //     return appsTemplates;
                    // });
                    let columns = template.template.columns;
                    let handleColumns = (i) => {
                        if ((columns.length - 1) < i) {
                            return Promise.resolve(appsTemplates);
                        }
                        let fromPathArray = columns[i].thumbnailImageUrl.split('/');
                        let src = fromPathArray[fromPathArray.length - 1];
                        let fromPath = `/temp/${src}`;
                        let toPath = `/apps/${appId}/template/${templateId}/src/${src}`;
                        return storageHlp.filesMoveV2(fromPath, toPath).then(() => {
                            return handleColumns(++i);
                        });
                    };
                    return handleColumns(0);
                }
                return appsTemplates;
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

            let putTemplateData = {
                type: req.body.type || '',
                keyword: req.body.keyword || '',
                altText: req.body.altText || '',
                template: req.body.template || ''
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }

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
                    return Promise.reject(API_ERROR.TEMPLATE_HAS_TWO_OR_MORE_IDS);
                }

                if (!templateId) {
                    return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
                }

                return appsTemplatesMdl.remove(appId, templateId).then((appsTemplates) => {
                    if (!(appsTemplates && appsTemplates[appId])) {
                        return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_REMOVE);
                    }
                    return appsTemplates;
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
