module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsRichmenusModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * 輸入 指定 appId 的陣列清單，取得該 App 所有圖文選單的資料
         *
         * @param {string|string[]} appIds
         * @param {any|string} [richmenuId]
         * @param {(appsRichmenus: any) => any} [callback]
         * @return {Promise<any>}
         */
        find(appIds, richmenuId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'richmenus.isDeleted': false
            };
            richmenuId && (query['richmenus._id'] = this.Types.ObjectId(richmenuId));

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$richmenus'
                }, {
                    // 尋找符合 ID 的欄位
                    $match: query
                }, {
                    // 篩選項目
                    $project: {
                        richmenus: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsRichmenus = {};
                if (0 === results.length) {
                    return appsRichmenus;
                }

                appsRichmenus = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { richmenus: {} };
                    Object.assign(output[app._id].richmenus, this.toObject(app.richmenus));
                    return output;
                }, {});

                return appsRichmenus;
            }).then((appsRichmenus) => {
                ('function' === typeof callback) && callback(appsRichmenus);
                return appsRichmenus;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 找到 圖文選單未刪除的資料包，不含 apps 結構
         *
         * @param {string|string[]} appIds
         * @param {(appsRichmenus: any) => any} [callback]
         * @return {Promise<any>}
         */
        findRichmenus(appIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'richmenus.isDeleted': false
            };

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$richmenus'
                }, {
                    // 尋找符合 ID 的欄位
                    $match: query
                }, {
                    // 篩選項目
                    $project: {
                        richmenus: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsRichmenus = {};
                if (0 === results.length) {
                    return appsRichmenus;
                }

                appsRichmenus = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.richmenus));
                    return output;
                }, {});

                return appsRichmenus;
            }).then((appsRichmenus) => {
                ('function' === typeof callback) && callback(appsRichmenus);
                return appsRichmenus;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 輸入 指定 appId 的陣列清單，新增一筆圖文選單的資料
         *
         * @param {string} appId
         * @param {any} postRichmenu
         * @param {(appsRichmenus: any) => any} [callback]
         * @return {Promise<any>}
         */
        insert(appId, postRichmenu, callback) {
            let richmenuId = this.Types.ObjectId();
            postRichmenu._id = richmenuId;

            return this.AppsModel.findById(appId).then((app) => {
                app.richmenus.push(postRichmenu);
                return app.save();
            }).then(() => {
                return this.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                ('function' === typeof callback) && callback(appsRichmenus);
                return appsRichmenus;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 輸入 指定 appId 的陣列清單，修改一筆圖文選單的資料
         *
         * @param {string} appId
         * @param {string} richmenuId
         * @param {any} putRichmenu
         * @param {(appsRichmenus: any) => any} [callback]
         * @return {Promise<any>}
         */
        update(appId, richmenuId, putRichmenu, callback) {
            putRichmenu._id = richmenuId;
            putRichmenu.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(appId),
                'richmenus._id': richmenuId
            };

            let updateOper = { $set: {} };
            for (let prop in putRichmenu) {
                updateOper.$set['richmenus.$.' + prop] = putRichmenu[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                ('function' === typeof callback) && callback(appsRichmenus);
                return appsRichmenus;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} richmenuId
         * @param {(appsRichmenus: any) => any} [callback]
         * @return {Promise<any>}
         */
        remove(appId, richmenuId, callback) {
            let richmenu = {
                _id: richmenuId,
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId),
                'richmenus._id': this.Types.ObjectId(richmenuId)
            };

            let updateOper = { $set: {} };
            for (let prop in richmenu) {
                updateOper.$set['richmenus.$.' + prop] = richmenu[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [
                    {
                        $unwind: '$richmenus'
                    }, {
                        $match: query
                    }, {
                        $project: {
                            richmenus: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsRichmenus = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsRichmenus = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { richmenus: {} };
                        Object.assign(output[app._id].richmenus, this.toObject(app.richmenus));
                        return output;
                    }, {});
                    return appsRichmenus;
                });
            }).then((appsRichmenus) => {
                ('function' === typeof callback) && callback(appsRichmenus);
                return appsRichmenus;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsRichmenusModel();
})();
