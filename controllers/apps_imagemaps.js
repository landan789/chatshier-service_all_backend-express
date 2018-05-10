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

        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsImagemapsMdl.find(appIds, null, (imagemaps) => {
                        if (!imagemaps) {
                            reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                            return;
                        }
                        resolve(imagemaps);
                    });
                });
            }).then((imagemaps) => {
                let result = imagemaps !== undefined ? imagemaps : {};
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

        getOne(req, res, next) {
            let imagemapId = req.params.imagemapid;
            let appId;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds;

                if (!imagemapId) {
                    return Promise.reject(API_ERROR.IMAGEMAPID_WAS_EMPTY);
                }
                return new Promise((resolve, reject) => {
                    appsImagemapsMdl.findImagemaps(appId, (imagemaps) => {
                        if (!imagemaps) {
                            reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                            return;
                        }
                        let imagemapIds = Object.keys(imagemaps);
                        resolve(imagemapIds);
                    });
                });
            }).then((imagemaps) => {
                return new Promise((resolve, reject) => {
                    if (!imagemaps.includes(imagemapId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_IMAGEMAP);
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsImagemapsMdl.find(appId, imagemapId, (imagemap) => {
                        if (!imagemap) {
                            reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_FIND);
                            return;
                        }
                        resolve(imagemap);
                    });
                });
            }).then((imagemap) => {
                let result = imagemap !== undefined ? imagemap : {};
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

        postOne(req, res, next) {
            let appId = req.params.appid;
            let type = req.body.type || '';
            let baseUri = req.body.baseUri || '';
            let altText = req.body.altText || '';
            let baseSize = req.body.baseSize || '';
            let actions = req.body.actions || '';

            let postImagemap = {
                type,
                baseUri,
                altText,
                baseSize,
                actions
            };

            return this.appsRequestVerify(req).then(() => {
                return appsImagemapsMdl.insert(appId, postImagemap);
            }).then((appsImagemaps) => {
                if (!appsImagemaps) {
                    return Promise.reject(API_ERROR.APP_IMAGEMAP_FAILED_TO_INSERT);
                }
                return appsImagemaps;
            }).then((appsImagemaps) => {
                return Promise.resolve().then(() => {
                    let imagemapId = Object.keys(appsImagemaps[appId].imagemaps)[0];
                });
            });
        }
    }
})();
