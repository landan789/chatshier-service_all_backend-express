module.exports = (function() {
    var API_ERROR = require('../config/api_error');
    var API_SUCCESS = require('../config/api_success');

    const appsMdl = require('../models/apps');

    const botSvc = require('../services/bot');

    function BotController() {};

    BotController.prototype._findApp = function(appId) {
        return Promise.resolve().then(() => {
            return new Promise((resolve, reject) => {
                appsMdl.find(appId, (apps) => {
                    if (!apps) {
                        return reject(API_ERROR.APPS_FAILED_TO_FIND);
                    }
                    let app = apps[appId];
                    resolve(app);
                });
            });
        });
    };

    BotController.prototype.getRichMenuList = function (req, res) {
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
    };

    BotController.prototype.getRichmenu = function(req, res) {
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
    };

    BotController.prototype.getRichMenuImage = function(req, res) {
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
    };

    BotController.prototype.createRichMenu = function(req, res) {
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
    };

    BotController.prototype.setRichMenuImage = function(req, res) {
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
    };

    BotController.prototype.linkRichMenuToUser = function(req, res) {
        let senderId = req.params.senderid;
        let appId = req.params.appid;
        let richmenuId = req.params.richmenuid;

        return BotController.prototype._findApp(appId).then((app) => {
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
    };

    BotController.prototype.unlinkRichMenuFromUser = function(req, res) {
        let senderId = req.params.senderid;
        let appId = req.params.appid;
        let richmenuId = req.params.richmenuid;

        return BotController.prototype._findApp(appId).then((app) => {
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
    };

    BotController.prototype.deleteRichMenu = function (req, res) {
        let appId = req.params.appid;
        let richmenuId = req.params.richmenuid;

        return BotController.prototype._findApp(appId).then((app) => {
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
    };

    return new BotController();
})();