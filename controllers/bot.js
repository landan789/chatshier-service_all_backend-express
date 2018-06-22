module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let botSvc = require('../services/bot');
    let consumersMdl = require('../models/consumers');
    let storageHlp = require('../helpers/storage');

    let appsMdl = require('../models/apps');
    let appsRichmenusMdl = require('../models/apps_richmenus');
    let appsChatroomsMdl = require('../models/apps_chatrooms');
    let appsChatroomsMessagersMdl = require('../models/apps_chatrooms_messagers');

    class BotController extends ControllerCore {
        constructor() {
            super();
            this.getRichmenuList = this.getRichmenuList.bind(this);
            this.activateRichmenu = this.activateRichmenu.bind(this);
            this.deactivateRichmenu = this.deactivateRichmenu.bind(this);
            this.setDefaultRichmenu = this.setDefaultRichmenu.bind(this);
            this.getProfile = this.getProfile.bind(this);
            this.uploadFile = this.uploadFile.bind(this);
            this.leaveGroupRoom = this.leaveGroupRoom.bind(this);
        }

        _findPlatformUids(appId, app) {
            return Promise.resolve().then(() => {
                if (!app) {
                    return appsMdl.find(appId).then((apps) => {
                        if (!(apps && apps[appId])) {
                            return Promise.reject(API_ERROR.APPS_FAILED_TO_FIND);
                        }
                        return Promise.resolve(apps[appId]);
                    });
                }
                return app;
            }).then((_app) => {
                let appType = _app.type;
                return appsChatroomsMessagersMdl.find(appId, void 0, void 0, appType).then((appsChatroomsMessagers) => {
                    if (!(appsChatroomsMessagers && appsChatroomsMessagers[appId])) {
                        return [];
                    }

                    let platformUidsMap = {};
                    let chatrooms = appsChatroomsMessagers[appId].chatrooms;
                    for (let chatroomId in chatrooms) {
                        let messagers = chatrooms[chatroomId].messagers;
                        for (let messagerId in messagers) {
                            let messager = messagers[messagerId];
                            platformUidsMap[messager.platformUid] = messager;
                        }
                    }
                    return Object.keys(platformUidsMap);
                });
            });
        }

        getRichmenuList(req, res) {
            let appId = req.params.appid;
            return this.appsRequestVerify(req).then(() => {
                return botSvc.getRichmenuList(appId);
            }).then((richmenuArray) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: richmenuArray
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        activateRichmenu(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.menuid;
            let activateRichmenu;
            let defaultRichmenu;

            let putRichmenu = {
                isActivated: true
            };

            return this.appsRequestVerify(req).then(() => {
                return appsRichmenusMdl.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                activateRichmenu = appsRichmenus[appId].richmenus[richmenuId];

                // 檢查 richmenu 有無設定好 richmenu image
                // 沒有設定好 image 的 richmenu 無法被啟用
                return botSvc.getRichMenuImage(activateRichmenu.platformMenuId, appId).then((imageBuffer) => {
                    if (!imageBuffer) {
                        return Promise.reject(API_ERROR.BOT_MENU_IMAGE_FAILED_TO_FIND);
                    }

                    if (!activateRichmenu.src) {
                        let richmentImgFileName = `${activateRichmenu.platformMenuId}.jpg`;
                        let uploadFilePath = `/apps/${appId}/richmenus/${richmenuId}/src/${richmentImgFileName}`;
                        return storageHlp.filesUpload(uploadFilePath, imageBuffer).then(() => {
                            return storageHlp.sharingCreateSharedLink(uploadFilePath);
                        }).then((url) => {
                            putRichmenu.src = url;
                            return imageBuffer;
                        });
                    }

                    return Promise.resolve(imageBuffer);
                }).catch(() => {
                    return Promise.reject(API_ERROR.BOT_MENU_IMAGE_FAILED_TO_FIND);
                });
            }).then(() => {
                // 查找是否已經有預設啟用的 richmenu
                // 如果沒有則將此筆啟用的 richmenu 設為預設啟用的 richmenu
                return appsRichmenusMdl.findActivated(appId, true);
            }).then((appsRichmenus) => {
                defaultRichmenu = (appsRichmenus && appsRichmenus[appId]) ? Object.values(appsRichmenus[appId].richmenus).shift() : void 0;
                putRichmenu.isDefault = !defaultRichmenu;
                return appsRichmenusMdl.update(appId, richmenuId, putRichmenu);
            }).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                }
                activateRichmenu = appsRichmenus[appId].richmenus[richmenuId];

                // 如果此 app 尚未有預設啟用的 richmenu
                // 代表此筆啟用的 richmenu 是第一筆啟用的 richmenu
                // 則必須將此筆 richmenu link 至所有聊天室中的 platformUid
                if (!defaultRichmenu) {
                    // 取出此 app 底下所有聊天室的 platformUid
                    return appsMdl.find(appId).then((apps) => {
                        if (!(apps && apps[appId])) {
                            return Promise.reject(API_ERROR.APPS_FAILED_TO_FIND);
                        }
                        let app = apps[appId];
                        return Promise.all([ app, this._findPlatformUids(appId, app) ]);
                    }).then(([ app, platformUids ]) => {
                        let platformMenuId = activateRichmenu.platformMenuId;
                        return Promise.all(platformUids.map((platformUid) => {
                            return botSvc.linkRichMenuToUser(platformUid, platformMenuId, appId, app).then((resJson) => {
                                if (!resJson) {
                                    return Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_LINK);
                                }
                                return Promise.resolve();
                            });
                        }));
                    }).then(() => {
                        return appsRichmenus;
                    });
                }
                return appsRichmenus;
            }).then((appsRichmenus) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsRichmenus
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deactivateRichmenu(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.menuid;
            let deactivateRichmenu;
            let defaultRichmenu;

            return this.appsRequestVerify(req).then(() => {
                return appsRichmenusMdl.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }

                deactivateRichmenu = appsRichmenus[appId].richmenus[richmenuId];
                return appsRichmenusMdl.update(appId, richmenuId, { isActivated: false, isDefault: false });
            }).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                }
                let isDefault = deactivateRichmenu.isDefault;
                deactivateRichmenu = appsRichmenus[appId].richmenus[richmenuId];

                // 如果取消啟用的 richmenu 是預設啟用的 richmenu
                // 則取消啟用後，必須設定成其他已啟用的 richmenu 並 link 至用戶
                if (isDefault) {
                    return appsRichmenusMdl.findActivated(appId).then((_appsRichmenus) => {
                        if (!(_appsRichmenus && _appsRichmenus[appId])) {
                            // 沒有其他已啟用的 richmenu 則不做任何事
                            return Promise.resolve(null);
                        }

                        // 將第一筆(最後更新)的已啟用 richmenu 設為預設 (TODO: 資料庫須根據 updatedTime 排序)
                        let activateRichmenuId = Object.keys(_appsRichmenus[appId].richmenus).shift() || '';
                        return appsRichmenusMdl.update(appId, activateRichmenuId, { isDefault: true }).then((_appsRichmenus) => {
                            if (!(_appsRichmenus && _appsRichmenus[appId])) {
                                return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_UPDATE);
                            }
                            defaultRichmenu = _appsRichmenus[appId].richmenus[activateRichmenuId];
                            return Promise.resolve(defaultRichmenu);
                        });
                    }).then((defaultRichmenu) => {
                        /** @type {Chatshier.Models.App} */
                        let app;
                        return appsMdl.find(appId).then((apps) => {
                            if (!(apps && apps[appId])) {
                                return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                            }
                            app = apps[appId];
                            return this._findPlatformUids(appId, app);
                        }).then((platformUids) => {
                            return Promise.all(platformUids.map((platformUid) => {
                                // 取得平台用戶目前啟用的 richmenu ID
                                return botSvc.getRichMenuIdOfUser(platformUid, appId, app).then((_platformMenuId) => {
                                    // 如果是與取消啟用的 richmenu 相同 ID
                                    // 有其他的啟用 richmenu 的話 link 其他的啟用 richmenu
                                    // 沒有已啟用的 richmenu 則 unlink 所有平台用戶的 richmenu
                                    return Promise.resolve().then(() => {
                                        if (_platformMenuId && _platformMenuId === deactivateRichmenu.platformMenuId) {
                                            if (defaultRichmenu) {
                                                return botSvc.linkRichMenuToUser(platformUid, defaultRichmenu.platformMenuId, appId, app);
                                            }
                                            return botSvc.unlinkRichMenuFromUser(platformUid, deactivateRichmenu.platformMenuId, appId);
                                        }
                                        return {};
                                    }).then((resJson) => {
                                        if (!resJson) {
                                            return Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_LINK);
                                        }
                                        return Promise.resolve();
                                    });
                                });
                            }));
                        });
                    }).then(() => {
                        return appsRichmenus;
                    });
                }
                return appsRichmenus;
            }).then(() => {
                // 變更的資料可能會有 deactivate 的 richmenu
                // 以及設為預設的 richmenu
                // 因此必須把資料有更新的 richmenus 回傳給 client
                let response = {
                    [appId]: {
                        richmenus: { [richmenuId]: deactivateRichmenu }
                    }
                };
                defaultRichmenu && (response[appId].richmenus[defaultRichmenu._id] = defaultRichmenu);

                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: response
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        setDefaultRichmenu(req, res) {
            let appId = req.params.appid;
            let richmenuId = req.params.menuid;
            let platformUids = [];
            let defaultRichmenu;
            let app;

            return this.appsRequestVerify(req).then(() => {
                return appsMdl.find(appId).then((apps) => {
                    if (!(apps && apps[appId])) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    app = apps[appId];
                    return this._findPlatformUids(appId, app);
                });
            }).then((_platformUids) => {
                platformUids = _platformUids;
                // 查找原本的預設啟用 richmenu
                // 如果沒有則將此筆啟用的 richmenu 設為預設啟用的 richmenu
                return appsRichmenusMdl.findActivated(appId, true);
            }).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    // 沒有其他已啟用的 richmenu 則不做任何事
                    return Promise.resolve(null);
                }
                defaultRichmenu = Object.values(appsRichmenus[appId].richmenus).shift();

                return appsRichmenusMdl.find(appId, richmenuId);
            }).then((appsRichmenus) => {
                if (!(appsRichmenus && appsRichmenus[appId])) {
                    return Promise.reject(API_ERROR.APP_RICHMENU_FAILED_TO_FIND);
                }
                let activateRichmenu = appsRichmenus[appId].richmenus[richmenuId];

                return Promise.all(platformUids.map((platformUid) => {
                    // 取得平台用戶目前啟用的 richmenu ID
                    return botSvc.getRichMenuIdOfUser(platformUid, appId, app).then((_platformMenuId) => {
                        let shouldLink = (
                            !_platformMenuId ||
                            (_platformMenuId && _platformMenuId !== activateRichmenu.platformMenuId) ||
                            (defaultRichmenu && _platformMenuId && _platformMenuId === defaultRichmenu.platformMenuId)
                        );

                        if (shouldLink) {
                            return botSvc.linkRichMenuToUser(platformUid, activateRichmenu.platformMenuId, appId, app);
                        }
                        return {};
                    }).then((resJson) => {
                        if (!resJson) {
                            return Promise.reject(API_ERROR.BOT_MENU_FAILED_TO_LINK);
                        }
                        return Promise.resolve();
                    });
                }));
            }).then(() => {
                return Promise.all([
                    appsRichmenusMdl.update(appId, richmenuId, { isDefault: true }),
                    defaultRichmenu && appsRichmenusMdl.update(appId, defaultRichmenu._id, { isDefault: false })
                ]);
            }).then(([ appsRichmenus, defaultAppsRichmenus ]) => {
                // 變更的資料可能會有設為預設的 richmenu
                // 以及之前預設的 richmenu
                // 因此必須把資料有更新的 richmenus 回傳給 client
                let response = {
                    [appId]: {
                        richmenus: {}
                    }
                };
                Object.assign(response[appId].richmenus, appsRichmenus ? appsRichmenus[appId].richmenus : {});
                defaultAppsRichmenus && Object.assign(response[appId].richmenus, defaultAppsRichmenus[appId].richmenus);

                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: response
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        getProfile(req, res) {
            let appId = req.params.appid;
            let platformUid = req.params.platformuid;
            /** @type {Chatshier.Models.App} */
            let app;

            return Promise.resolve().then(() => {
                if (!appId) {
                    return Promise.reject(API_ERROR.APPID_WAS_EMPTY);
                } else if (!platformUid) {
                    return Promise.reject(API_ERROR.PLATFORMUID_WAS_EMPTY);
                }

                return appsMdl.find(appId).then((apps) => {
                    if (!apps) {
                        return Promise.reject(API_ERROR.APP_FAILED_TO_FIND);
                    }
                    return Promise.resolve(apps);
                });
            }).then((apps) => {
                app = apps[appId];
                return botSvc.create(appId, app);
            }).then(() => {
                /** @type {Webhook.Chatshier.Information} */
                let platformInfo = {
                    serverAddress: 'https://' + req.hostname,
                    platformUid: platformUid
                };
                return botSvc.getProfile(platformInfo, appId, app);
            }).then((profile) => {
                let putConsumer = Object.assign({}, profile);

                return Promise.resolve().then(() => {
                    if (profile && profile.photo) {
                        let fileName = `${platformUid}_${Date.now()}.jpg`;
                        let filePath = `${storageHlp.tempPath}/${fileName}`;
                        return storageHlp.filesSaveUrl(filePath, profile.photo).then((url) => {
                            putConsumer.photo = url;
                            let toPath = `/consumers/${platformUid}/photo/${fileName}`;
                            return storageHlp.filesMoveV2(filePath, toPath);
                        });
                    }
                    putConsumer.photo = '';
                }).then(() => {
                    return consumersMdl.replace(platformUid, putConsumer);
                });
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        uploadFile(req, res) {
            let file = req.body.file;
            let fileName = req.body.fileName;
            let ext = fileName.split('.').pop();
            let originalFilePath = `/temp/${Date.now()}.${ext}`;

            return this.appsRequestVerify(req).then(() => {
                if (!(file && fileName)) {
                    return Promise.reject(API_ERROR.BOT_FAILED_TO_UPLOAD_IMAGE);
                }
                return storageHlp.filesUpload(originalFilePath, file);
            }).then((response) => {
                return storageHlp.sharingCreateSharedLink(originalFilePath);
            }).then((url) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: {url, originalFilePath} // TO DO ， BAD FORMAT
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        moveFile(req, res) {
            let appId = req.query.appid;
            let richMenuId = req.query.richmenuid;
            let fromPath = req.query.path;
            let fileName = fromPath.slice(fromPath.indexOf('temp/') + 4);
            let toPath = `/apps/${appId}/richmenus/${richMenuId}/src${fileName}`;

            return storageHlp.filesMoveV2(fromPath, toPath).catch((err) => {
                if (409 === err.status) {
                    return Promise.resolve();
                }
                return Promise.reject(err);
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        leaveGroupRoom(req, res) {
            let appId = req.params.appid;
            let chatroomId = req.params.chatroomid;

            return this.appsRequestVerify(req).then(() => {
                return botSvc.leaveGroupRoom(appId, chatroomId);
            }).then(() => {
                return appsChatroomsMdl.remove(appId, chatroomId);
            }).then((data) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: data
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }
    return new BotController();
})();
