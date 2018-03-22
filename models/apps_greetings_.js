module.exports = (function() {
    const ModelCore = require('../cores/model');

    const APPS = 'apps';
    const GREETINGS_DID_NOT_FOUND = 'GREETINGS_DID_NOT_FOUND';

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
            return Promise.resolve().then(() => {
                let aggregations = [
                    {
                        // 只針對特定 document 處理
                        $unwind: '$greetings'
                    }, {
                        // 篩選項目
                        $project: {
                            greetings: 1
                        }
                    }
                ];

                if (!greetingId) {
                    aggregations.push({
                        $match: {
                            // 尋找符合 ID 的欄位
                            '_id': {
                                $in: appIds.map((appId) => this.Types.ObjectId(appId))
                            }
                        }
                    });
                    return this.AppsModel.aggregate(aggregations);
                }

                aggregations.push({
                    $match: {
                        // 尋找符合 ID 的欄位
                        '_id': {
                            $in: appIds.map((appId) => this.Types.ObjectId(appId))
                        },
                        'greetings._id': this.Types.ObjectId(greetingId)
                    }
                });
                return this.AppsModel.aggregate(aggregations);
            }).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error(GREETINGS_DID_NOT_FOUND));
                }

                let appsGreetings = results.reduce((output, curr) => {
                    output[curr._id] = output[curr._id] || { greetings: {} };
                    Object.assign(output[curr._id].greetings, this.toObject(curr.greetings));
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
        };
        /**
         * 找到 加好友回覆未刪除的資料包，不含 apps 結構
         *
         * @param {string} appId
         * @param {(appsGreetings: any) => any} [callback]
         * @return {Promise<any>}
         */

        findGreetings(appId, callback) {
            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$greetings'
                }, {
                    $match: {
                        // 尋找符合 ID 的欄位
                        '_id': this.Types.ObjectId(appId)
                    }
                }, {
                    // 篩選項目
                    $project: {
                        greetings: 1
                    }
                }
            ];
            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error(GREETINGS_DID_NOT_FOUND));
                }

                let greetings = results.reduce((output, curr) => {
                    Object.assign(output, this.toObject(curr.greetings));
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
            }).then((calendars) => {
                ('function' === typeof callback) && callback(calendars);
                return Promise.resolve(calendars);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        };

        /**
         * 輸入指定的 appId 與 greetingId 刪除該加好友回覆的資料
         *
         * @param {string} appId
         * @param {string} greetingId
         * @param {(appsGreetings: any) => any} [callback]
         * @return {Promise<any>}
         */
        remove(appId, greetingId, callback) {
            let greetingQuery = {
                '_id': appId,
                'greetings._id': greetingId
            };
            let setGreeting = {
                $set: {
                    'greetings.$.isDeleted': true
                }
            };
            return this.AppsModel.update(greetingQuery, setGreeting).then((updateResult) => {
                if (!updateResult.ok) {
                    return Promise.reject(new Error());
                }

                let aggregations = [
                    {
                        $unwind: '$greetings'
                    }, {
                        $match: {
                            '_id': this.Types.ObjectId(appId),
                            'greetings._id': this.Types.ObjectId(greetingId)
                        }
                    }, {
                        $project: {
                            greetings: 1
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations);
            }).then((results) => {
                if (0 === results.length) {
                    return Promise.reject(new Error(GREETINGS_DID_NOT_FOUND));
                }

                let appGreetings = results.reduce((appGreeting, curr) => {
                    appGreeting[curr._id] = appGreeting[curr._id] || {greetings: {}};
                    Object.assign(appGreeting[curr._id].greetings, this.toObject(curr.greetings));
                    return appGreeting;
                }, {});
                return appGreetings;
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