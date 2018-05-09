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
         * @param {string|string[]} appIds
         * @param {any|string} greetingId
         * @param {(appsGreetings: any) => any} [callback]
         * @return {Promise<any>}
         */
        find(appIds, greetingId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'greetings.isDeleted': false
            };
            greetingId && (query['greetings._id'] = this.Types.ObjectId(greetingId));

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$greetings'
                }, {
                    // 尋找符合 ID 的欄位
                    $match: query
                }, {
                    // 篩選項目
                    $project: {
                        greetings: 1
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
         * @param {string|string[]} appIds
         * @param {(greetings: any) => any} [callback]
         * @return {Promise<any>}
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
         * @param {(appsGreetings: any) => any} [callback]
         * @returns {Promise<any>}
         */
        insert(appId, postGreeting, callback) {
            let greetId = this.Types.ObjectId();
            postGreeting._id = greetId;

            return this.AppsModel.findById(appId).then((app) => {
                app.greetings.push(postGreeting);
                return app.save();
            }).then(() => {
                return this.find(appId, greetId);
            }).then((appsGreetings) => {
                ('function' === typeof callback) && callback(appsGreetings);
                return appsGreetings;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 輸入指定的 appId 與 greetingId 刪除該加好友回覆的資料
         *
         * @param {string} appId
         * @param {string} greetingId
         * @param {(appsGreetings: any) => any} [callback]
         * @returns {Promise<any>}
         */
        remove(appId, greetingId, callback) {
            let query = {
                '_id': this.Types.ObjectId(appId),
                'greetings._id': this.Types.ObjectId(greetingId)
            };

            let setGreeting = {
                $set: {
                    'greetings.$.isDeleted': true,
                    'greetings.$.updatedTime': Date.now()
                }
            };

            return this.AppsModel.update(query, setGreeting).then(() => {
                let aggregations = [
                    {
                        $unwind: '$greetings'
                    }, {
                        $match: query
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
