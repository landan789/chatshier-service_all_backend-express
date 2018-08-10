
module.exports = (function() {
    const ModelCore = require('../cores/model');
    const CHATSHIER_CFG = require('../config/chatshier');
    const gcalendarHlp = require('../helpers/gcalendar');

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
                isDeleted: true,
                createdTime: true,
                updatedTime: true,
                name: true,
                id1: true,
                id2: true,
                group_id: true,
                secret: true,
                token1: true,
                token2: true,
                type: true,
                webhook_id: true,
                gcalendarId: true
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

            let sortArgs = {
                createdTime: -1
            };

            return this.AppsModel.find(_query, this.project).sort(sortArgs).then((results) => {
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
            let appId = this.Types.ObjectId();
            let webhookId = this.Types.ObjectId().toHexString();
            let groupId = postApp.group_id;

            /** @type {Chatshier.Models.App} */
            let _app = {
                _id: appId,
                id1: postApp.id1 || '',
                id2: postApp.id2 || '',
                name: postApp.name || '',
                secret: postApp.secret || '',
                token1: postApp.token1 || '',
                token2: postApp.token2 || '',
                type: postApp.type || '',
                group_id: postApp.group_id,
                webhook_id: CHATSHIER === postApp.type ? '' : webhookId,
                gcalendarId: postApp.gcalendarId || '',
                isDeleted: false,
                updatedTime: Date.now(),
                createdTime: Date.now()
            };

            let summary = '[' + _app.name + '] - ' + appId.toHexString();
            let description = 'Created by ' + CHATSHIER_CFG.GMAIL.USER;

            return gcalendarHlp.insertCalendar(summary, description).then((gcalendar) => {
                _app.gcalendarId = gcalendar.id;
                let newApp = new this.AppsModel(_app);
                return newApp.save();
            }).then((__apps) => {
                let query = {
                    '_id': groupId
                };

                return this.GroupsModel.findOne(query).then((group) => {
                    let _appId = __apps._id;
                    let appIds = undefined === group.app_ids ? [] : group.app_ids;
                    appIds.push(_appId);
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
            }).then(() => {
                return this.find(appId.toHexString());
            }).then((apps) => {
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

            let doc = { $set: {} };
            for (let prop in putApp) {
                doc.$set[prop] = putApp[prop];
            }

            return this.AppsModel.update(query, doc).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.find(appId);
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
            let putApp = {
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId)
            };

            let doc = {
                $set: putApp
            };

            return this.AppsModel.update(query, doc).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                }
                return this.find(appId, void 0, { isDeleted: true });
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
