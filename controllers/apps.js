var API_ERROR = require('../config/api_error');
var API_SUCCESS = require('../config/api_success');

const OWNER = 'OWNER';
const ADMIN = 'ADMIN';
const WRITE = 'WRITE';
const READ = 'READ';

var appsMdl = require('../models/apps');
var usersMdl = require('../models/users');
var groupsMdl = require('../models/groups');
var appsTagsMdl = require('../models/apps_tags');

var apps = {};

apps.getAll = (req, res, next) => {

    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            var userId = req.params.userid;
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            };
            usersMdl.findUser(userId, (user) => {
                if (null === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        var groupIds = user.group_ids || [];
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
                resolve(appIds);
                return;
            });
        });
    }).then((appIds) => {
        return new Promise((resolve, reject) => {
            appsMdl.findAppsByAppIds(appIds, (apps) => {
                if (null === apps || '' === apps || undefined === apps) {
                    apps = {};
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
        res.status(403).json(json);
    });
}

apps.getOne = (req, res, next) => {
    var appId = req.params.appid;
    var userId = req.params.userid;

    var proceed = new Promise((resolve, reject) => {
        resolve();
    });

    proceed.then(() => {
        return new Promise((resolve, reject) => {

            if ('' === appId || null === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            }

            if ('' === userId || null === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findUser(userId, (user) => {
                if (false === user || undefined === user || '' === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        var groupIds = user.group_ids || [];
        return new Promise((resolve, reject) => {
            groupsMdl.findAppIds(groupIds, req.params.userid, (appIds) => {
                resolve(appIds);
            });
        });
    }).then((appIds) => {
        if (0 > appIds.indexOf(appId)) {
            return Promise.reject(API_ERROR.USER_OF_GROUP_DID_NOT_HAVE_THIS_APP);
        };
    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.findByAppId(appId, (data) => {
                var app = data;
                if ('' === app || null === app || undefined === app || (app instanceof Array && 0 === app.length)) {
                    reject(API_ERROR.APP_FAILED_TO_FIND);
                    return;
                }

                resolve(app);
            });
        });
    }).then((data) => {
        var app = data;
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
            data: app
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

apps.postOne = (req, res, next) => {
    var postApp = {
        id1: undefined === req.body.id1 ? null : req.body.id1,
        id2: undefined === req.body.id2 ? null : req.body.id2,
        name: undefined === req.body.name ? null : req.body.name,
        secret: undefined === req.body.secret ? null : req.body.secret,
        token1: undefined === req.body.token1 ? null : req.body.token1,
        token2: undefined === req.body.token2 ? null : req.body.token2,
        type: undefined === req.body.type ? null : req.body.type,
        group_id: undefined === req.body.groupid ? null : req.body.groupid
    };
    var apps;
    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            if ('' === req.params.userid || null === req.params.userid || undefined === req.params.userid) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === req.body.id1 || null === req.body.id1 || undefined === req.body.id1) {
                reject(API_ERROR.ID1_WAS_EMPTY);
                return;
            }

            if ('' === req.body.name || null === req.body.name || undefined === req.body.name) {
                reject(API_ERROR.NAME_WAS_EMPTY);
                return;
            }

            if ('' === req.body.secret || null === req.body.secret || undefined === req.body.secret) {
                reject(API_ERROR.TYPE_WAS_EMPTY);
                return;
            }

            if ('' === req.body.token1 || null === req.body.token1 || undefined === req.body.token1) {
                reject(API_ERROR.TOKEN1_WAS_EMPTY);
                return;
            }

            if ('' === req.body.type || null === req.body.type || undefined === req.body.type) {
                reject(API_ERROR.TYPE_WAS_EMPTY);
                return;
            }

            if ('' === req.body.groupid || null === req.body.groupid || undefined === req.body.groupid) {
                reject(API_ERROR.GROUPID_WAS_EMPTY);
                return;
            }
            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findUser(req.params.userid, (user) => {
                if (false === user || undefined === user || '' === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        var groupIds = user.group_ids || [];
        if (0 > groupIds.indexOf(req.body.groupid)) {
            return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
        };

        return new Promise((resolve, reject) => {
            groupsMdl.findGroups(req.body.groupid, req.params.userid, (groups) => {
                if (null === groups || undefined === groups || '' === groups || 0 === Object.keys(groups).length) {
                    reject(API_ERROR.GROUP_DID_NOT_EXIST);
                }
                var group = groups[req.body.groupid];
                resolve(group);
            });
        });
    }).then((group) => {
        var members = group.members;

        // userIds 此群組底下所有成員 userIDs
        var userIds = Object.values(members).map((member) => {
            if (0 === member.isDeleted) {
                return member.user_id;
            }
        });

        var index = userIds.indexOf(req.params.userid);
        // member 當下使用者在此群組的 member 物件資料
        var member = Object.values(members)[index];

        if (0 > index) {
            return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
        };

        if (0 === member.status) {
            return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
        };

        if (READ === member.type) {
            return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
        };
    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.insert(req.params.userid, postApp, (_apps) => {
                if (!_apps) {
                    reject(API_ERROR.APP_FAILED_TO_INSERT);
                    return;
                }
                apps = _apps;
                resolve(apps);
            });
        });
    }).then((apps) => {
        var appId = Object.keys(apps).shift();
        return new Promise((resolve, reject) => {
            appsTagsMdl.insertDefaultTags(appId, (tags) => {
                if (!tags) {
                    reject(API_ERROR.APP_FAILED_TO_INSERT);
                    return;
                }
                resolve();
            });
        });
    }).then(() => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
            data: apps
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

apps.putOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;
    var id1 = req.body.id1;
    var id2 = req.body.id2;
    var name = req.body.name;
    var secret = req.body.secret;
    var token1 = req.body.token1;
    var token2 = req.body.token2;
    var type = req.body.type;

    var putApp = {
        id1: undefined === req.body.id1 ? null : req.body.id1,
        id2: undefined === req.body.id2 ? null : req.body.id2,
        name: undefined === req.body.name ? null : req.body.name,
        secret: undefined === req.body.secret ? null : req.body.secret,
        token1: undefined === req.body.token1 ? null : req.body.token1,
        token2: undefined === req.body.token2 ? null : req.body.token2,
        type: undefined === req.body.type ? null : req.body.type
    };
    // app.group_id 無法經由 HTTP PUT 更改

    // 前端未填入的訊息，不覆蓋
    for (var key in putApp) {
        if (null === putApp[key]) {
            delete putApp[key];
        };
    };

    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }
            if (0 === Object.keys(putApp).length) {
                reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
            };
            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findUser(req.params.userid, (user) => {
                if (false === user || undefined === user || '' === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        return new Promise((resolve, reject) => {
            appsMdl.findByAppId(req.params.appid, (apps) => {
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
            groupsMdl.findGroups(groupId, req.params.userid, (groups) => {
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

        var index = userIds.indexOf(req.params.userid);

        if (0 > index) {
            return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
        };

        var member = Object.values(members)[index];

        if (0 === member.status) {
            return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
        };

        if (READ === member.type) {
            return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
        };
    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.update(req.params.appid, putApp, (apps) => {
                if (null === apps || undefined === apps || '' === apps) {
                    reject(API_ERROR.APP_FAILED_TO_UPDATE);
                    return;
                };
                resolve(apps);
            });
        });
    }).then((apps) => {
        var json = {
            status: 1,
            msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
            data: apps
        };
        res.status(200).json(json);
    }).catch((ERROR) => {
        var json = {
            status: 0,
            msg: ERROR.MSG,
            code: ERROR.CODE
        };
        res.status(403).json(json);
    });
};

apps.deleteOne = (req, res, next) => {
    var userId = req.params.userid;
    var appId = req.params.appid;

    Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            if ('' === userId || null === userId || undefined === userId) {
                reject(API_ERROR.USERID_WAS_EMPTY);
                return;
            }

            if ('' === appId || null === appId || undefined === appId) {
                reject(API_ERROR.APPID_WAS_EMPTY);
                return;
            };
            resolve();
        });
    }).then(() => {
        return new Promise((resolve, reject) => {
            usersMdl.findUser(req.params.userid, (user) => {
                if (false === user || undefined === user || '' === user) {
                    reject(API_ERROR.USER_FAILED_TO_FIND);
                    return;
                }
                resolve(user);
            });
        });
    }).then((user) => {
        return new Promise((resolve, reject) => {
            appsMdl.findByAppId(req.params.appid, (apps) => {
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
            groupsMdl.findGroups(groupId, req.params.userid, (groups) => {
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
            };
        });

        var index = userIds.indexOf(req.params.userid);

        if (0 > index) {
            return Promise.reject(API_ERROR.USER_WAS_NOT_IN_THIS_GROUP);
        };

        var member = Object.values(members)[index];

        if (0 === member.status) {
            return Promise.reject(API_ERROR.GROUP_MEMBER_WAS_NOT_ACTIVE_IN_THIS_GROUP);
        };

        if (READ === member.type) {
            return Promise.reject(API_ERROR.GROUP_MEMBER_DID_NOT_HAVE_PERMSSSION_TO_WRITE_APP);
        };
    }).then(() => {
        return new Promise((resolve, reject) => {
            appsMdl.remove(req.params.appid, (result) => {
                if (false === result) {
                    reject(API_ERROR.APP_FAILED_TO_REMOVE);
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
        res.status(403).json(json);
    });
};
module.exports = apps;