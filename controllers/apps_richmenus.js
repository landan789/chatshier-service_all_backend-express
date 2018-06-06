module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsRichmenusMdl = require('../models/apps_richmenus');
    let storageHlp = require('../helpers/storage');
    let botSvc = require('../services/bot');

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
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        /**
         * 由於有夾帶檔案，POST 的方式與其他 POST 不同，是使用 form-data 的資料
         * 所有的 req.body 內容，都會是字串型態
         */
        postOne(req, res, next) {
            let appId = req.params.appid;

            let richmentImgFile = req.body.file;
            let richmentImgFileName = req.body.fileName || '';
            let richmentImgMimeType = req.body.mimeType || 'image/jpeg';

            let fileNameSplits = richmentImgFileName.split('.');
            let fileNameNoExt = fileNameSplits.shift();
            let fileExt = fileNameSplits.pop();
            richmentImgFileName = `${fileNameNoExt}_${Date.now()}.${fileExt}`;
            let tempFilePath = `${storageHlp.tempPath}/${richmentImgFileName}`;
            /** @type {Buffer} */
            let fileBinary;

            let postRichmenu = {
                size: JSON.parse(req.body.size) || {},
                name: req.body.name || '',
                selected: 'true' === ('' + req.body.selected),
                chatBarText: req.body.chatBarText || '',
                form: req.body.form || '',
                areas: JSON.parse(req.body.areas) || [],
                platformMenuId: req.body.platformMenuId || ''
            };

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                if (checkedAppIds.length >= 2) {
                    return Promise.reject(API_ERROR.RICHMENU_HAS_TWO_OR_MORE_IDS);
                }

                if (!postRichmenu.platformMenuId) {
                    if (!(richmentImgFile && richmentImgFileName)) {
                        return Promise.reject(API_ERROR.BOT_FAILED_TO_UPLOAD_IMAGE);
                    }

                    // 將上傳的圖像檔案 stream 讀取成 buffer 後釋放 stream 資源
                    // 將此 binary buffer 同時上傳到 storage 以及設定 LINE richmenu
                    return storageHlp.streamToBuffer(richmentImgFile, true).then((_fileBinary) => {
                        fileBinary = _fileBinary;
                        let fileSize = fileBinary.length / (1024 * 1024);
                        // 限定 richmenu 的圖檔大小在 1 MB 以下
                        if (fileSize > 1) {
                            return Promise.reject(API_ERROR.BOT_UPLOAD_IMAGE_TOO_LARGE);
                        }
                        return storageHlp.filesUpload(tempFilePath, fileBinary);
                    }).then(() => {
                        return storageHlp.sharingCreateSharedLink(tempFilePath);
                    }).then((url) => {
                        postRichmenu.src = url;
                        return botSvc.createRichMenu(postRichmenu, appId);
                    }).then((platformMenuId) => {
                        postRichmenu.platformMenuId = platformMenuId;
                        return botSvc.setRichMenuImage(platformMenuId, fileBinary, richmentImgMimeType, appId);
                    });
                }

                return botSvc.getRichMenuImage(postRichmenu.platformMenuId, appId).then((imageBuffer) => {
                    richmentImgFileName = `${postRichmenu.platformMenuId}.jpg`;
                    tempFilePath = `${storageHlp.tempPath}/${richmentImgFileName}`;
                    return storageHlp.filesUpload(tempFilePath, imageBuffer);
                }).then(() => {
                    return storageHlp.sharingCreateSharedLink(tempFilePath);
                }).then((url) => {
                    postRichmenu.src = url;
                });
            }).then(() => {
                return appsRichmenusMdl.insert(appId, postRichmenu).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_INSERT);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let richmenuId = Object.keys(appsRichmenus[appId].richmenus).shift() || '';
                let toPath = `/apps/${appId}/richmenus/${richmenuId}/src/${richmentImgFileName}`;
                return storageHlp.filesMoveV2(tempFilePath, toPath).then(() => {
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        /**
         * 由於有夾帶檔案，POST 的方式與其他 POST 不同，是使用 form-data 的資料
         * 所有的 req.body 內容，都會是字串型態
         */
        putOne(req, res, next) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            let richmentImgFile = req.body.file;
            let richmentImgFileName = req.body.fileName || '';
            let richmentImgMimeType = req.body.mimeType || 'image/jpeg';

            let putRichmenu = {
                size: JSON.parse(req.body.size) || {},
                name: req.body.name || '',
                selected: 'true' === ('' + req.body.selected),
                chatBarText: req.body.chatBarText || '',
                form: req.body.form || '',
                areas: JSON.parse(req.body.areas) || [],
                src: req.body.src || ''
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
                let richmenu = richmenus[richmenuId];
                if (!richmenu) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }

                putRichmenu.size = putRichmenu.size || richmenu.size;
                putRichmenu.name = putRichmenu.name || richmenu.name;
                putRichmenu.selected = putRichmenu.selected || richmenu.selected;
                putRichmenu.chatBarText = putRichmenu.chatBarText || richmenu.chatBarText;
                putRichmenu.form = putRichmenu.form || richmenu.form;
                putRichmenu.areas = putRichmenu.areas || richmenu.areas;
                putRichmenu.src = richmenu.src;
                putRichmenu.platformMenuId = richmenu.platformMenuId;

                // 如果有則直接使用圖檔上傳
                if (richmentImgFile && richmentImgFileName) {
                    // 將上傳的圖像檔案 stream 讀取成 buffer 後釋放 stream 資源
                    // 將此 binary 設定到 LINE richmenu
                    return storageHlp.streamToBuffer(richmentImgFile, true).then((fileBinary) => {
                        let fileSize = fileBinary.length / (1024 * 1024);
                        // 限定 richmenu 的圖檔大小在 1 MB 以下
                        if (fileSize > 1) {
                            return Promise.reject(API_ERROR.BOT_UPLOAD_IMAGE_TOO_LARGE);
                        }

                        let fileNameSplits = richmentImgFileName.split('.');
                        let fileNameNoExt = fileNameSplits.shift();
                        let fileExt = fileNameSplits.pop();
                        richmentImgFileName = `${fileNameNoExt}_${Date.now()}.${fileExt}`;
                        let uploadFilePath = `/apps/${appId}/richmenus/${richmenuId}/src/${richmentImgFileName}`;

                        return storageHlp.filesUpload(uploadFilePath, fileBinary).then(() => {
                            return storageHlp.sharingCreateSharedLink(uploadFilePath);
                        }).then((url) => {
                            putRichmenu.src = url;
                            return fileBinary;
                        });
                    });
                }

                // 如果沒有上傳新的圖像，將之前放在 storge 的圖像重新上傳
                let fileName = putRichmenu.src.split('/').pop();
                let path = `/apps/${appId}/richmenus/${richmenuId}/src/${fileName}`;
                return storageHlp.filesDownload(path).then((res) => {
                    /** @type {any} */
                    let dropboxFile = res;
                    if (!dropboxFile.fileBinary) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                    }
                    return dropboxFile.fileBinary;
                });
            }).then((fileBinary) => {
                if (putRichmenu.platformMenuId) {
                    // 由於 LINE 的限制，無法更新現有的 richmenu
                    // 因此統一將舊的 richmenu 刪除，在建立新的 richmenu
                    return botSvc.deleteRichMenu(putRichmenu.platformMenuId, appId).catch((err) => {
                        if (err && 404 === err.statusCode) {
                            return Promise.resolve();
                        }
                        return Promise.reject(err);
                    }).then(() => {
                        return botSvc.createRichMenu(putRichmenu, appId);
                    }).then((_platformMenuId) => {
                        putRichmenu.platformMenuId = _platformMenuId;
                        return fileBinary;
                    });
                }
                return fileBinary;
            }).then((fileBinary) => {
                return botSvc.setRichMenuImage(putRichmenu.platformMenuId, fileBinary, richmentImgMimeType, appId);
            }).then(() => {
                // 更新目前 richmenu
                return appsRichmenusMdl.update(appId, richmenuId, putRichmenu).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
                let richmenu = richmenus[richmenuId];
                if (!richmenu) {
                    return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_RICHMENU);
                }

                let platformMenuId = richmenu.platformMenuId;
                if (platformMenuId) {
                    return botSvc.deleteRichMenu(platformMenuId, appId).catch((err) => {
                        if (err && 404 === err.statusCode) {
                            return Promise.resolve();
                        }
                        return Promise.reject(err);
                    });
                }
            }).then(() => {
                // 刪除目前 richmenu
                return appsRichmenusMdl.remove(appId, richmenuId).then((appsRichmenus) => {
                    if (!(appsRichmenus && appsRichmenus[appId])) {
                        return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_REMOVE);
                    }
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsRichmenusController();
})();
