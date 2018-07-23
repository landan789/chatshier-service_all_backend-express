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
            text: 'Age',
            alias: 'age',
            type: FieldsTypes.DEFAULT,
            sets: [],
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
            sets: [],
            setsType: SetsTypes.TEXT
        }, {
            text: 'Phone',
            alias: 'phone',
            type: FieldsTypes.DEFAULT,
            sets: [],
            setsType: SetsTypes.TEXT
        }, {
            text: 'Address',
            alias: 'address',
            type: FieldsTypes.DEFAULT,
            sets: [],
            setsType: SetsTypes.TEXT
        }, {
            text: 'Remark',
            alias: 'remark',
            type: FieldsTypes.DEFAULT,
            sets: [],
            setsType: SetsTypes.TEXT
        }
    ];

    class AppsFieldsModel extends ModelCore {
        constructor() {
            super();
            this.AppsModel = this.model(APPS, this.AppsSchema);

            this.FieldsTypes = FieldsTypes;
            this.SetsTypes = SetsTypes;
        }

        /**
         * 根據輸入的 appId 陣列清單取得所有的客戶分類條件
         *
         * @param {string | string[]} appIds
         * @param {string} [fieldId]
         * @param {(appsField: Chatshier.Models.AppsFields | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsFields | null>}
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
                'isDeleted': false,
                'fields.isDeleted': false
            };
            if (fieldId) {
                query['fields._id'] = this.Types.ObjectId(fieldId);
            }

            let aggregations = [
                {
                    $unwind: '$fields' // 只針對 document 處理
                }, {
                    $match: query
                }, {
                    // 篩選輸出項目
                    $project: {
                        fields: 1
                    }
                }
            ];

            return this.AppsModel.aggregate(aggregations).then((results) => {
                let appsFields = {};
                if (0 === results.length) {
                    return appsFields;
                }

                appsFields = results.reduce((output, app) => {
                    if (!output[app._id]) {
                        output[app._id] = {
                            fields: {}
                        };
                    }
                    Object.assign(output[app._id].fields, this.toObject(app.fields));
                    return output;
                }, {});
                return appsFields;
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
         * @param {any} field
         * @param {(appsField: Chatshier.Models.AppsFields | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsFields | null>}
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
                return this.find(appId, fieldId.toHexString());
            }).then((appsFields) => {
                ('function' === typeof callback) && callback(appsFields);
                return appsFields;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        };

        /**
         * 將預設的 field 資料批次新增到指定的 app 裡，完成插入後回傳所有 field ID
         *
         * @param {string} appId
         * @param {(appsFields: Chatshier.Models.AppsFields | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsFields | null>}
         */
        insertDefaultFields(appId, callback) {
            let appsFields = {
                [appId]: {
                    fields: {}
                }
            };

            return Promise.all(defaultFields.map((field, i) => {
                field.order = i;
                return this.insert(appId, field).then((_appsFields) => {
                    _appsFields && Object.assign(appsFields[appId].fields, _appsFields[appId].fields);
                    return _appsFields;
                });
            })).then(() => {
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
         * @param {any} field
         * @param {(appsField: Chatshier.Models.AppsFields | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsFields | null>}
         */
        update(appId, fieldId, field, callback) {
            field = field || {};
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
         * @param {(appsField: Chatshier.Models.AppsFields | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.AppsFields | null>}
         */
        remove(appId, fieldId, callback) {
            let field = {
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
                    {
                        $unwind: '$fields' // 只針對 document 處理
                    }, {
                        $match: query
                    }, {
                        // 篩選輸出項目
                        $project: {
                            fields: 1
                        }
                    }
                ];

                return this.AppsModel.aggregate(aggregations).then((results) => {
                    let appsFields = {};
                    if (0 === results.length) {
                        return Promise.reject(new Error());
                    }

                    appsFields = results.reduce((output, app) => {
                        if (!output[app._id]) {
                            output[app._id] = {
                                fields: {}
                            };
                        }
                        Object.assign(output[app._id].fields, this.toObject(app.fields));
                        return output;
                    }, {});
                    return appsFields;
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
