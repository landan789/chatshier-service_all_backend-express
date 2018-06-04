module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    const LINE = 'LINE';

    let botSvc = require('../services/bot');
    let consumersMdl = require('../models/consumers');
    let storageHlp = require('../helpers/storage');

    let appsMdl = require('../models/apps');
    let appsRichmenusMdl = require('../models/apps_richmenus');
    let appsChatroomsMdl = require('../models/apps_chatrooms');
    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    class BotController extends ControllerCore {
        constructor() {
            super();
            this._createBot = this._createBot.bind(this);
            this._findPlatformUids = this._findPlatformUids.bind(this);
            this.activateMenu = this.activateMenu.bind(this);
            this.deactivateMenu = this.deactivateMenu.bind(this);
            this.getProfile = this.getProfile.bind(this);
            this.uploadFile = this.uploadFile.bind(this);
            this.leaveGroupRoom = this.leaveGroupRoom.bind(this);
        }

        _createBot(appId) {
            let app;
            return appsMdl.find(appId).then((apps) => {
                if (!apps) {
                    return Promise.reject(API_ERROR.APPS_FAILED_TO_FIND);
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
            let appId = req.params.appid;
            let richmenuId = req.params.menuid;
            let richmenu = {};
            /** @type {Chatshier.Models.App} */
            let app;

            return this.appsRequestVerify(req).then(() => {
                return this._createBot(appId);
            }).then((_app) => {
                if (!_app) {
                    return Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                }
                app = _app;
                return appsRichmenusMdl.find(appId, richmenuId);
            }).then((appsRichmenu) => {
                if (!appsRichmenu) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }

                richmenu = appsRichmenu[appId].richmenus[richmenuId];
                return this._findPlatformUids(appId, app.type);
            }).then((platformUids) => {
                let platformMenuId = richmenu.platformMenuId;
                return Promise.all(platformUids.map((platformUid) => {
                    return botSvc.linkRichMenuToUser(platformUid, platformMenuId, appId).then((resJson) => {
                        if (!resJson) {
                            return Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_LINK);
                        }
                        return platformUid;
                    });
                }));
            }).then(() => {
                richmenu.isActivated = true;
                return appsRichmenusMdl.update(appId, richmenuId, richmenu);
            }).then((appsRichemnu) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsRichemnu
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        deactivateMenu(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.menuid;
            let richmenu;
            /** @type {Chatshier.Models.App} */
            let app;

            return this.appsRequestVerify(req).then(() => {
                return this._createBot(appId);
            }).then((_app) => {
                if (!_app) {
                    return Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                }
                app = _app;
                return appsRichmenusMdl.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                if (!appsRichmenus) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }

                richmenu = appsRichmenus[appId].richmenus[richmenuId];
                return this._findPlatformUids(appId, app.type);
            }).then((platformUids) => {
                let platformMenuId = richmenu.platformMenuId;
                return Promise.all(platformUids.map((platformUid) => {
                    return botSvc.unlinkRichMenuFromUser(platformUid, platformMenuId, appId).then((result) => {
                        if (!result) {
                            return Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_UNLINK);
                        }
                        return platformUid;
                    });
                }));
            }).then(() => {
                richmenu.isActivated = false;
                return appsRichmenusMdl.update(appId, richmenuId, richmenu);
            }).then((appsRichmenus) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        getProfile(req, res) {
            let appId = req.params.appid;
            let platformUid = req.params.platformuid;
            /** @type {Chatshier.Models.App} */
            let app;

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
                } else if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return appsMdl.find(appId).then((apps) => {
                    if (!apps) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                app = apps[appId];
                return botSvc.create(appId, app);
            }).then(() => {
                let platformInfo = {
                    platformUid: platformUid
                };
                return botSvc.getProfile(platformInfo, appId, app);
            }).then((profile) => {
                let fileName = `${platformUid}_${Date.now()}.jpg`;
                let filePath = `${storageHlp.tempPath}/${fileName}`;
                let putConsumer = Object.assign({}, profile);

                return storageHlp.filesSaveUrl(filePath, profile.photo).then((url) => {
                    putConsumer.photo = url;
                    let toPath = `/consumers/${platformUid}/photo/${fileName}`;
                    return storageHlp.filesMoveV2(filePath, toPath);
                }).then(() => {
                    return consumersMdl.replace(platformUid, putConsumer);
                });
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
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
            }).then((url) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: {url, originalFilePath} // TO DO ， BAD FORMAT
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        };

        moveFile(req, res) {
            let appId = req.query.appid;
            let richMenuId = req.query.richmenuid;
            let fromPath = req.query.path;
            let fileName = fromPath.slice(fromPath.indexOf('temp/') + 4);
            let toPath = `/apps/${appId}/richmenus/${richMenuId}/src${fileName}`;

            return storageHlp.filesMoveV2(fromPath, toPath).catch((err) => {
                if (409 === err.status) {
                    return Promise.resolve();
                }
                return Promise.reject(err);
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        leaveGroupRoom(req, res) {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;

            return this.appsRequestVerify(req).then(() => {
                return botSvc.leaveGroupRoom(appId, chatroomId);
            }).then(() => {
                return appsChatroomsMdl.remove(appId, chatroomId);
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new BotController();
})();
