module.exports = (function() {
    const API_ERROR = require('../config/api_error');
    const API_SUCCESS = require('../config/api_success');

    const OWNER = 'OWNER';
    const ADMIN = 'ADMIN';
    const WRITE = 'WRITE';
    const READ = 'READ';

    var usersMdl = require('../models/users');
    var groupsMdl = require('../models/groups');

    function GroupsController() {};

    GroupsController.prototype.getAll = function(req, res, next) {
        var userId = req.params.userid;

        var proceed = Promise.resolve();
        proceed.then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(userId, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            return new Promise((resolve, reject) => {
                groupsMdl.findGroups(groupIds, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                data: groups
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

    GroupsController.prototype.postOne = function(req, res, next) {
        var userId = req.params.userid;
        var postGroup = {
            name: req.body.name
        };

        Promise.resolve().then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.body.name || undefined === req.body.name || null === req.body.name) {
                return Promise.reject(API_ERROR.NAME_WAS_EMPTY);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(req.params.userid, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMdl.insert(userId, postGroup, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                data: groups
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

    GroupsController.prototype.putOne = function(req, res, next) {
        var userId = req.params.userid;
        var groupId = req.params.groupid;
        var putGroup = {
            name: req.body.name || null
        };

        // 前端未填入的訊息，不覆蓋
        for (var key in putGroup) {
            if (null === putGroup[key]) {
                delete putGroup[key];
            };
        };

        Promise.resolve().then(() => {
            if ('' === req.params.userid || undefined === req.params.userid || null === req.params.userid) {
                return Promise.reject(API_ERROR.USERID_WAS_EMPTY);
            };

            if ('' === req.params.groupid || undefined === req.params.groupid || null === req.params.groupid) {
                return Promise.reject(API_ERROR.GROUPID_WAS_EMPTY);
            };
            if (0 === Object.keys(putGroup).length) {
                return Promise.reject(API_ERROR.INVALID_REQUEST_BODY_DATA);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                usersMdl.findUser(req.params.userid, (data) => {
                    var user = data;
                    if (undefined === user || null === user || '' === user) {
                        reject(API_ERROR.USER_FAILED_TO_FIND);
                        return;
                    }
                    resolve(user);
                });
            });
        }).then((user) => {
            var groupIds = user.group_ids;
            var index = groupIds.indexOf(groupId);
            if (0 > index) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_THIS_GROUP);
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMdl.findGroups(groupId, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var group = Object.values(groups)[0];
            var members = group.members;
            var userIds = Object.values(members).map((member) => {
                return member.user_id;
            });

            var index = userIds.indexOf(userId);

            // member 當下 userid 在此 group 對應到的 群組成員
            var member = Object.values(members)[index];
            if (READ === member.type) {
                return Promise.reject(API_ERROR.USER_DID_NOT_HAVE_PERMISSION_TO_UPDATE_GROUP);
            };
        }).then(() => {
            return new Promise((resolve, reject) => {
                groupsMdl.update(groupId, putGroup, (groups) => {
                    if (null === groups || undefined === groups || '' === groups) {
                        reject(groups);
                        return;
                    }
                    resolve(groups);
                });
            });
        }).then((groups) => {
            var json = {
                status: 1,
                msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                data: groups
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
    return new GroupsController();
})();