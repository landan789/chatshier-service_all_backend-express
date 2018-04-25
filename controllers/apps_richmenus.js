module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');

    let util = require('util')

    let controllerCre = require('../cores/controller');

    const storageHlp = require('../helpers/storage');

    const appsRichmenusMdl = require('../models/apps_richmenus');

    function AppsRichmenusController() {};

    util.inherits(AppsRichmenusController, controllerCre.constructor);

    AppsRichmenusController.prototype.getAll = (req, res, next) => {
        return AppsRichmenusController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            let appIds = checkedAppIds;
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.find(appIds, null, (richmenus) => {
                    if (!richmenus) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                        return;
                    }
                    resolve(richmenus);
                });
            });
        }).then((richmenus) => {
            let result = richmenus !== undefined ? richmenus : {};
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

    AppsRichmenusController.prototype.getOne = (req, res, next) => {
        let richmenuId = req.params.richmenuid;
        let appId = '';

        return AppsRichmenusController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds;

            if (!richmenuId) {
                return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有richmenuIds
                appsRichmenusMdl.findRichmenus(appId, (richmenus) => {
                    if (!richmenus) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                        return;
                    }
                    var richmenuIds = Object.keys(richmenus);
                    resolve(richmenuIds);
                });
            });
        }).then((richmenuIds) => { // 判斷appId中是否有目前richmenuId
            return new Promise((resolve, reject) => {
                if (false === richmenuIds.includes(richmenuId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.find(appId, richmenuId, (richmenu) => {
                    if (!richmenu) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                        return;
                    }
                    resolve(richmenu);
                });
            });
        }).then((richmenu) => {
            let result = richmenu !== undefined ? richmenu : {};
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

    AppsRichmenusController.prototype.postOne = (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        let appId = '';

        var postRichmenu = {
            size: req.body.size || '',
            name: req.body.name || '',
            selected: req.body.selected || '',
            chatBarText: req.body.chatBarText || '',
            form: req.body.form || '',
            areas: req.body.areas || '',
            src: req.body.src || '',
            platformMenuId: ''
        };

        return AppsRichmenusController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appId = checkedAppIds[0];
            return appsRichmenusMdl.insert(appId, postRichmenu);
        }).then((appsRichmenu) => {
            if (!appsRichmenu) {
                Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_INSERT);
                return;
            }

            let richmenu = appsRichmenu[appId].richmenus;
            let richmenuId = Object.keys(richmenu)[0] || '';
            let src = richmenu[richmenuId].src;
            let fileName = src.split('/').pop();
            let fromPath = `/temp/${fileName}`;
            let toPath = `/apps/${appId}/richmenus/${richmenuId}/src/${fileName}`;
            return Promise.all([
                appsRichmenu,
                storageHlp.filesMoveV2(fromPath, toPath)
            ]);
        }).then((results) => {
            let appsRichmenu = results[0];
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: appsRichmenu
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsRichmenusController.prototype.putOne = (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
        let richmenuId = req.params.richmenuid;
        let appIds = '';

        var postRichmenu = {
            size: req.body.size || '',
            name: req.body.name || '',
            selected: req.body.selected || '',
            chatBarText: req.body.chatBarText || '',
            form: req.body.form || '',
            areas: req.body.areas || '',
            src: req.body.src || '',
            platformMenuId: ''
        };

        return AppsRichmenusController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appIds = checkedAppIds;

            if (!richmenuId) {
                return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有richmenuIds
                appsRichmenusMdl.findRichmenus(appIds, (richmenus) => {
                    if (!richmenus) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                        return;
                    }
                    let richmenuIds = Object.keys(richmenus);
                    resolve(richmenuIds);
                });
            });
        }).then((richmenuIds) => { // 判斷appId中是否有目前richmenuId
            return new Promise((resolve, reject) => {
                if (false === richmenuIds.includes(richmenuId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                    return;
                }
                resolve();
            });
        }).then(() => { // 更新目前richmenu
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.update(appIds, richmenuId, postRichmenu, (richmenu) => {
                    if (false === richmenu) {
                        reject(API_ERROR.RICHMENU_UPDATE_FAIL);
                    }
                    resolve(richmenu);
                });
            });
        }).then((richmenu) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: richmenu
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsRichmenusController.prototype.deleteOne = (req, res, next) => {
        let richmenuId = req.params.richmenuid;
        let appIds = '';
        return AppsRichmenusController.prototype.AppsRequestVerify(req).then((checkedAppIds) => {
            appIds = checkedAppIds;

            if (!richmenuId) {
                return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有richmenuIds
                appsRichmenusMdl.findRichmenus(appIds, (richmenus) => {
                    if (!richmenus) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                        return;
                    }
                    var richmenuIds = Object.keys(richmenus);
                    resolve(richmenuIds);
                });
            });
        }).then((richmenuIds) => { // 判斷appId中是否有目前richmenuId
            return new Promise((resolve, reject) => {
                if (false === richmenuIds.includes(richmenuId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                    return;
                }
                resolve();
            });
        }).then(() => { // 刪除目前richmenu
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.remove(appIds, richmenuId, (richmenu) => {
                    if (!richmenu) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_REMOVE);
                    }
                    resolve(richmenu);
                });
            });
        }).then((richmenu) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                data: richmenu
            };
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                status: 0,
                msg: ERR.MSG,
                code: ERR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AppsRichmenusController();
})();
