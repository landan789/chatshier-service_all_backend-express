module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');

    const storageHlp = require('../helpers/storage');

    const botSvc = require('../services/bot');

    const consumersMdl = require('../models/consumers');

    const appsMdl = require('../models/apps');
    const appsRichmenusMdl = require('../models/apps_richmenus');
    const appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    function BotController() {};

    BotController.prototype._createBot = function(appId) {
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

    BotController.prototype.activateMenu = function(req, res) {
        let appId = req.params.appid;
        let menuId = req.params.menuid;
        let appType = '';
        let postMenu = {};

        return BotController.prototype._createBot(appId).then((app) => {
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
            postMenu = appsRichmenu[appId].richmenus;

            let imageUrl = postMenu.src;
            imageUrl = imageUrl.slice('/');

            let imagePath = imageUrl[imageUrl.length - 1];
            let path = `/apps/${appId}/richmenus/${menuId}/src/${imagePath}`;
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
                }).then((platformUids) => {
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

    BotController.prototype.deactivateMenu = function(req, res) {
        let appId = req.params.appid;
        let menuId = req.params.menuid;

        return BotController.prototype._createBot(appId).then((app) => {
            if (!app) {
                Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                return;
            }
            return botSvc.unlinkRichMenuFromUser(senderId, menuId, appId);
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
    };

    BotController.prototype.deleteMenu = function (req, res) {
        let appId = req.params.appid;
        let menuId = req.params.menuid;

        return BotController.prototype._createBot(appId).then((app) => {
            if (!app) {
                Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                return;
            }
            return botSvc.deleteMenu(menuId, appId, app);
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
    };

    BotController.prototype.getProfile = function(req, res) {
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
    };

    return new BotController();
})();
