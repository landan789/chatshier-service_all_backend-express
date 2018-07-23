module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    class AppsImagemapsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);
        }

        /**
         * @param {string | string[]} appIds
         * @param {string} [imagemapId]
         * @param {(appsImagemaps: Chatshier.Models.AppsImagemaps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsImagemaps | null>}
         */
        find(appIds, imagemapId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'imagemaps.isDeleted': false
            };
            imagemapId && (query['imagemaps._id'] = this.Types.ObjectId(imagemapId));

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$imagemaps'
                }, {
                    // 尋找符合 ID 的欄位
                    $match: query
                }, {
                    // 篩選項目
                    $project: {
                        imagemaps: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsImagemaps = {};
                if (0 === results.length) {
                    return appsImagemaps;
                }
                appsImagemaps = results.reduce((output, app) => {
                    output[app._id] = output[app._id] || { imagemaps: {} };
                    Object.assign(output[app._id].imagemaps, this.toObject(app.imagemaps));
                    return output;
                }, {});
                return appsImagemaps;
            }).then((appsImagemaps) => {
                ('function' === typeof callback) && callback(appsImagemaps);
                return appsImagemaps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 找到 圖文訊息未刪除的資料包，不含 apps 結構
         *
         * @param {string | string[]} appIds
         * @param {(appsImagemaps: Chatshier.Models.Imagemaps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Imagemaps | null>}
         */
        findImagemaps(appIds, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                '_id': {
                    $in: appIds.map((appId) => this.Types.ObjectId(appId))
                },
                'isDeleted': false,
                'imagemaps.isDeleted': false
            };

            let aggregations = [
                {
                    // 只針對特定 document 處理
                    $unwind: '$imagemaps'
                }, {
                    // 尋找符合 ID 的欄位
                    $match: query
                }, {
                    // 篩選項目
                    $project: {
                        imagemaps: true
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsImagemaps = {};
                if (0 === results.length) {
                    return appsImagemaps;
                }

                appsImagemaps = results.reduce((output, app) => {
                    Object.assign(output, this.toObject(app.imagemaps));
                    return output;
                }, {});

                return appsImagemaps;
            }).then((appsImagemaps) => {
                ('function' === typeof callback) && callback(appsImagemaps);
                return appsImagemaps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} postImagemap
         * @param {(appsImagemaps: Chatshier.Models.AppsImagemaps | null) => any} [callback]
         * @return {Promise<Chatshier.Models.AppsImagemaps | null>}
         */
        insert(appId, postImagemap, callback) {
            let imagemapId = this.Types.ObjectId();
            postImagemap._id = imagemapId;
            return this.AppsModel.findById(appId).then((app) => {
                app.imagemaps.push(postImagemap);
                return app.save();
            }).then(() => {
                return this.find(appId, imagemapId.toHexString());
            }).then((appsImagemaps) => {
                ('function' === typeof callback) && callback(appsImagemaps);
                return appsImagemaps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * 輸入 指定 appId 的陣列清單，修改一筆圖文訊息的資料
         *
         * @param {string} appId
         * @param {string} imagemapId
         * @param {any} putImagemap
         * @param {(appsImagemaps: Chatshier.Models.AppsImagemaps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsImagemaps | null>}
         */
        update(appId, imagemapId, putImagemap, callback) {
            putImagemap._id = imagemapId;
            putImagemap.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'imagemaps._id': imagemapId
            };

            let updateOper = { $set: {} };
            for (let prop in putImagemap) {
                updateOper.$set[`imagemaps.$.${prop}`] = putImagemap[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, imagemapId);
            }).then((appsImagemaps) => {
                ('function' === typeof callback) && callback(appsImagemaps);
                return appsImagemaps;
            }).catch((ERR) => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         *
         * @param {string} appId
         * @param {string} imagemapId
         * @param {(appsImagemaps: Chatshier.Models.AppsImagemaps | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsImagemaps | null>}
         */
        remove(appId, imagemapId, callback) {
            let query = {
                '_id': appId,
                'imagemaps._id': imagemapId
            };

            let operate = {
                $set: {
                    'imagemaps.$.isDeleted': true,
                    'imagemaps.$.updatedTime': Date.now()
                }
            };

            return this.AppsModel.update(query, operate).then(() => {
                let aggregations = [
                    {
                        $unwind: '$imagemaps'
                    }, {
                        $project: {
                            imagemaps: true
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsImagemaps = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsImagemaps = results.reduce((output, app) => {
                        output[app._id] = output[app._id] || { imagemaps: {} };
                        Object.assign(output[app._id].imagemaps, this.toObject(app.imagemaps));
                        return output;
                    }, {});
                    return appsImagemaps;
                });
            }).then((appsImagemaps) => {
                ('function' === typeof callback) && callback(appsImagemaps);
                return appsImagemaps;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsImagemapsModel();
})();
