
module.exports = (function() {
    let ModelCore = require('../cores/model');
    let APPSCOLLECTION = 'apps';
    let USERSCOLLECTION = 'users';
    let WEBHOOKCOLLECTION = 'webhooks';
    class AppsModel extends ModelCore {
        constructor() {
            super();
            this.AppModel = this.model(APPSCOLLECTION, this.AppSchema);
            this.UserModel = this.model(USERSCOLLECTION, this.UserSchema);
            this.WebhookModel = this.model(WEBHOOKCOLLECTION, this.WebhookSchema);
        }
        find(appIds, webhookId, callback) {
            var apps = {};
            if ('string' === typeof appIds) {
                appIds = [appIds];
            };
            Promise.resolve().then(() => {
                if (0 === appIds.length) {
                    return this.AppModel.find().then((__apps) => {
                        apps = __apps;
                    });
                }
                return Promise.all(appIds.map((appId) => {
                    let query = {
                        '_id': appId,
                        'isDeleted': false
                    };
                    return this.AppModel.findOne(query).then((__apps) => {
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
            let _apps = new this.AppModel();
            _apps.id1 = postApp.id1 || '';
            _apps.id2 = postApp.id2 || '';
            _apps.name = postApp.name || '';
            _apps.secret = postApp.secret || '';
            _apps.token1 = postApp.token1 || '';
            _apps.token2 = postApp.token2 || '';
            _apps.type = postApp.type || '';
            _apps.group_id = postApp.group_id;
            _apps.webhook_id = postApp.webhook_id;
            _apps.isDeleted = 0;
            _apps.updatedTime = Date.now();
            _apps.createdTime = Date.now();
            _apps.webhook_id = postApp.webhook_id;
            return _apps.save().then((__apps) => {
                let query = {
                    '_id': __apps._id
                };
                return this.AppModel.findOne(query);
            }).then((apps) => {
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
            let apps = {};
            return this.AppModel.update(query, {
                $set: putApp
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.AppModel.findOne(query);
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
            return this.AppModel.update(query, {
                $set: {isDeleted: 'true'}
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.AppModel.findOne(query);
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
