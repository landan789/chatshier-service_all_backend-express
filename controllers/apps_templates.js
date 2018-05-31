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
            let appId = req.params.appid;
            let keyword = req.body.keyword || '';
            let type = req.body.type || '';
            let altText = req.body.altText || '';
            let template = req.body.template || '';
            let postTemplate = {
                keyword: keyword,
                type: type,
                altText: altText,
                template: template
            };
            return this.appsRequestVerify(req).then(() => {
                return appsTemplatesMdl.insert(appId, postTemplate);
            }).then((appsTemplates) => {
                if (!appsTemplates) {
                    return Promise.reject(API_ERROR.APP_TEMPLATE_FAILED_TO_INSERT);
                }
                return appsTemplates;
            }).then((appsTemplates) => {
                let templateId = Object.keys(appsTemplates[appId].templates)[0];
                if (appsTemplates[appId].templates[templateId].template.thumbnailImageUrl) {
                    let fromPathArray = (appsTemplates[appId].templates[templateId].template.thumbnailImageUrl).split('/');
                    let src = fromPathArray[fromPathArray.length - 1];
                    let fromPath = `/temp/${src}`;
                    let toPath = `/apps/${appId}/template/${templateId}/src/${src}`;
                    storageHlp.filesMoveV2(fromPath, toPath);
                    return appsTemplates;
                }
                return Promise.all(Object.keys(appsTemplates[appId].templates[templateId].template.columns).map((img) => {
                    let fromPathArray = (appsTemplates[appId].templates[templateId].template.columns[img].thumbnailImageUrl).split('/');
                    let src = fromPathArray[fromPathArray.length - 1];
                    let fromPath = `/temp/${src}`;
                    let toPath = `/apps/${appId}/template/${templateId}/src/${src}`;
                    storageHlp.filesMoveV2(fromPath, toPath);
                    return appsTemplates;
                }));
            }).then((appsTemplates) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsTemplates || {}
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
            let templateId = req.params.templateid;
            let appId;
            let type = req.body.type || '';
            let keyword = req.body.keyword || '';
            let altText = req.body.altText || '';
            let template = req.body.template || '';
            let putTemplateData = {
                type: type,
                keyword: keyword,
                altText: altText,
                template: template
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
    return new AppsTemplatesController();
})();
