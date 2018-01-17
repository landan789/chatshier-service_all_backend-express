var API_ERROR = require('../config/apiError');
var API_SUCCESS = require('../config/apiSuccess');

var appMdl = require('../models/apps');
var userMdl = require('../models/users');
var richmenuMdl = require('../models/richmenus');

var richmenus = {};

//圖文選單    //取得userid下全部rich menus
richmenus.getAll = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (null === appIds || undefined === appIds) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => {
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenuMdl.findAllByAppId(appId, (data) => {
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

//取得userid下單筆rich menu
richmenus.get = (req, res, next) => {
    var userId = req.params.userid;
    var richmenuId = req.params.richmenuid;
    var appId = req.params.appid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });
    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (null === appIds || undefined === appIds) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                        return;
                    }
                    resolve(appIds);
                })
            });
        })
        .then((appIds) => {
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenuMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
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

// insert
richmenus.post = (req, res, next) => {
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
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (null === appIds || undefined === appIds) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                    } else {
                        resolve(appIds);
                    }
                })
            });
        })
        .then((appIds) => {
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenuMdl.insertByAppId(appId, postRichmenu, (result) => {
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

//update
richmenus.put = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var richmenuId = req.params.richmenuid;
    var appId = req.params.appid;

    var size = req.body.size; //size{ width, height }
    var selected = req.body.selected;
    var name = req.body.name;
    var chatBarText = req.body.chatBarText;
    var areas = req.body.areas; //areas{ action{type, data}, bounds{x, y, width, height}}
    var dataObj = {
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
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (null === appIds || undefined === appIds) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                    } else {
                        resolve(appIds);
                    }
                })
            });
        })
        .then((appIds) => {
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenuMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
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
                richmenuMdl.updateByAppIdByRichmenuId(appId, richmenuId, dataObj, (result) => {
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

//remove
richmenus.delete = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    var userId = req.params.userid;
    var richmenuId = req.params.richmenuid;
    var appId = req.params.appid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed
        .then(() => {
            return new Promise((resolve, reject) => {
                if ('' === userId || null === userId) {
                    reject(API_ERROR.USERID_IS_EMPTY);
                    return;
                }
                userMdl.findAppIdsByUserId(userId, (appIds) => {
                    if (null === appIds || undefined === appIds) {
                        reject(API_ERROR.APPID_IS_EMPTY);
                    } else {
                        resolve(appIds);
                    }
                })
            });
        })
        .then((appIds) => {
            return new Promise((resolve, reject) => {
                if (false === appIds.includes(appId)) {
                    reject(API_ERROR.USER_DOES_NOT_HAVE_THIS_APP);
                    return;
                }
                resolve();
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenuMdl.findOneByAppIdByRichmenuId(appId, richmenuId, (data) => {
                    if (null === data || undefined === data || '' === data) {
                        reject(API_ERROR.APP_RICHMENU_DOES_NOT_EXIST);
                        return;
                    }
                    resolve();
                });
            });
        })
        .then(() => {
            return new Promise((resolve, reject) => {
                richmenuMdl.removeByAppIdByRichmenuId(appId, richmenuId, (result) => {
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

module.exports = richmenus;