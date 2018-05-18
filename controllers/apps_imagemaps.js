module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

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
                return appsImagemapsMdl.find(appIds, null);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                }
                return Promise.resolve(appsImagemaps);
            }).then((appsImagemaps) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsImagemaps || {}
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

        getOne(req, res) {
            let imagemapId = req.params.imagemapid;
            let appId;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds;
                if (!imagemapId) {
                    return Promise.reject(API_ERROR.IMAGEMAPID_WAS_EMPTY);
                }
                return appsImagemapsMdl.findImagemaps(appId);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                }
                return Promise.resolve(appsImagemaps);
            }).then((appsImagemaps) => {
                let imagemap = appsImagemaps[imagemapId];
                if (!imagemap) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                }
                return Promise.resolve(appsImagemaps);
            }).then((appsImagemaps) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsImagemaps || {}
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
            let type = req.body.type || '';
            let baseUri = req.body.baseUri || '';
            let altText = req.body.altText || '';
            let baseSize = req.body.baseSize || {};
            let actions = req.body.actions || {};
            let form = req.body.form || '';
            let title = req.body.title || '';
            let appsImagemaps;

            let postImagemap = {
                type,
                baseUri,
                altText,
                baseSize,
                actions,
                form,
                title
            };

            return this.appsRequestVerify(req).then(() => {
                return appsImagemapsMdl.insert(appId, postImagemap);
            }).then((appsImagemaps_) => {
                if (!appsImagemaps_) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_INSERT);
                }
                return appsImagemaps_;
            }).then((appsImagemaps_) => {
                appsImagemaps = appsImagemaps_;
                let imagemaps = appsImagemaps[appId].imagemaps;
                let imagemapId = Object.keys(imagemaps)[0] || '';
                let baseUri = imagemaps[imagemapId].baseUri;
                let fileName = baseUri.split('/').pop();
                let fromPath = `/temp/${fileName}`;
                let toPath = `/apps/${appId}/imagemaps/${imagemapId}/src/${fileName}`;
                return storageHlp.filesMoveV2(fromPath, toPath);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsImagemaps || {}
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
            let imagemapId = req.params.imagemapid;

            let appId = req.params.appid;
            let type = req.body.type || '';
            let baseUri = req.body.baseUri || '';
            let altText = req.body.altText || '';
            let baseSize = req.body.baseSize || {};
            let actions = req.body.actions || {};
            let form = req.body.form || '';
            let title = req.body.title || '';

            let putImagemap = {
                type,
                baseUri,
                altText,
                baseSize,
                actions,
                form,
                title
            };

            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;
                if (!imagemapId) {
                    return Promise.reject(API_ERROR.IMAGEMAPID_WAS_EMPTY);
                }
                return appsImagemapsMdl.findImagemaps(appId);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                }
                let imagemapIds = Object.keys(appsImagemaps);
                return Promise.resolve(imagemapIds);
            }).then((imagemapIds) => {
                if (false === imagemapIds.includes(imagemapId)) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                }
                return Promise.resolve();
            }).then(() => {
                return appsImagemapsMdl.update(appId, imagemapId, putImagemap);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsImagemaps);
            }).then((appsImagemaps) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsImagemaps || {}
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
            let imagemapId = req.params.imagemapid;
            let appId;
            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;
                if (!imagemapId) {
                    return Promise.reject(API_ERROR.IMAGEMAPID_WAS_EMPTY);
                }
                return appsImagemapsMdl.findImagemaps(appId);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                }
                let imagemapIds = Object.keys(appsImagemaps);
                return Promise.resolve(imagemapIds);
            }).then((imagemapIds) => {
                if (false === imagemapIds.includes(imagemapId)) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                }
                return Promise.resolve();
            }).then(() => {
                return appsImagemapsMdl.remove(appId, imagemapId);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_REMOVE);
                }
                return Promise.resolve(appsImagemaps);
            }).then((appsImagemaps) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsImagemaps || {}
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
    return new AppsImagemapsController();
})();
