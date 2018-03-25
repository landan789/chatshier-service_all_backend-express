
module.exports = (function() {
    let ModelCore = require('../cores/model');
    const APPS = 'apps';
    const USERS = 'users';
    const WEBHOOKS = 'webhooks';
    const LINE = 'LINE';
    const FACEBOOK = 'FACEBOOK';
    const CHATSHIER = 'CHATSHIER';
    class AppsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
            this.UsersModel = this.model(USERS, this.UsersSchema);
            this.WebhooksModel = this.model(WEBHOOKS, this.WebhooksSchema);
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
        find(appIds, webhookId, callback) {
            var apps = {};
            if (appIds && !(appIds instanceof Array)) {
                appIds = [appIds];
            };
            Promise.resolve().then(() => {
                if (!appIds) {
                    let query = {
                        'isDeleted': false
                    };
                    return this.AppsModel.find(query).then((__apps) => {
                        apps = __apps.reduce((output, app) => {
                            Object.assign(output, this.toObject(app._doc));
                            return output;
                        }, {});
                        return apps;
                    });
                }
                return Promise.all(appIds.map((appId) => {
                    let query = {
                        '_id': appId,
                        'isDeleted': false
                    };
                    return this.AppsModel.findOne(query).then((__apps) => {
                        let _apps = {
                            createdTime: __apps.createdTime,
                            updatedTime: __apps.updatedTime,
                            group_id: __apps.group_id,
                            id1: __apps.id1,
                            id2: __apps.id2,
                            isDeleted: __apps.isDeleted,
                            name: __apps.name,
                            secret: __apps.secret,
                            token1: __apps.token1,
                            token2: __apps.token2,
                            type: __apps.type,
                            webhook_id: __apps.webhook_id
                        };
                        apps = {
                            [appId]: _apps
                        };
                    });
                }));
            }).then(() => {
                ('function' === typeof callback) && callback(apps);
                return Promise.resolve(apps);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }

        insert(userId, postApp, callback) {
            let apps = {};
            let webhookId = this.Types.ObjectId();
            let _appId = this.Types.ObjectId();
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
            _apps.webhook_id = CHATSHIER === postApp.type ? _appId : webhookId;
            _apps.isDeleted = false;
            _apps.updatedTime = Date.now();
            _apps.createdTime = Date.now();

            return _apps.save().then((__apps) => {
                let query = {
                    '_id': __apps._id
                };
                return this.AppsModel.findOne(query).select(this.project);
            }).then((app) => {
                apps[app._id] = app;
                ('function' === typeof callback) && callback(apps);
                return Promise.resolve(apps);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
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
                return Promise.resolve(apps);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
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
                return Promise.resolve(apps);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }
    };
    return new AppsModel();
})();
