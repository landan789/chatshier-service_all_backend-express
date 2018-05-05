
module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';
    const USERS = 'users';
    const GROUPS = 'GROUPS';

    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const CHATSHIER = 'CHATSHIER';

    class AppsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
            this.UsersModel = this.model(USERS, this.UsersSchema);
            this.GroupsModel = this.model(GROUPS, this.GroupsSchema);

            this.project = {
                name: true,
                id1: true,
                id2: true,
                group_id: true,
                isDeleted: true,
                webhook_id: true,
                secret: true,
                token1: true,
                token2: true,
                type: true,
                createdTime: true,
                updatedTime: true
            };
        }

        find(appIds, webhookId, query, callback) {
            if (appIds && !(appIds instanceof Array)) {
                appIds = [appIds];
            };

            let _query = query || {};
            _query.isDeleted = false;
            appIds && (_query._id = { $in: appIds.map((appId) => this.Types.ObjectId(appId)) });
            webhookId && (_query.webhook_id = this.Types.ObjectId(webhookId));

            return this.AppsModel.find(_query, this.project).then((results) => {
                let apps = {};
                if (0 === results.length) {
                    return apps;
                }

                apps = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app._doc));
                    return output;
                }, {});
                return apps;
            }).then((apps) => {
                ('function' === typeof callback) && callback(apps);
                return apps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        insert(userId, postApp, callback) {
            let apps = {};
            let _appId = this.Types.ObjectId();
            let webhookId = this.Types.ObjectId().toHexString();
            let groupId = postApp.group_id;

            let _apps = new this.AppsModel();
            _apps._id = _appId;
            _apps.id1 = postApp.id1 || '';
            _apps.id2 = postApp.id2 || '';
            _apps.name = postApp.name || '';
            _apps.secret = postApp.secret || '';
            _apps.token1 = postApp.token1 || '';
            _apps.token2 = postApp.token2 || '';
            _apps.type = postApp.type || '';
            _apps.group_id = postApp.group_id;
            _apps.webhook_id = CHATSHIER === postApp.type ? '' : webhookId;
            _apps.isDeleted = false;
            _apps.updatedTime = Date.now();
            _apps.createdTime = Date.now();

            return _apps.save().then((__apps) => {
                let query = {
                    '_id': groupId
                };
                return this.GroupsModel.findOne(query).then((group) => {
                    let appId = __apps._id;
                    let appIds = undefined === group.app_ids ? [] : group.app_ids;
                    appIds.push(appId);
                    let putGroup = {
                        $set: {
                            'app_ids': appIds
                        }
                    };
                    return this.GroupsModel.update(query, putGroup).then((result) => {
                        if (!result.ok) {
                            return Promise.reject(new Error());
                        }
                        return __apps;
                    });
                });
            }).then((__apps) => {
                let query = {
                    '_id': __apps._id
                };
                return this.AppsModel.findOne(query).select(this.project);
            }).then((app) => {
                apps[app._id] = app;
                ('function' === typeof callback) && callback(apps);
                return apps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        update(appId, putApp, callback) {
            let query = {
                '_id': appId
            };

            return this.AppsModel.update(query, {
                $set: putApp
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.AppsModel.findOne(query).select(this.project);
            }).then((app) => {
                return this.toObject(app._doc);
            }).then((apps) => {
                ('function' === typeof callback) && callback(apps);
                return apps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        remove(appId, callback) {
            let query = {
                '_id': appId
            };

            return this.AppsModel.update(query, {
                $set: {isDeleted: true}
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.AppsModel.findOne(query).select(this.project);
            }).then((app) => {
                return this.toObject(app._doc);
            }).then((apps) => {
                ('function' === typeof callback) && callback(apps);
                return apps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    };
    return new AppsModel();
})();
