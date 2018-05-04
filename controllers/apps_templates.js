module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const DELETE = 'DELETE';

    let appsTemplatesMdl = require('../models/apps_templates');
    let appsMdl = require('../models/apps');
    let usersMdl = require('../models/users');
    let groupsMdl = require('../models/groups');

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
                return new Promise((resolve, reject) => {
                    appsTemplatesMdl.find(appIds, null, (data) => {
                        if (undefined === data || null === data || '' === data) {
                            reject(API_ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
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
            let templateId = req.params.templateid;
            let appIds;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appIds = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsTemplatesMdl.find(appIds, templateId, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_TEMPLATE_FAILED_TO_FIND);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((template) => {
                let result = template !== undefined ? template : {};
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
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appId = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsTemplatesMdl.insert(appId, postTemplate, (result) => {
                        if (!result) {
                            reject(API_ERROR.APP_TEMPLATE_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve(result);
                    });
                });
            }).then((template) => {
                let result = template !== undefined ? template : {};
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
                appId = checkedAppId;
                if (!templateId) {
                    return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
                };
                return new Promise((resolve, reject) => {
                    appsTemplatesMdl.update(appId, templateId, putTemplateData, (appsTemplate) => {
                        if (!appsTemplate) {
                            reject(API_ERROR.APP_TEMPLATE_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve(appsTemplate);
                    });
                });
            }).then((appsTemplate) => {
                let result = appsTemplate !== undefined ? appsTemplate : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE,
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

        deleteOne(req, res) {
            let templateId = req.params.templateid;
            let appId;
            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;

                if (!templateId) {
                    return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
                };
                return new Promise((resolve, reject) => {
                    appsTemplatesMdl.remove(appId, templateId, (result) => {
                        if (!result) {
                            reject(API_ERROR.APP_TEMPLATE_FAILED_TO_REMOVE);
                            return;
                        }
                        resolve(result);
                    });
                });
            }).then((AppsTemplate) => {
                let result = AppsTemplate !== undefined ? AppsTemplate : {};
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE,
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
    }

    return new AppsTemplatesController();
})();
