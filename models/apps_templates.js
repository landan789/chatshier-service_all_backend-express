module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK
    let instance = new AppsTemplatesModel();
    function AppsTemplatesModel() {}

    /**
     * 回傳預設的 compose 資料結構
     * @param {Function} callback
     */
    AppsTemplatesModel.prototype._schema = function(callback) {
        let json = {
            keyword: '',
            isDeleted: 0,
            type: 'template',
            altText: '',
            template: ''
        };
        callback(json);
    };

    /**
     * 查詢指定 appId 內的所有的Templates資料 (回傳的資料型態為陣列)
     *
     *  @param {string[]} appIds
     * @param {Function} callback
     */

    AppsTemplatesModel.prototype.findAll = (appIds, callback) => {
        let appsTemplates = {};

        Promise.all(appIds.map((appId) => {
            return admin.database().ref('apps/' + appId + '/templates').orderByChild('isDeleted').equalTo(0).once('value').then((snap) => {
                let template = snap.val() || {};
                if (!template) {
                    return Promise.reject(new Error());
                }
                appsTemplates[appId] = {
                    templates: template
                };
            });
        })).then(() => {
            callback(appsTemplates);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 查詢指定 appId 內指定的template
     *
     * @param {string} appId
     * @param {string} templateId
     * @param {function({ type: string, text: string}[])} callback
     * @returns {Promise<any>}
     */

    AppsTemplatesModel.prototype.findOne = (appId, templateId, callback) => {
        return admin.database().ref('apps/' + appId + '/templates/' + templateId).once('value').then((snap) => {
            let templates = snap.val() || {};
            let appsTemplates = {
                [appId]: {
                    template: templates
                }
            };
            callback(appsTemplates);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 新增一筆群發的資料
     *
     * @param {string} appIds 
     * @param {*} postTemplate
     * @param {(appsComposes: any) => any} [callback]
     * @returns {Promise<any>}
     */
    AppsTemplatesModel.prototype.insert = (appIds, postTemplate, callback) => {
        return new Promise((resolve, reject) => {
            instance._schema((initTemplate) => {
                var _template = {
                    createdTime: Date.now(),
                    updatedTime: Date.now()
                };
                let template = Object.assign(initTemplate, postTemplate, _template);
                resolve(template);
            });
        }).then((template) => {
            return Promise.all(appIds.map((appId) => {
                return admin.database().ref('apps/' + appId + '/templates').push(template).then((ref) => {
                    let templateId = ref.key;
                    let appsTemplates = {
                        [appId]: {
                            templates: {
                                [templateId]: template
                            }
                        }
                    };
                    return appsTemplates;
                });
            }));
        }).then((appsTemplates) => {
            ('function' === typeof callback) && callback(appsTemplates);
            return appsTemplates;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    /**
     * 輸入指定的 appId 與 composeId 更新該群發的資料
     *
     * @param {string} appId
     * @param {string} templateId
     * @param {*} putTemplate
     * @param {Function} callback
     * @returns {Promise<any>}
     */
    AppsTemplatesModel.prototype.update = (appId, templateId, putTemplate, callback) => {
        let procced = Promise.resolve();
        return procced.then(() => {
            if (!appId || !templateId) {
                return Promise.reject(new Error());
            }
            // 1. 更新群發的資料
            return admin.database().ref('apps/' + appId + '/templates/' + templateId).update(putTemplate).then(() => {
                let appsTemplates = {
                    [appId]: {
                        templates: {
                            [templateId]: putTemplate
                        }
                    }
                };
                return appsTemplates;
            });
        }).then((appsTemplates) => {
            callback(appsTemplates);
        }).catch(() => {
            callback(null);
        });
    };

    /**
     * 輸入指定的 appId 與 templateId 刪除該群發的資料
     *
     * @param {string} appId
     * @param {string} templateId
     * @param {Function} callback
     * @returns {Promise<any>}
     */

    AppsTemplatesModel.prototype.remove = (appId, templateId, callback) => {
        let deleteTemplate = {
            isDeleted: 1
        };

        let templateRef = admin.database().ref('apps/' + appId + '/templates/' + templateId);
        return templateRef.update(deleteTemplate).then(() => {
            return templateRef.once('value');
        }).then((snap) => {
            let template = snap.val();
            let templateId = snap.ref.key;
            let appsTemplates = {
                [appId]: {
                    templates: {
                        [templateId]: template
                    }
                }
            };
            callback(appsTemplates);
        }).catch(() => {
            callback(null);
        });
    };

    return instance;
})();
