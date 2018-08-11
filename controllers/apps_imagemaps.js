module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/success.json');

    let appsImagemapsMdl = require('../models/apps_imagemaps');
    let storageHlp = require('../helpers/storage');

    class AppsImagemapsController extends ControllerCore {
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
                return appsImagemapsMdl.find(appIds).then((appsImagemaps) => {
                    if (!appsImagemaps) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsImagemaps);
                });
            }).then((appsImagemaps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsImagemaps || {}
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getOne(req, res) {
            let appId = req.params.appid;
            let imagemapId = req.params.imagemapid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.IMAGEMAP_HAD_MORE_THAN_2_IDS);
                }

                if (!imagemapId) {
                    return Promise.reject(ERROR.IMAGEMAPID_WAS_EMPTY);
                }

                return appsImagemapsMdl.findImagemaps(appId).then((appsImagemaps) => {
                    if (!appsImagemaps) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                    }

                    if (!appsImagemaps[imagemapId]) {
                        return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                    }

                    return Promise.resolve(appsImagemaps);
                });
            }).then((appsImagemaps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsImagemaps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let type = req.body.type || '';
            let baseUrl = req.body.baseUrl || '';
            let altText = req.body.altText || '';
            let baseSize = req.body.baseSize || {};
            let actions = req.body.actions || {};
            let form = req.body.form || '';
            let title = req.body.title || '';
            let appsImagemaps;

            let postImagemap = {
                type,
                baseUrl,
                altText,
                baseSize,
                actions,
                form,
                title
            };

            return this.appsRequestVerify(req).then(() => {
                return appsImagemapsMdl.insert(appId, postImagemap).then((_appsImagemaps) => {
                    if (!_appsImagemaps) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_INSERT);
                    }
                    return Promise.resolve(_appsImagemaps);
                });
            }).then((_appsImagemaps) => {
                appsImagemaps = _appsImagemaps;
                let imagemaps = appsImagemaps[appId].imagemaps;
                let imagemapId = Object.keys(imagemaps)[0] || '';
                let baseUrl = imagemaps[imagemapId].baseUrl;
                let fileName = baseUrl.split('/').pop();
                let fromPath = `/temp/${fileName}`;
                let toPath = `/apps/${appId}/imagemaps/${imagemapId}/src/${fileName}`;
                return storageHlp.filesMoveV2(fromPath, toPath);
            }).then(() => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsImagemaps || {}
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let imagemapId = req.params.imagemapid;

            let type = req.body.type || '';
            let baseUrl = req.body.baseUrl || '';
            let altText = req.body.altText || '';
            let baseSize = req.body.baseSize || {};
            let actions = req.body.actions || {};
            let form = req.body.form || '';
            let title = req.body.title || '';

            let putImagemap = {
                type,
                baseUrl,
                altText,
                baseSize,
                actions,
                form,
                title
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.IMAGEMAP_HAD_MORE_THAN_2_IDS);
                }

                if (!imagemapId) {
                    return Promise.reject(ERROR.IMAGEMAPID_WAS_EMPTY);
                }

                return appsImagemapsMdl.findImagemaps(appId).then((imagemaps) => {
                    if (!imagemaps) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                    }

                    if (!imagemaps[imagemapId]) {
                        return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                    }

                    return Promise.resolve(imagemaps);
                });
            }).then(() => {
                return appsImagemapsMdl.update(appId, imagemapId, putImagemap).then((appsImagemaps) => {
                    if (!(appsImagemaps && appsImagemaps[appId])) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_UPDATE);
                    }
                    return Promise.resolve(appsImagemaps);
                });
            }).then((appsImagemaps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsImagemaps
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let imagemapId = req.params.imagemapid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(ERROR.IMAGEMAP_HAD_MORE_THAN_2_IDS);
                }

                if (!imagemapId) {
                    return Promise.reject(ERROR.IMAGEMAPID_WAS_EMPTY);
                }
                return appsImagemapsMdl.findImagemaps(appId).then((imagemaps) => {
                    if (!imagemaps) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                    }

                    if (!imagemaps[imagemapId]) {
                        return Promise.reject(ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                    }

                    return Promise.resolve(imagemaps);
                });
            }).then(() => {
                return appsImagemapsMdl.remove(appId, imagemapId).then((appsImagemaps) => {
                    if (!(appsImagemaps && appsImagemaps[appId])) {
                        return Promise.reject(ERROR.APP_IMAGEMAP_FAILED_TO_REMOVE);
                    }
                    return Promise.resolve(appsImagemaps);
                });
            }).then((appsImagemaps) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsImagemaps || {}
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new AppsImagemapsController();
})();
