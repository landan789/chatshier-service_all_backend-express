const appsMdl = require('../models/apps');
const appsFieldsMdl = require('../models/apps_fields');
const mongoose = require('mongoose');

const SYSTEM = 'SYSTEM';
const DEFAULT = 'DEFAULT';
const CUSTOM = 'CUSTOM';

console.log('[START] start checking field for address');
appsMdl.find().then((apps) => {
    if (!apps) {
        return Promise.resolve();
    }

    let appIds = Object.keys(apps);
    let nextApps = (i) => {
        if (i >= appIds.length) {
            return Promise.resolve();
        }

        return Promise.resolve().then(() => {
            let appId = appIds[i];

            return appsFieldsMdl.find(appId).then((appsFields) => {
                if (!(appsFields && appsFields[appId])) {
                    return Promise.resolve(null);
                }

                let fields = appsFields[appId].fields;
                let fieldIds = Object.keys(fields).filter((fieldId) => {
                    return CUSTOM !== fields[fieldId].type;
                });

                let _fields = {};
                let isIncludeAddress = false;
                fieldIds.forEach((fieldId) => {
                    let field = Object.assign({}, fields[fieldId]);
                    if ('Address' === field.text &&
                        'address' === field.alias &&
                        DEFAULT === field.type) {
                        isIncludeAddress = true;
                        return;
                    }

                    // 將預設的 fields 按照指定的順序做排序
                    if ('age' === field.alias) {
                        field.order = 0;
                    } else if ('gender' === field.alias) {
                        field.order = 1;
                    } else if ('email' === field.alias) {
                        field.order = 2;
                    } else if ('phone' === field.alias) {
                        field.order = 3;
                    } else if ('address' === field.alias) {
                        field.order = 4;
                    } else if ('remark' === field.alias) {
                        field.order = 5;
                    }
                    _fields[fieldId] = field;
                });

                if (isIncludeAddress) {
                    return Promise.resolve(null);
                }

                let addressField = {
                    text: 'Address',
                    alias: 'address',
                    type: appsFieldsMdl.FieldsTypes.DEFAULT,
                    sets: [],
                    setsType: appsFieldsMdl.SetsTypes.TEXT,
                    order: 4
                };

                console.log('[INFO] insert field of address in app "' + apps[appId].name + '"');
                return Promise.all([
                    appsFieldsMdl.insert(appId, addressField),
                    Promise.all(fieldIds.map((fieldId) => {
                        if (fields[fieldId].order === _fields[fieldId].order) {
                            return Promise.resolve(null);
                        }

                        console.log('[INFO] update order of field "' + fields[fieldId].alias + '"');
                        let _putField = {
                            order: _fields[fieldId].order
                        };
                        return appsFieldsMdl.update(appId, fieldId, _putField);
                    }))
                ]);
            });
        }).then(() => {
            return nextApps(i + 1);
        });
    };
    return nextApps(0);
}).catch((err) => {
    console.error(err);
}).then(() => {
    console.log('[END] finish checking');
    return mongoose.disconnect();
});
