// 原 apps_tags.js

module.exports = (function() {
    const ModelCore = require('../cores/model');
    const APPS = 'apps';

    const FieldsTypes = Object.freeze({
        SYSTEM: 'SYSTEM',
        DEFAULT: 'DEFAULT',
        CUSTOM: 'CUSTOM'
    });

    const SetsTypes = Object.freeze({
        TEXT: 'TEXT',
        NUMBER: 'NUMBER',
        DATE: 'DATE',
        SELECT: 'SELECT',
        MULTI_SELECT: 'MULTI_SELECT',
        CHECKBOX: 'CHECKBOX'
    });

    const defaultFields = [
        {
            text: 'Name',
            alias: 'name',
            type: FieldsTypes.SYSTEM,
            sets: [''],
            setsType: SetsTypes.TEXT
        }, {
            text: 'Age',
            alias: 'age',
            type: FieldsTypes.DEFAULT,
            sets: [0],
            setsType: SetsTypes.NUMBER
        }, {
            text: 'Gender',
            alias: 'gender',
            type: FieldsTypes.DEFAULT,
            sets: ['MALE', 'FEMALE'],
            setsType: SetsTypes.SELECT
        }, {
            text: 'Email',
            alias: 'email',
            type: FieldsTypes.DEFAULT,
            sets: [''],
            setsType: SetsTypes.TEXT
        }, {
            text: 'Phone',
            alias: 'phone',
            type: FieldsTypes.DEFAULT,
            sets: [''],
            setsType: SetsTypes.TEXT
        }, {
            text: 'Assigned',
            alias: 'assigned',
            type: FieldsTypes.DEFAULT,
            sets: [''],
            setsType: SetsTypes.MULTI_SELECT
        }, {
            text: 'First chat date',
            alias: 'firstChat',
            type: FieldsTypes.SYSTEM,
            sets: [0],
            setsType: SetsTypes.DATE
        }, {
            text: 'Recent chat date',
            alias: 'recentChat',
            type: FieldsTypes.SYSTEM,
            sets: [0],
            setsType: SetsTypes.DATE
        }, {
            text: 'Chat time(s)',
            alias: 'chatTimeCount',
            type: FieldsTypes.SYSTEM,
            sets: [0],
            setsType: SetsTypes.NUMBER
        }, {
            text: 'Remark',
            alias: 'remark',
            type: FieldsTypes.DEFAULT,
            sets: [''],
            setsType: SetsTypes.TEXT
        }
    ];

    const docUnwind = {
        $unwind: '$fields' // 只針對 document 處理
    };

    const docOutput = {
        // 篩選輸出項目
        $project: {
            fields: 1
        }
    };

    class AppsFieldsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);

            this.FieldsTypes = FieldsTypes;
            this.SetsTypes = SetsTypes;
        }

        /**
         * 為了將資料欄位 tags 符合前端因此暫時使用此方法將欄位名稱做轉換
         *
         * @param {any} appsFields
         */
        replaceToTags(appsFields) {
            if (!(appsFields && Object.keys(appsFields).length > 0)) {
                return appsFields;
            }

            let appsTags = {};
            for (let appId in appsFields) {
                appsTags[appId] = {};
                appsTags[appId].tags = appsFields[appId].fields;
            }
            return appsTags;
        }

        /**
         * 根據輸入的 appId 陣列清單取得所有的客戶分類條件
         *
         * @param {string|string[]} appIds
         * @param {any|null} fieldId
         * @param {(appsField: any|null) => any} [callback]
         */
        find(appIds, fieldId, callback) {
            if (!(appIds instanceof Array)) {
                appIds = [appIds];
            }

            let query = {
                // 尋找符合的欄位
                '_id': {
                    $in: appIds.map((fieldId) => this.Types.ObjectId(fieldId))
                },
                'isDeleted': false
            };
            if (fieldId) {
                query['fields._id'] = this.Types.ObjectId(fieldId);
                query['fields.isDeleted'] = false;
            }

            let aggregations = [
                docUnwind,
                {
                    $match: query
                },
                docOutput
            ];
            return this.AppsModel.aggregate(aggregations).then((results) => {
                if (0 === results.length) {
                    let appsTags = {};
                    return Promise.resolve(appsTags);
                }

                let appsFields = results.reduce((output, curr) => {
                    if (!output[curr._id]) {
                        output[curr._id] = {
                            fields: {}
                        };
                    }
                    Object.assign(output[curr._id].fields, this.toObject(curr.fields));
                    return output;
                }, {});
                return this.replaceToTags(appsFields);
            }).then((appsTags) => {
                ('function' === typeof callback) && callback(appsTags);
                return appsTags;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {any} field
         * @param {(appsField: any|null) => any} [callback]
         */
        insert(appId, field, callback) {
            field = field || {};

            let fieldId = this.Types.ObjectId();
            field._id = fieldId;
            field.createdTime = field.updatedTime = Date.now();

            let query = {
                '_id': appId
            };

            let updateOper = {
                $push: {
                    fields: field
                }
            };

            return this.AppsModel.update(query, updateOper).then(() => {
                return this.find(appId, fieldId);
            }).then((appsFields) => {
                ('function' === typeof callback) && callback(appsFields);
                return appsFields;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 將預設的 tag 資料批次新增到指定的 app 裡，完成插入後回傳所有 tag ID
         *
         * @param {string} appId
         * @param {(appsField: any|null) => any} callback
         */
        insertDefaultTags(appId, callback) {
            let appsTags = {
                [appId]: {
                    tags: {}
                }
            };

            return Promise.all(defaultFields.map((field, i) => {
                field.order = i;
                return this.insert(appId, field).then((_appsTags) => {
                    _appsTags && Object.assign(appsTags[appId].tags, _appsTags[appId].tags);
                    return _appsTags;
                });
            })).then(() => {
                ('function' === typeof callback) && callback(appsTags);
                return appsTags;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} fieldId
         * @param {any} field
         * @param {(appsField: any|null) => any} [callback]
         */
        update(appId, fieldId, field, callback) {
            field = field || {};
            field._id = fieldId;
            field.updatedTime = Date.now();

            let query = {
                '_id': appId,
                'fields._id': fieldId
            };

            let updateOper = { $set: {} };
            for (let prop in field) {
                updateOper.$set['fields.$.' + prop] = field[prop];
            }

            return this.AppsModel.update(query, updateOper, { new: false }).then(() => {
                return this.find(appId, fieldId);
            }).then((appsFields) => {
                ('function' === typeof callback) && callback(appsFields);
                return appsFields;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} appId
         * @param {string} fieldId
         * @param {(appsField: any|null) => any} [callback]
         */
        remove(appId, fieldId, callback) {
            let field = {
                _id: fieldId,
                isDeleted: true,
                updatedTime: Date.now()
            };

            let query = {
                '_id': this.Types.ObjectId(appId),
                'fields._id': this.Types.ObjectId(fieldId)
            };

            let updateOper = { $set: {} };
            for (let prop in field) {
                updateOper.$set['fields.$.' + prop] = field[prop];
            }

            return this.AppsModel.update(query, updateOper).then(() => {
                let aggregations = [
                    docUnwind,
                    {
                        $match: query
                    },
                    docOutput
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    let appsFields = results.reduce((output, curr) => {
                        if (!output[curr._id]) {
                            output[curr._id] = {
                                fields: {}
                            };
                        }
                        Object.assign(output[curr._id].fields, this.toObject(curr.fields));
                        return output;
                    }, {});
                    return this.replaceToTags(appsFields);
                });
            }).then((appsFields) => {
                ('function' === typeof callback) && callback(appsFields);
                return appsFields;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }

    return new AppsFieldsModel();
})();
