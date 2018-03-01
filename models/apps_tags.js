module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    const typeEnum = Object.freeze({
        SYSTEM: 'SYSTEM',
        DEFAULT: 'DEFAULT',
        CUSTOM: 'CUSTOM'
    });

    const setsTypeEnum = Object.freeze({
        TEXT: 'TEXT',
        NUMBER: 'NUMBER',
        DATE: 'DATE',
        SELECT: 'SELECT',
        MULTI_SELECT: 'MULTI_SELECT',
        CHECKBOX: 'CHECKBOX'
    });

    function AppsTagsModel() {}
    AppsTagsModel._schema = function() {
        let json = {
            text: '',
            alias: '',
            type: typeEnum.CUSTOM,
            sets: [''],
            setsType: 0,
            order: 0,
            createdTime: Date.now(),
            updatedTime: Date.now(),
            isDeleted: 0
        };
        return json;
    };

    AppsTagsModel.prototype.SetsTypeEnum = setsTypeEnum;
    AppsTagsModel.prototype.TypeEnum = typeEnum;

    /**
     * 根據輸入的 appId 陣列清單取得所有的標籤
     *
     * @param {string[]} appIds
     * @param {(appsTags: any) => any} callback
     */
    AppsTagsModel.prototype.findTags = function(appIds, callback) {
        Promise.resolve().then(() => {
            let appsTagsMap = {};
            if (!appIds || !(appIds instanceof Array)) {
                return appsTagsMap;
            }

            return Promise.all(appIds.map((appId) => {
                appsTagsMap[appId] = {};
                return admin.database().ref('apps/' + appId + '/tags').once('value').then((snap) => {
                    appsTagsMap[appId].tags = (snap && snap.val()) || {};
                });
            })).then(() => {
                // 最後的資料結構型式:
                // {
                //   ($appId)
                //   ($appId)
                //     ⌞tags
                //       ⌞($tagId)
                //         ⌞($data)
                //       ⌞($tagId)
                //         ⌞($data)
                // }
                return appsTagsMap;
            });
        }).then((result) => {
            callback(result);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 將預設的 tag 資料批次新增到指定的 app 裡，完成插入後回傳所有 tag ID
     *
     * @param {string} appId
     * @param {(tagIds: any[]|null) => any} callback
     */
    AppsTagsModel.prototype.insertDefaultTags = function(appId, callback) {
        let defaultTags = [{
            text: 'Name',
            alias: 'name',
            type: typeEnum.SYSTEM,
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            text: 'Age',
            alias: 'age',
            type: typeEnum.DEFAULT,
            sets: [0],
            setsType: setsTypeEnum.NUMBER
        }, {
            text: 'Gender',
            alias: 'gender',
            type: typeEnum.DEFAULT,
            sets: ['MALE', 'FEMALE'],
            setsType: setsTypeEnum.SELECT
        }, {
            text: 'Email',
            alias: 'email',
            type: typeEnum.DEFAULT,
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            text: 'Phone',
            alias: 'phone',
            type: typeEnum.DEFAULT,
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            text: 'Assigned',
            alias: 'assigned',
            type: typeEnum.DEFAULT,
            sets: [''],
            setsType: setsTypeEnum.MULTI_SELECT
        }, {
            text: 'First chat date',
            alias: 'firstChat',
            type: typeEnum.SYSTEM,
            sets: [0],
            setsType: setsTypeEnum.DATE
        }, {
            text: 'Recent chat date',
            alias: 'recentChat',
            type: typeEnum.SYSTEM,
            sets: [0],
            setsType: setsTypeEnum.DATE
        }, {
            text: 'Chat time(s)',
            alias: 'chatTimeCount',
            type: typeEnum.SYSTEM,
            sets: [0],
            setsType: setsTypeEnum.NUMBER
        }, {
            text: 'Remark',
            alias: 'remark',
            type: typeEnum.DEFAULT,
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }];

        Promise.all(defaultTags.map((tag, idx) => {
            tag.order = idx;
            tag.createdTime = tag.updatedTime = Date.now();

            let postTagData = Object.assign(AppsTagsModel._schema(), tag);
            return admin.database().ref('apps/' + appId + '/tags').push(postTagData).then((ref) => {
                let tagId = ref.key;
                let appsTags = {
                    [appId]: {
                        tags: {
                            [tagId]: postTagData
                        }
                    }
                };
                return appsTags;
            });
        })).then((data) => {
            callback(data || []);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * @param {string} appId
     * @param {any} postTagData
     * @param {(appsTags: any|null) => any} callback
     */
    AppsTagsModel.prototype.insertTag = function(appId, postTagData, callback) {
        postTagData = postTagData || {};
        postTagData.createdTime = Date.now();
        postTagData.updatedTime = Date.now();

        Promise.resolve().then(() => {
            if (!appId) {
                return Promise.reject(new Error());
            }

            // 1. 將傳入的資料與初始化資料合併，確保訂定的欄位一定有值
            let initTagData = AppsTagsModel._schema();
            let newTagData = Object.assign(initTagData, postTagData);

            // 2. 將資料插入至資料庫中
            return admin.database().ref('apps/' + appId + '/tags').push(newTagData).then((ref) => {
                let tagId = ref.key;
                let appsTags = {
                    [appId]: {
                        tags: {
                            [tagId]: newTagData
                        }
                    }
                };
                return appsTags;
            });
        }).then((data) => {
            callback(data);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * @param {string} appId
     * @param {string} tagId
     * @param {any} putTagData
     * @param {(data: any|null) => any} callback
     */
    AppsTagsModel.prototype.updateTag = function(appId, tagId, putTagData, callback) {
        putTagData = putTagData || {};
        putTagData.updatedTime = Date.now();

        Promise.resolve().then(() => {
            if (!appId || !tagId) {
                return Promise.reject(new Error());
            }

            // 1. 將資料更新至資料庫中，完成更新後回傳 ID 鍵值
            return admin.database().ref('apps/' + appId + '/tags/' + tagId).update(putTagData).then(() => {
                return admin.database().ref('apps/' + appId + '/tags/' + tagId).once('value');
            }).then((snap) => {
                let tagInDB = snap.val();
                let appsTags = {
                    [appId]: {
                        tags: {
                            [tagId]: tagInDB
                        }
                    }
                };
                return appsTags;
            });
        }).then((data) => {
            callback(data);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * @param {string} appId
     * @param {string} tagId
     * @param {(data: any|null) => any} callback
     */
    AppsTagsModel.prototype.removeTag = function(appId, tagId, callback) {
        Promise.resolve().then(() => {
            if (!appId || !tagId) {
                return Promise.reject(new Error());
            }

            let deleteTagData = {
                isDeleted: 1,
                updatedTime: Date.now()
            };

            // 1. 將資料更新至資料庫中，完成更新後回傳
            return admin.database().ref('apps/' + appId + '/tags/' + tagId).update(deleteTagData).then(() => {
                return admin.database().ref('apps/' + appId + '/tags/' + tagId).once('value');
            }).then((snap) => {
                let tagInDB = snap.val();
                let appsTags = {
                    [appId]: {
                        tags: {
                            [tagId]: tagInDB
                        }
                    }
                };
                return appsTags;
            });
        }).then((data) => {
            callback(data);
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsTagsModel();
})();
