var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');

var appMdl = require('../models/apps');
var userMdl = require('../models/users');
var appsRichmenusMdl = require('../models/apps_richmenus');

var appsRichmenus = {};

appsRichmenus.getByUserId = (req, res, next) => {
    var userId = req.params.userid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    var appIds = user.app_ids;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => {
            let result = appIds !== undefined ? appIds : {};
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_FINDED_SUCCESS.MSG,
                "data": result
            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })
}

appsRichmenus.getByAppIdByuserId = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => { //取得目前user下所有appIds
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    var appIds = user.app_ids;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => { //判斷user中是否有目前appId
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //取得目前appId下所有richmenus
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findAllByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findAllByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    resolve(data);
                });
            });
        })
        .then((richmenus) => {
            let result = richmenus !== undefined ? richmenus : {};
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                "data": result
            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })

}

appsRichmenus.getOne = (req, res, next) => {
    var userId = req.params.userid;
    var richmenuId = req.params.richmenuid;
    var appId = req.params.appid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => { //取得目前user下所有appIds
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    var appIds = user.app_ids;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => { //判斷user中是否有目前appId
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //取得目前appId下所有richmenuIds
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findAllByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    var richmenuIds = Object.keys(data);
                    resolve(richmenuIds);
                })
            });
        })
        .then((richmenuIds) => { //判斷appId中是否有目前richmenuId
            return new Promise((resolve, reject) => {
                if (false === richmenuIds.includes(richmenuId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_RICHMENU);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //取得目前richmenu
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
                    if (null === data || undefined === data || '' === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    resolve(data);
                });
            });
        })
        .then((richmenu) => {
            let result = richmenu !== undefined ? richmenu : {};
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                "data": result
            }
            res.status(200).json(json);
        }).catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        })
}

appsRichmenus.postOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var appId = req.params.appid;

    var size = req.body.size; //size{ width, height }
    var selected = req.body.selected;
    var name = req.body.name;
    var chatBarText = req.body.chatBarText;
    var areas = req.body.areas; //areas{ action{type, data}, bounds{x, y, width, height}}
    var postRichmenu = {
        size: JSON.parse(size),
        name: name,
        selected: selected,
        chatBarText: chatBarText,
        areas: JSON.parse(areas)
    };

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => { //取得目前user下所有appIds
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    var appIds = user.app_ids;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => { //判斷user中是否有目前appId
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //新增richmenu到目前appId
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.insertByAppId(appId, postRichmenu, (result) => {
                    if (false === result) {
                        reject(API_ERROR.RICHMENU_INSERT_FAIL);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.insertByAppId(appId, postRichmenu, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_INSERT);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

appsRichmenus.putOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var richmenuId = req.params.richmenuid;
    var appId = req.params.appid;

    var size = req.body.size; //size{ width, height }
    var selected = req.body.selected;
    var name = req.body.name;
    var chatBarText = req.body.chatBarText;
    var areas = req.body.areas; //areas{ action{type, data}, bounds{x, y, width, height}}
    var postRichmenu = {
        size: JSON.parse(size),
        name: name,
        selected: selected,
        chatBarText: chatBarText,
        areas: JSON.parse(areas),
    };

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => { //取得目前user下所有appIds
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    var appIds = user.app_ids;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => { //判斷user中是否有目前appId
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //取得目前appId下所有richmenuIds
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findAllByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    var richmenuIds = Object.keys(data);
                    resolve(richmenuIds);
                })
            });
        })
        .then((richmenuIds) => { //判斷appId中是否有目前richmenuId
            return new Promise((resolve, reject) => {
                if (false === richmenuIds.includes(richmenuId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_RICHMENU);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //更新目前richmenu
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.updateByAppIdByRichmenuId(appId, richmenuId, postRichmenu, (result) => {
                    if (false === result) {
                        reject(API_ERROR.RICHMENU_UPDATE_FAIL);
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
                    if (null === data || undefined === data || '' === data || 1 === data.delete) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.updateByAppIdByRichmenuId(appId, richmenuId, dataObj, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

appsRichmenus.deleteOne = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var richmenuId = req.params.richmenuid;
    var appId = req.params.appid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => { //取得目前user下所有appIds
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                userMdl.findUser(userId, (user) => {
                    var appIds = user.app_ids;
                    if (false === appIds || undefined === appIds || '' === appIds || (appIds.constructor === Array && 0 === appIds.length)) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => { //判斷user中是否有目前appId
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //取得目前appId下所有richmenuIds
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findAllByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.RICHMENU_NOT_EXISTS);
                        return;
                    }
                    var richmenuIds = Object.keys(data);
                    resolve(richmenuIds);
                })
            });
        })
        .then((richmenuIds) => { //判斷appId中是否有目前richmenuId
            return new Promise((resolve, reject) => {
                if (false === richmenuIds.includes(richmenuId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_RICHMENU);
                    return;
                }
                resolve();
            });
        })
        .then(() => { //刪除目前richmenu
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.removeByAppIdByRichmenuId(appId, richmenuId, (result) => {
                    if (false === result) {
                        reject(API_ERROR.RICHMENU_DELETE_FAIL);
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
                    if (null === data || undefined === data || '' === data) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                appsRichmenusMdl.removeByAppIdByRichmenuId(appId, richmenuId, (result) => {
                    if (false === result) {
                        reject(API_ERROR.APP_RICHMENU_FAILED_TO_REMOVE);
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            var json = {
                "status": 1,
                "msg": API_SUCCESS.DATA_DELETED_SUCCESS.MSG
            };
            res.status(200).json(json);
        })
        .catch((ERR) => {
            var json = {
                "status": 0,
                "msg": ERR.MSG,
                "code": ERR.CODE
            };
            res.status(403).json(json);
        });
}

module.exports = appsRichmenus;