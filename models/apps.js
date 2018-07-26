
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
                secret: true,
                token1: true,
                token2: true,
                type: true,
                createdTime: true,
                updatedTime: true,
                webhook_id: true,
                isDeleted: true,
                hasAgentName: true
            };
        }

        /**
         * @param {string|string[]} [appIds]
         * @param {string} [webhookId]
         * @param {any} [query]
         * @param {(apps: Chatshier.Models.Apps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Apps | null>}
         */
        find(appIds, webhookId, query, callback) {
            if (appIds && !(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let _query = query || { isDeleted: false };
            appIds instanceof Array && (_query._id = { $in: appIds.map((appId) => this.Types.ObjectId(appId)) });
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

        /**
         * @param {any} postApp
         * @param {(apps: Chatshier.Models.Apps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Apps | null>}
         */
        insert(postApp, callback) {
            let _appId = this.Types.ObjectId();
            let webhookId = this.Types.ObjectId().toHexString();
            let groupId = postApp.group_id;

            /** @type {Chatshier.Models.App} */
            let _apps = {
                _id: _appId,
                id1: postApp.id1 || '',
                id2: postApp.id2 || '',
                name: postApp.name || '',
                secret: postApp.secret || '',
                token1: postApp.token1 || '',
                token2: postApp.token2 || '',
                type: postApp.type || '',
                group_id: postApp.group_id,
                webhook_id: CHATSHIER === postApp.type ? '' : webhookId,
                isDeleted: false,
                updatedTime: Date.now(),
                createdTime: Date.now(),
                hasAgentName: true
            };
            let newApp = new this.AppsModel(_apps);

            return newApp.save().then((__apps) => {
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
                let apps = {
                    [app._id]: app
                };
                ('function' === typeof callback) && callback(apps);
                return apps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * @param {string} appId
         * @param {any} putApp
         * @param {(apps: Chatshier.Models.Apps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Apps | null>}
         */
        update(appId, putApp, callback) {
            putApp = putApp || {};
            putApp.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId)
            };

            let doc = {
                $set: putApp
            };

            return this.AppsModel.update(query, doc).then((result) => {
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

        /**
         * @param {string} appId
         * @param {(apps: Chatshier.Models.Apps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Apps | null>}
         */
        remove(appId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId)
            };

            let doc = {
                $set: {
                    isDeleted: true,
                    updatedTime: Date.now()
                }
            };

            return this.AppsModel.update(query, doc).then((result) => {
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
