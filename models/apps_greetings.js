module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsGreetingsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * 輸入全部的 appId 取得該 App 所有加好友回覆的資料
         *
         * @param {string | string[]} appIds
         * @param {string} [greetingId]
         * @param {(appsGreetings: Chatshier.Models.AppsGreetings | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsGreetings | null>}
         */
        find(appIds, greetingId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let match = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'greetings.isDeleted': false
            };
            greetingId && (match['greetings._id'] = this.Types.ObjectId(greetingId));

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$greetings'
                }, {
                    // 尋找符合 ID 的欄位
                    $match: match
                }, {
                    // 篩選項目
                    $project: {
                        greetings: 1
                    }
                }, {
                    $sort: {
                        'greetings.createdTime': -1 // 最晚建立的在最前頭
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsGreetings = {};
                if (0 === results.length) {
                    return appsGreetings;
                }

                appsGreetings = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { greetings: {} };
                    Object.assign(output[app._id].greetings, this.toObject(app.greetings));
                    return output;
                }, {});

                return appsGreetings;
            }).then((appsGreetings) => {
                ('function' === typeof callback) && callback(appsGreetings);
                return appsGreetings;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 找到 加好友回覆未刪除的資料包，不含 apps 結構
         *
         * @param {string | string[]} appIds
         * @param {(greetings: Chatshier.Models.Greetings | null) => any} [callback]
         * @return {Promise<Chatshier.Models.Greetings | null>}
         */
        findGreetings(appIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$greetings'
                }, {
                    $match: {
                        // 尋找符合 ID 的欄位
                        '_id': {
                            $in: appIds.map((appId) => this.Types.ObjectId(appId))
                        },
                        'greetings.isDeleted': false
                    }
                }, {
                    // 篩選項目
                    $project: {
                        greetings: 1
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let greetings = {};
                if (0 === results.length) {
                    return greetings;
                }

                greetings = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.greetings));
                    return output;
                }, {});

                return greetings;
            }).then((greetings) => {
                ('function' === typeof callback) && callback(greetings);
                return greetings;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 輸入指定的 appId 新增一筆加好友回覆的資料
         *
         * @param {string} appId
         * @param {any} postGreeting
         * @param {(appsGreetings: Chatshier.Models.AppsGreetings | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsGreetings | null>}
         */
        insert(appId, postGreeting, callback) {
            let greetId = this.Types.ObjectId();
            postGreeting._id = greetId;
            postGreeting.createdTime = Date.now();
            postGreeting.updatedTime = Date.now();

            return this.AppsModel.findById(appId).then((app) => {
                app.greetings.push(postGreeting);
                return app.save();
            }).then(() => {
                return this.find(appId, greetId.toHexString());
            }).then((appsGreetings) => {
                ('function' === typeof callback) && callback(appsGreetings);
                return appsGreetings;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 輸入指定的 appId 修改一筆加好友回覆的資料
         *
         * @param {string} appId
         * @param {string} greetingId
         * @param {(appsGreetings: Chatshier.Models.AppsGreetings | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsGreetings | null>}
         */
        update(appId, greetingId, putGreeting, callback) {
            putGreeting._id = greetingId;
            putGreeting.updatedTime = Date.now();

            let conditions = {
                '_id': appId,
                'greetings._id': greetingId
            };

            let doc = { $set: {} };
            for (let prop in putGreeting) {
                doc.$set[`greetings.$.${prop}`] = putGreeting[prop];
            }

            return this.AppsModel.update(conditions, doc).then(() => {
                return this.find(appId, greetingId);
            }).then((appsGreetings) => {
                ('function' === typeof callback) && callback(appsGreetings);
                return appsGreetings;
            }).catch((ERR) => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 輸入指定的 appId 與 greetingId 刪除該加好友回覆的資料
         *
         * @param {string} appId
         * @param {string} greetingId
         * @param {(appsGreetings: Chatshier.Models.AppsGreetings | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsGreetings | null>}
         */
        remove(appId, greetingId, callback) {
            let conditions = {
                '_id': this.Types.ObjectId(appId),
                'greetings._id': this.Types.ObjectId(greetingId)
            };

            let setGreeting = {
                $set: {
                    'greetings.$.isDeleted': true,
                    'greetings.$.updatedTime': Date.now()
                }
            };

            return this.AppsModel.update(conditions, setGreeting).then(() => {
                let match = Object.assign({}, conditions);
                let aggregations = [
                    {
                        $unwind: '$greetings'
                    }, {
                        $match: match
                    }, {
                        $project: {
                            greetings: 1
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appGreetings = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appGreetings = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || {greetings: {}};
                        Object.assign(output[app._id].greetings, this.toObject(app.greetings));
                        return output;
                    }, {});
                    return appGreetings;
                });
            }).then((appGreetings) => {
                ('function' === typeof callback) && callback(appGreetings);
                return appGreetings;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };
    }
    return new AppsGreetingsModel();
})();
