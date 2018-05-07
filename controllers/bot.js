module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let botSvc = require('../services/bot');
    let consumersMdl = require('../models/consumers');
    let storageHlp = require('../helpers/storage');

    let appsMdl = require('../models/apps');
    let appsRichmenusMdl = require('../models/apps_richmenus');
    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    class BotController extends ControllerCore {
        constructor() {
            super();
            this._createBot = this._createBot.bind(this);
            this._findPlatformUids = this._findPlatformUids.bind(this);
            this.activateMenu = this.activateMenu.bind(this);
            this.deactivateMenu = this.deactivateMenu.bind(this);
            this.deleteMenu = this.deleteMenu.bind(this);
            this.getProfile = this.getProfile.bind(this);
            this.uploadFile = this.uploadFile.bind(this);
        }

        _createBot(appId) {
            let app = '';
            return appsMdl.find(appId, null).then((apps) => {
                if (!apps) {
                    Promise.reject(API_ERROR.APPS_FAILED_TO_FIND);
                    return;
                }
                app = apps[appId];
                return botSvc.create(appId, app);
            }).then((bot) => {
                if (!bot) {
                    return null;
                }
                return app;
            });
        };

        _findPlatformUids(appId, appType) {
            return appsChatroomsMessagersMdl.find(appId, null, null, appType).then((appsChatroomsMessagers) => {
                let platformUids = [];
                let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                for (let chatroomId in chatrooms) {
                    let chatroomMessagers = chatrooms[chatroomId].messagers;
                    for (let messagerId in chatroomMessagers) {
                        let messager = chatroomMessagers[messagerId];
                        platformUids.push(messager.platformUid);
                    }
                }
                return platformUids;
            });
        };

        activateMenu(req, res) {
            let appId = '';
            let menuId = req.params.menuid;
            let appType = '';
            let postMenu = {};
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds[0];
                return this._createBot(appId);
            }).then((app) => {
                if (!app) {
                    Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                    return;
                }
                appType = app.type;
                return Promise.all([
                    appsRichmenusMdl.find(appId, menuId),
                    app
                ]);
            }).then((results) => {
                let appsRichmenu = results[0];
                let app = results[1];
                if (!appsRichmenu) {
                    Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                    return;
                }
                postMenu = appsRichmenu[appId].richmenus[menuId];

                let imageSrc = postMenu.src;
                let fileName = imageSrc.split('/').pop();

                let path = `/apps/${appId}/richmenus/${menuId}/src/${fileName}`;
                return Promise.all([
                    botSvc.createMenu(postMenu, appId, app),
                    storageHlp.filesDownload(path)
                ]);
            }).then((results) => {
                let response = results[0];
                let image = results[1];
                let botMenuId = '';

                if (response instanceof Object) {
                    // wechat create success response {"errcode":0,"errmsg":"ok"}
                    if (!response.errcode && 'ok' === response.errmsg) {
                        botMenuId = 'true';
                    }
                    Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_INSERT);
                    return;
                }
                botMenuId = response;

                return botSvc.setRichMenuImage(botMenuId, image, appId).then((result) => {
                    if (!result) {
                        Promise.reject(API_ERROR.BOT_MENU_IMAGE_FAILED_TO_INSERT);
                        return;
                    }
                    return this._findPlatformUids(appId, appType).then((platformUids) => {
                        return Promise.all(platformUids.map((platformUid) => {
                            return botSvc.linkRichMenuToUser(platformUid, botMenuId, appId).then((result) => {
                                if (!result) {
                                    Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_LINK);
                                    return;
                                }
                                return platformUid;
                            });
                        })).then(() => {
                            postMenu.platformMenuId = botMenuId;
                            return appsRichmenusMdl.update(appId, menuId, postMenu).then((appsRichemnu) => {
                                return appsRichemnu;
                            });
                        });
                    });
                });
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
        };

        deactivateMenu(req, res) {
            let appId = '';
            let appType = '';
            let richmenu = {};
            let platformMenuId = '';
            let menuId = req.params.menuid;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds[0];
                return this._createBot(appId);
            }).then((app) => {
                if (!app) {
                    Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                    return;
                }
                appType = app.type;
                return Promise.all([
                    appsRichmenusMdl.find(appId, menuId),
                    app
                ]);
            }).then((results) => {
                let appsRichmenu = results[0];
                let app = results[1];
                if (!appsRichmenu) {
                    Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                    return;
                }
                richmenu = appsRichmenu[appId].richmenus[menuId];
                platformMenuId = richmenu.platformMenuId;
                return this._findPlatformUids(appId, appType);
            }).then((platformUids) => {
                return Promise.all(platformUids.map((platformUid) => {
                    return botSvc.unlinkRichMenuFromUser(platformUid, platformMenuId, appId).then((result) => {
                        if (!result) {
                            Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_UNLINK);
                            return;
                        }
                        return platformUid;
                    });
                }));
            }).then(() => {
                richmenu.platformMenuId = '';
                richmenu.isDeleted = false;
                return appsRichmenusMdl.update(appId, menuId, richmenu).then((appsRichemnu) => {
                    return appsRichemnu;
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
                    msg: ERROR.MSG || ERROR.message,
                    code: ERROR.CODE
                };
                res.status(500).json(json);
            });
        };

        deleteMenu(req, res) {
            let appId = '';
            let menuId = req.params.menuid;
            let appType = '';
            let richmenu = {};

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds[0];
                return this._createBot(appId);
            }).then((app) => {
                if (!app) {
                    Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                    return;
                }
                appType = app.type;
                return Promise.all([
                    appsRichmenusMdl.find(appId, menuId),
                    app
                ]);
            }).then((results) => {
                let appsRichmenu = results[0];
                let app = results[1];
                if (!appsRichmenu) {
                    Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                    return;
                }
                richmenu = appsRichmenu[appId].richmenus[menuId];
                let platformMenuId = richmenu.platformMenuId;
                return botSvc.deleteMenu(platformMenuId, appId, app);
            }).then((result) => {
                if (!result) {
                    Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_REMOVE);
                    return;
                }
                richmenu.platformMenuId = '';
                richmenu.isDeleted = true;
                return appsRichmenusMdl.update(appId, menuId, richmenu);
            }).then((appsRichmenu) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsRichmenu
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
        };

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
            let ext = fileName.split('.').pop();
            let originalFilePath = `/temp/${Date.now()}.${ext}`;

            return this.appsRequestVerify(req).then(() => {
                if (!(file && fileName)) {
                    return Promise.reject(API_ERROR.BOT_FAILED_TO_UPLOAD_IMAGE);
                }
                return storageHlp.filesUpload(originalFilePath, file);
            }).then((response) => {
                return storageHlp.sharingCreateSharedLink(originalFilePath);
            }).then((response) => {
                let wwwurl = response.url.replace('www.dropbox', 'dl.dropboxusercontent');
                let url = wwwurl.replace('?dl=0', '');
                return url;
            }).then((url) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: {url, originalFilePath}
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

        moveFile(req, res) {
            let appId = req.query.appid;
            let richMenuId = req.query.richmenuid;
            let fromPath = req.query.path;
            let fileName = fromPath.slice(fromPath.indexOf('temp/') + 4);
            let toPath = `/apps/${appId}/richmenus/${richMenuId}/src${fileName}`;

            return storageHlp.filesMoveV2(fromPath, toPath).catch((ERROR) => {
                if (409 === ERROR.status) {
                    return;
                }
                return Promise.reject(ERROR);
            }).then(() => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
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
    }
    return new BotController();
})();
