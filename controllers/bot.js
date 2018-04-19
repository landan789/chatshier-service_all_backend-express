module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');

    const storageHlp = require('../helpers/storage');

    const botSvc = require('../services/bot');

    const appsMdl = require('../models/apps');
    const consumersMdl = require('../models/consumers');
    const appsRichmenusMdl = require('../models/apps_richmenus');

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

        return BotController.prototype._createBot(appId).then((app) => {
            if (!app) {
                Promise.reject(API_ERROR.BOT_FAILED_TO_CREATE);
                return;
            }
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
            let postMenu = appsRichmenu[appId].richmenus;
            return botSvc.createMenu(postMenu, appId, app);
        }).then((result) => {
            let botMenuId = '';
            let path = `/apps/${appId}/richmenus/${menuId}/src/`;
            if (result instanceof Object) {
                // wechat create success response {"errcode":0,"errmsg":"ok"}
                if (!result.errcode && 'ok' === result.errmsg) {
                    botMenuId = 'true';
                }
                Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_INSERT);
                return;
            }
            botMenuId = result;

            return botSvc.setRichMenuImage();

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
