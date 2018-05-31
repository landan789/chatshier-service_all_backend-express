module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsRichmenusMdl = require('../models/apps_richmenus');
    let storageHlp = require('../helpers/storage');

    class AppsRichmenusController extends ControllerCore {
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
                return appsRichmenusMdl.find(appIds, null);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                return Promise.resolve(appsRichmenus);
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        getOne(req, res, next) {
            let richmenuId = req.params.richmenuid;
            let appId;

            return this.appsRequestVerify(req).then((checkedAppId) => {
                if (checkedAppId.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }
                appId = checkedAppId.pop();
                if (!richmenuId) {
                    return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
                };
                return appsRichmenusMdl.findRichmenus(appId);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                let richmenuIds = Object.keys(appsRichmenus);
                return Promise.resolve(richmenuIds);
            }).then((richmenuIds) => { // 判斷appId中是否有目前richmenuId
                if (false === richmenuIds.includes(richmenuId)) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }
                return Promise.resolve();
            }).then(() => {
                return appsRichmenusMdl.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                return Promise.resolve(appsRichmenus);
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        postOne(req, res, next) {
            let appId;
            let appsRichmenus;
            let postRichmenu = {
                size: req.body.size || '',
                name: req.body.name || '',
                selected: req.body.selected || '',
                chatBarText: req.body.chatBarText || '',
                form: req.body.form || '',
                areas: req.body.areas || '',
                src: req.body.src || '',
                platformMenuId: ''
            };

            return this.appsRequestVerify(req).then((checkedAppId) => {
                if (checkedAppId.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }
                appId = checkedAppId.pop();
                return appsRichmenusMdl.insert(appId, postRichmenu);
            }).then((_appsRichmenus) => {
                appsRichmenus = _appsRichmenus;
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_INSERT);
                }
                return Promise.resolve();
            }).then(() => {
                let richmenu = appsRichmenus[appId].richmenus;
                let richmenuId = Object.keys(richmenu)[0] || '';
                let src = richmenu[richmenuId].src;
                let fileName = src.split('/').pop();
                let fromPath = `/temp/${fileName}`;
                let toPath = `/apps/${appId}/richmenus/${richmenuId}/src/${fileName}`;
                return storageHlp.filesMoveV2(fromPath, toPath);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsRichmenus || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        };

        putOne(req, res, next) {
            let richmenuId = req.params.richmenuid;
            let appId;

            let postRichmenu = {
                size: req.body.size || '',
                name: req.body.name || '',
                selected: req.body.selected || '',
                chatBarText: req.body.chatBarText || '',
                form: req.body.form || '',
                areas: req.body.areas || '',
                src: req.body.src || '',
                platformMenuId: ''
            };

            return this.appsRequestVerify(req).then((checkedAppId) => {
                if (checkedAppId.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }
                appId = checkedAppId.pop();
                if (!richmenuId) {
                    return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
                };
                return appsRichmenusMdl.findRichmenus(appId);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                let richmenuIds = Object.keys(appsRichmenus);
                return Promise.resolve(richmenuIds);
            }).then((richmenuIds) => { // 判斷appId中是否有目前richmenuId
                if (false === richmenuIds.includes(richmenuId)) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }
                return Promise.resolve();
            }).then(() => { // 更新目前richmenu
                return appsRichmenusMdl.update(appId, richmenuId, postRichmenu);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsRichmenus);
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsRichmenus || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }

        deleteOne(req, res, next) {
            let richmenuId = req.params.richmenuid;
            let appId;
            return this.appsRequestVerify(req).then((checkedAppId) => {
                if (checkedAppId.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }
                appId = checkedAppId.pop();
                if (!richmenuId) {
                    return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
                };
                return appsRichmenusMdl.findRichmenus(appId);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                let richmenuIds = Object.keys(appsRichmenus);
                return Promise.resolve(richmenuIds);
            }).then((richmenuIds) => { // 判斷appId中是否有目前richmenuId
                if (!richmenuIds.includes(richmenuId)) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }
                return Promise.resolve();
            }).then(() => { // 刪除目前richmenu
                return appsRichmenusMdl.remove(appId, richmenuId, (appsRichmenus) => {
                    if (!appsRichmenus) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsRichmenus);
                });
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsRichmenus || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, res);
            });
        }
    }

    return new AppsRichmenusController();
})();
