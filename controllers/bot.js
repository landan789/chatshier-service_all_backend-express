module.exports = (function() {
    const ControllerCore = require('../cores/controller');

    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const storageHlp = require('../helpers/storage');

    let botSvc = require('../services/bot');
    let appsMdl = require('../models/apps');
    let consumersMdl = require('../models/consumers');

    class BotController extends ControllerCore {
        constructor() {
            super();
            this._findApp = this._findApp.bind(this);
            this.getRichMenuList = this.getRichMenuList.bind(this);
            this.getRichmenu = this.getRichmenu.bind(this);
            this.getRichMenuImage = this.getRichMenuImage.bind(this);
            this.createRichMenu = this.createRichMenu.bind(this);
            this.setRichMenuImage = this.setRichMenuImage.bind(this);
            this.linkRichMenuToUser = this.linkRichMenuToUser.bind(this);
            this.unlinkRichMenuFromUser = this.unlinkRichMenuFromUser.bind(this);
            this.deleteRichMenu = this.deleteRichMenu.bind(this);
            this.getProfile = this.getProfile.bind(this);
            this.uploadFile = this.uploadFile.bind(this);
        }

        _findApp(appId) {
            return Promise.resolve().then(() => {
                return new Promise((resolve, reject) => {
                    appsMdl.find(appId, null, (apps) => {
                        if (!apps) {
                            return reject(API_ERROR.APPS_FAILED_TO_FIND);
                        }
                        let app = apps[appId];
                        resolve(app);
                    });
                });
            });
        }

        getRichMenuList(req, res) {
            let appId = req.params.appid;

            return BotController.prototype._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.getRichMenuList(appId);
            }).then((richmenuList) => {
                if (!richmenuList) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_FIND);
                }
                return richmenuList;
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
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        getRichmenu(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return BotController.prototype._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.getRichMenu(richmenuId, appId);
            }).then((richMenu) => {
                if (!richMenu) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_FIND);
                }
                return richMenu;
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
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        getRichMenuImage(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return BotController.prototype._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.getRichMenuImage(richmenuId, appId);
            }).then((richmenuImg) => {
                if (!richmenuImg) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_FIND);
                }
                return richmenuImg;
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
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        createRichMenu(req, res) {
            let appId = req.params.appid;
            let richmenu = JSON.parse(req.body.richmenu);

            return BotController.prototype._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.createRichMenu(richmenu, appId);
            }).then((richmenuId) => {
                if (!richmenuId) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_INSERT);
                }
                return richmenuId;
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        setRichMenuImage(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;
            let richmenuImg = JSON.parse(req.body.richmenuImg);

            return BotController.prototype._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.setRichMenuImage(richmenuId, richmenuImg, appId);
            }).then((result) => {
                if (!result) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_UPDATE);
                }
                return result;
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        linkRichMenuToUser(req, res) {
            let senderId = req.params.senderid;
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return this._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.linkRichMenuToUser(senderId, richmenuId, appId);
            }).then((result) => {
                if (!result) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_FIND);
                }
                return result;
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
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        unlinkRichMenuFromUser(req, res) {
            let senderId = req.params.senderid;
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return this._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.unlinkRichMenuFromUser(senderId, richmenuId, appId);
            }).then((result) => {
                if (!result) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_FIND);
                }
                return result;
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
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        deleteRichMenu(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.richmenuid;

            return this._findApp(appId).then((app) => {
                return botSvc.create(appId, app);
            }).then((_bot) => {
                let bot = _bot;
                return botSvc.deleteRichMenu(richmenuId, appId);
            }).then((result) => {
                if (!result) {
                    return Promise.reject(API_ERROR.BOT_RICHMENU_FAILED_TO_REMOVE);
                }
                return result;
            }).then((data) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: data
                };
                res.status(200).json(json);
            }).catch((ERROR) => {
                let json = {
                    status: 0,
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        }

        getProfile(req, res) {
            let appId = req.params.appid;
            let platformUid = req.params.platformuid;
            let app = {};

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
                }
                return appsMdl.find(appId, null);
            }).then((apps) => {
                if (!apps) {
                    return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                }
                app = apps[appId];
                return botSvc.create(appId, app);
            }).then(() => {
                return botSvc.getProfile(platformUid, appId, app);
            }).then((profile) => {
                if (!profile) {
                    return Promise.reject(API_ERROR.CONSUMER_FAILED_TO_UPDATE);
                }
                return consumersMdl.replace(platformUid, profile);
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

        uploadFile(req, res) {
            let file = req.body.file;
            let fileName = req.body.fileName;
            let docName = req.query.doc;
            let docId = req.query.docid;
            let ext = fileName.split('.').pop();
            let originalFilePath = '';
    
            return this.appsRequestVerify(req).then((chechedAppIds) => {
                let appId = chechedAppIds[0];
                if (!(file && fileName)) {
                    return Promise.reject(API_ERROR.BOT_FAILED_TO_UPLOAD_IMAGE);
                }

                if(!docName || !docId) {
                    originalFilePath = `/temp/${Date.now()}.${ext}`;
                } else {
                    originalFilePath = `/apps/${appId}/${docName}/${docId}/src/${Date.now()}.${ext}`;
                }
                return storageHlp.filesUpload(originalFilePath, file);
            }).then((response) => {
                return storageHlp.sharingCreateSharedLink(originalFilePath);
            }).then((response) => {
                let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                let url = wwwurl.replace('?dl=0', '');
                return url;
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
    }
    return new BotController();
})();
