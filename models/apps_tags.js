module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    const typeEnum = Object.freeze({
        DEFAULT: 'DEFAULT',
        CUSTOM: 'CUSTOM'
    });

    const setsTypeEnum = Object.freeze({
        TEXT: 'TEXT',
        NUMBER: 'NUMBER',
        DATE: 'DATE',
        SELECT: 'SELECT',
        MULTI_SELECT: 'MULTI_SELECT',
        CHECKBOX: 'CHECKBOX',
        RADIO: 'RADIO'
    });

    function AppsTagsModel() {}
    AppsTagsModel._schema = function() {
        let json = {
            name: '',
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
    AppsTagsModel.prototype.typeEnum = typeEnum;

    /**
     * 根據輸入的 appId 陣列清單取得所有的標籤
     *
     * @param {string[]} appIds
     * @param {(appsTags: any) => any} callback
     */
    AppsTagsModel.prototype.findTags = function(appIds, callback) {
        Promise.resolve().then(() => {
            if (!appIds || !(appIds instanceof Array)) {
                return;
            }

            let appsTagsMap = {};
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
            callback(result || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 將預設的 tag 資料批次新增到指定的 app 裡，完成插入後回傳所有 tag ID
     *
     * @param {string} appId
     * @param {(tagIds: string[]) => any} callback
     */
    AppsTagsModel.prototype.insertDefaultTags = function(appId, callback) {
        let defaultTags = [{
            name: '姓名',
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            name: '年齡',
            sets: [0],
            setsType: setsTypeEnum.NUMBER
        }, {
            name: '性別',
            sets: ['男', '女'],
            setsType: setsTypeEnum.SELECT
        }, {
            name: '電子郵件',
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            name: '電話',
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            name: '首次聊天時間',
            sets: [0],
            setsType: setsTypeEnum.DATE
        }, {
            name: '上次聊天時間',
            sets: [0],
            setsType: setsTypeEnum.DATE
        }, {
            name: '聊天次數',
            sets: [0],
            setsType: setsTypeEnum.NUMBER
        }, {
            name: '備註',
            sets: [''],
            setsType: setsTypeEnum.TEXT
        }, {
            name: '指派負責人',
            sets: [''],
            setsType: setsTypeEnum.CHECKBOX
        }];

        Promise.all(defaultTags.map((tag, idx) => {
            tag.type = typeEnum.DEFAULT;
            tag.order = idx;
            tag.createdTime = tag.updatedTime = Date.now();

            let postTagData = Object.assign(AppsTagsModel._schema(), tag);
            let databaseRef = admin.database().ref('apps/' + appId + '/tags').push(postTagData);
            return databaseRef.then(() => databaseRef.key);
        })).then((data) => {
            callback(data || []);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * @param {string} appId
     * @param {any} insertTagData
     * @param {(data: { tagId: string } => any} callback
     */
    AppsTagsModel.prototype.insertTag = function(appId, postTagData, callback) {
        Promise.resolve().then(() => {
            if (!appId) {
                return Promise.reject(new Error());
            }

            // 1. 將傳入的資料與初始化資料合併，確保訂定的欄位一定有值
            let initTagData = AppsTagsModel._schema();
            let newTagData = Object.assign(initTagData, postTagData);

            // 2. 將資料插入至資料庫中，完成插入後回傳 ID 鍵值
            let databaseRef = admin.database().ref('apps/' + appId + '/tags').push(newTagData);
            let tagId = databaseRef.key;
            return databaseRef.then(() => {
                return { tagId };
            });
        }).then((data) => {
            callback(data || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * @param {string} appId
     * @param {string} tagId
     * @param {any} putTagData
     * @param {(data: { tagId: string } => any} callback
     */
    AppsTagsModel.prototype.updateTag = function(appId, tagId, putTagData, callback) {
        Promise.resolve().then(() => {
            if (!appId || !tagId) {
                return Promise.reject(new Error());
            }

            // 1. 將資料更新至資料庫中，完成更新後回傳 ID 鍵值
            return admin.database().ref('apps/' + appId + '/tags/' + tagId).update(putTagData).then(() => {
                return { tagId };
            });
        }).then((data) => {
            callback(data || {});
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * @param {string} appId
     * @param {string} tagId
     * @param {(data: { tagId: string } => any} callback
     */
    AppsTagsModel.prototype.removeTag = function(appId, tagId, callback) {
        Promise.resolve().then(() => {
            if (!appId || !tagId) {
                return Promise.reject(new Error());
            }

            let deleteTagData = {
                isDeleted: 1
            };

            // 1. 將資料更新至資料庫中，完成更新後回傳 ID 鍵值
            return admin.database().ref('apps/' + appId + '/tags/' + tagId).update(deleteTagData).then(() => {
                return { tagId };
            });
        }).then((data) => {
            callback(data || {});
        }).catch(() => {
            callback(null);
        });
    };

    return new AppsTagsModel();
})();
