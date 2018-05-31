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
                return appsRichmenusMdl.find(appIds).then((appsRichmenus) => {
                    if (!appsRichmenus) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        }

        getOne(req, res, next) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }

                if (!richmenuId) {
                    return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
                }

                return appsRichmenusMdl.findRichmenus(appId).then((richmenus) => {
                    if (!richmenus) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                    }

                    // 判斷 richmenus 中是否有目前 richmenuId
                    if (!richmenus[richmenuId]) {
                        return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                    }
                    return richmenus;
                });
            }).then(() => {
                return appsRichmenusMdl.find(appId, richmenuId).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        }

        postOne(req, res, next) {
            let appId = req.params.appid;
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

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }

                return appsRichmenusMdl.insert(appId, postRichmenu).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_INSERT);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let richmenus = appsRichmenus[appId].richmenus;
                let richmenuId = Object.keys(richmenus).shift() || '';
                let src = richmenus[richmenuId].src;
                let fileName = src.split('/').pop();
                let fromPath = `/temp/${fileName}`;
                let toPath = `/apps/${appId}/richmenus/${richmenuId}/src/${fileName}`;

                return storageHlp.filesMoveV2(fromPath, toPath).then(() => {
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsRichmenus
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        };

        putOne(req, res, next) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            let putRichmenu = {
                size: req.body.size || '',
                name: req.body.name || '',
                selected: req.body.selected || '',
                chatBarText: req.body.chatBarText || '',
                form: req.body.form || '',
                areas: req.body.areas || '',
                src: req.body.src || '',
                platformMenuId: ''
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }

                if (!richmenuId) {
                    return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
                }
                return appsRichmenusMdl.findRichmenus(appId);
            }).then((richmenus) => {
                if (!richmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }

                // 判斷 richmenus 中是否有目前 richmenuId
                if (richmenus[richmenuId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }

                // 更新目前 richmenu
                return appsRichmenusMdl.update(appId, richmenuId, putRichmenu).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsRichmenus
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        }

        deleteOne(req, res, next) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }

                if (!richmenuId) {
                    return Promise.reject(API_ERROR.RICHMENUID_WAS_EMPTY);
                }
                return appsRichmenusMdl.findRichmenus(appId);
            }).then((richmenus) => {
                if (!richmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }

                // 判斷 richmenus 中是否有目前 richmenuId
                if (!richmenus[richmenuId]) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }

                // 刪除目前 richmenu
                return appsRichmenusMdl.remove(appId, richmenuId).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_REMOVE);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsRichmenus || {}
                };
                res.status(200).json(json);
            }).catch((err) => {
                return this.errorJson(err, null, res);
            });
        }
    }

    return new AppsRichmenusController();
})();
