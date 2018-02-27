module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');
    const usersMdl = require('../models/users');
    const appsMdl = require('../models/apps');
    const appsTicketsMdl = require('../models/apps_tickets');
    const groupsMdl = require('../models/groups');

    function AppsTicketsController() {};

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const DELETE = 'DELETE';

    /**
     * 使用者的 AppId 清單前置檢查程序
     */
    let _paramsCheckingGetAll = function(params) {
        let appId = params.appid;
        let userId = params.userid;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                usersMdl.findUser(userId, (data) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!data) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(user.group_ids, params.userid, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    } else if (appId && -1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(appIds);
                });
            });
        });
    };

    /**
     * 使用者的 AppId 清單前置檢查程序
     */
    let _requestChecking = function(req) {
        let appId = req.params.appid;
        let userId = req.params.userid;
        let method = req.method;

        return Promise.resolve().then(() => {
            // 1. 先用 userId 去 users model 找到 appId 清單
            return new Promise((resolve, reject) => {
                if (!userId) {
                    reject(API_ERROR.USERID_WAS_EMPTY);
                    return;
                }
                if (!appId) {
                    reject(API_ERROR.APPID_WAS_EMPTY);
                    return;
                };
                usersMdl.findUser(userId, (data) => {
                    // 2. 判斷指定的 appId 是否有在 user 的 appId 清單中
                    if (!data) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((user) => {
            return new Promise((resolve, reject) => {
                groupsMdl.findAppIds(user.group_ids, userId, (appIds) => {
                    if (!appIds) {
                        reject(API_ERROR.APPID_WAS_EMPTY);
                        return;
                    } else if (appId && -1 === appIds.indexOf(appId)) {
                        // 如果指定的 appId 沒有在使用者設定的 app 清單中，則回應錯誤
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve();
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsMdl.findByAppId(appId, (apps) => {
                    if (null === apps || undefined === apps || '' === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }
                    resolve(apps);
                });
            });
        }).then((apps) => {
            var app = Object.values(apps)[0];
            var groupId = app.group_id;
            return new Promise((resolve, reject) => {
                groupsMdl.findGroups(groupId, userId, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(API_ERROR.GROUP_FAILED_TO_FIND);
                        return;
                    };
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var group = Object.values(groups)[0];
            var members = group.members;

            var userIds = Object.values(members).map((member) => {
                if (0 === member.isDeleted) {
                    return member.user_id;
                }
            });

            var index = userIds.indexOf(userId);

            if (0 > index) {
                return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
            };

            var member = Object.values(members)[index];

            if (0 === member.status) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
            };

            if (READ === member.type && (POST === method || PUT === method || DELETE === method)) {
                return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
            };
            return appId;
        });
    };

    AppsTicketsController.prototype.getAllByUserid = (req, res, next) => {
        return _paramsCheckingGetAll(req.params).then((appIds) => {
            let appId = req.params.appid;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.findAppTicketsByAppIds(appId || appIds, (data) => {
                    var apps = data;
                    if (null === apps || '' === apps || undefined === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }

                    resolve(apps);
                });
            });
        }).then((apps) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: apps
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.getOne = (req, res, next) => {
        return _requestChecking(req).then((checkedAppId) => {
            let appId = checkedAppId;
            let ticketId = req.params.ticketid;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.findAppTicketByAppIdByTicketId(appId, ticketId, (data) => {
                    var apps = data;
                    if (null === apps || '' === apps || undefined === apps) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    } else if (0 === Object.keys(apps).length) {
                        reject(API_ERROR.APP_FAILED_TO_FIND);
                        return;
                    }

                    resolve(apps);
                });
            });
        }).then((data) => {
            var apps = data;
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: apps
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.postOne = (req, res, next) => {
        var postTikeck = {
            description: req.body.description === undefined ? '' : req.body.description,
            dueTime: req.body.dueTime === undefined ? '' : req.body.dueTime,
            priority: req.body.priority === undefined ? '' : req.body.priority,
            messager_id: req.body.messager_id === undefined ? '' : req.body.messager_id,
            status: req.body.status === undefined ? '' : req.body.status,
            isDeleted: 0
        };

        return _requestChecking(req).then((checkedAppId) => {
            let appId = checkedAppId;
            return new Promise((resolve, reject) => {
                appsTicketsMdl.insertByAppid(appId, postTikeck, (result) => {
                    if (false === result || null === result || undefined === result) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_INSERT);
                        return;
                    }

                    resolve();
                });
            });
        }).then(() => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.putOne = (req, res, next) => {
        var appId = '';
        var ticketId = req.params.ticketid;

        var putTikcket = {
            description: req.body.description || '',
            dueTime: req.body.dueTime ? req.body.dueTime : 0,
            priority: req.body.priority ? req.body.priority : 0,
            status: req.body.status ? req.body.status : 0,
            updatedTime: req.body.updatedTime ? req.body.updatedTime : 0
        };

        return _requestChecking(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!ticketId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有tickets
                appsTicketsMdl.findTicketsByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    let ticketIds = Object.keys(data);
                    resolve(ticketIds);
                });
            });
        }).then((ticketIds) => { // 判斷appId中是否有目前ticket
            return new Promise((resolve, reject) => {
                if (false === ticketIds.includes(ticketId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsTicketsMdl.updateByAppIdByticketId(appId, ticketId, putTikcket, (result) => {
                    if (false === result || null === result || undefined === result) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_UPDATE);
                        return;
                    }

                    resolve();
                });
            });
        }).then(() => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    AppsTicketsController.prototype.deleteOne = (req, res, next) => {
        var appId = '';
        var ticketId = req.params.ticketid;

        return _requestChecking(req).then((checkedAppId) => {
            appId = checkedAppId;

            if (!ticketId) {
                return Promise.reject(API_ERROR.GREETINGID_WAS_EMPTY);
            };
            return new Promise((resolve, reject) => { // 取得目前appId下所有tickets
                appsTicketsMdl.findTicketsByAppId(appId, (data) => {
                    if (null === data || '' === data || undefined === data) {
                        reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                        return;
                    }
                    let ticketIds = Object.keys(data);
                    resolve(ticketIds);
                });
            });
        }).then((ticketIds) => { // 判斷appId中是否有目前ticket
            return new Promise((resolve, reject) => {
                if (false === ticketIds.includes(ticketId)) {
                    reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                appsTicketsMdl.removeByAppIdByTicketId(appId, ticketId, (result) => {
                    if (false === result || null === result || undefined === result) {
                        reject(API_ERROR.APP_TICKET_FAILED_TO_UPDATE);
                        return;
                    }

                    resolve();
                });
            });
        }).then(() => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG
            };
            res.status(200).json(json);
        }).catch((ERROR) => {
            var json = {
                status: 0,
                msg: ERROR.MSG,
                code: ERROR.CODE
            };
            res.status(500).json(json);
        });
    };

    return new AppsTicketsController();
})();
