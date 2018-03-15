module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    let util = require('util');

    let controllerCre = require('../cores/controller');

    const appsTemplatesMdl = require('../models/apps_templates');
    const appsMdl = require('../models/apps');
    const usersMdl = require('../models/users');
    const groupsMdl = require('../models/groups');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const DELETE = 'DELETE';

    function AppsTemplatesController() {}
    util.inherits(AppsTemplatesController, controllerCre.constructor);

    AppsTemplatesController.prototype.getAll = function(req, res, next) {
        return AppsTemplatesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsTemplatesMdl.findAll(appIds, (data) => {
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
    };

    AppsTemplatesController.prototype.getOne = (req, res) => {
        let templateId = req.params.templateid;
        let appIds = '';
        return AppsTemplatesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsTemplatesMdl.findOne(appIds, templateId, (data) => {
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
    };

    AppsTemplatesController.prototype.postOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');

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
        return AppsTemplatesController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
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
    };

    AppsTemplatesController.prototype.putOne = (req, res) => {
        let templateId = req.params.templateid;
        let appId = '';
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
        return AppsTemplatesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;
            if (!templateId) {
                return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => {
                appsTemplatesMdl.update(appId, templateId, putTemplateData, (AppsTemplate) => {
                    if (false === AppsTemplate) {
                        reject(API_ERROR.APP_TEMPLATE_FAILED_TO_UPDATE);
                    }
                    resolve(AppsTemplate);
                });
            });
        }).then((AppsTemplate) => {
            let result = AppsTemplate !== undefined ? AppsTemplate : {};
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
    };

    AppsTemplatesController.prototype.deleteOne = (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let templateId = req.params.templateid;
        let appId = '';
        return AppsTemplatesController.prototype.AppsRequestVerify(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!templateId) {
                return Promise.reject(API_ERROR.TEMPLATEID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => {
                appsTemplatesMdl.remove(appId, templateId, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_TEMPLATE_FAILED_TO_REMOVE);
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
    };

    return new AppsTemplatesController();
})();
