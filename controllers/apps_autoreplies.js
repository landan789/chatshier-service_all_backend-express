module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsAutorepliesMdl = require('../models/apps_autoreplies');

    class AppsAutorepliesController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.getOne = this.getOne.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res, next) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsAutorepliesMdl.find(appIds, null, (data) => {
                        if (undefined === data || null === data || '' === data) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((data) => {
                let apps = data;
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: apps
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        getOne(req, res, next) {
            let autoreplyId = req.params.autoreplyid;
            let appId;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsAutorepliesMdl.find(appId, autoreplyId, (appsAutoreplies) => {
                        if (false === appsAutoreplies || undefined === appsAutoreplies || '' === appsAutoreplies) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                            return;
                        }
                        resolve(appsAutoreplies);
                    });
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        postOne(req, res, next) {
            let autoreply = {
                title: undefined === req.body.title ? '' : req.body.title,
                startedTime: undefined === req.body.startedTime ? 0 : req.body.startedTime,
                endedTime: undefined === req.body.endedTime ? 0 : req.body.endedTime,
                text: undefined === req.body.text ? '' : req.body.text
            };
            let appId;

            return this.appsRequestVerify(req).then((checkedAppIds) => {
                appId = checkedAppIds;
                return new Promise((resolve, reject) => {
                    appsAutorepliesMdl.insert(appId, autoreply, (appsAutoreplies) => {
                        if (null === appsAutoreplies || undefined === appsAutoreplies || '' === appsAutoreplies) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_INSERT);
                            return;
                        }
                        resolve(appsAutoreplies);
                    });
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        putOne(req, res, next) {
            let appId = req.params.appid;
            let autoreplyId = req.params.autoreplyid;
            let autoreply = {
                title: undefined === req.body.title ? null : req.body.title,
                startedTime: undefined === req.body.startedTime ? 0 : req.body.startedTime,
                endedTime: undefined === req.body.endedTime ? 0 : req.body.endedTime,
                text: undefined === req.body.text ? null : req.body.text
            };

            // 前端未填入的訊息，不覆蓋
            for (let key in autoreply) {
                if (null === autoreply[key]) {
                    delete autoreply[key];
                }
            }
            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;

                if (!autoreplyId) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_AUTOREPLYID_WAS_EMPTY);
                };

                if ('' === autoreply.tittle) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_TITLE_WAS_EMPTY);
                };

                if ('' === autoreply.text) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_TEXT_WAS_EMPTY);
                };

                return new Promise((resolve, reject) => { // 取得目前appId下所有autoreplies
                    appsAutorepliesMdl.findAutoreplies(appId, (data) => {
                        if (null === data || '' === data || undefined === data) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                            return;
                        }
                        let autoreplyIds = Object.keys(data);
                        resolve(autoreplyIds);
                    });
                });
            }).then((autoreplyIds) => { // 判斷appId中是否有目前autoreplyId
                return new Promise((resolve, reject) => {
                    if (false === autoreplyIds.includes(autoreplyId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsAutorepliesMdl.update(appId, autoreplyId, autoreply, (data) => {
                        if (undefined === data || null === data || '' === data) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_UPDATE);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_UPDATE.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        }

        deleteOne(req, res, next) {
            let autoreplyId = req.params.autoreplyid;
            let appId;

            return this.appsRequestVerify(req).then((checkedAppId) => {
                appId = checkedAppId;

                if (!autoreplyId) {
                    return Promise.reject(API_ERROR.APP_AUTOREPLY_AUTOREPLYID_WAS_EMPTY);
                };

                return new Promise((resolve, reject) => { // 取得目前appId下所有autoreplies
                    appsAutorepliesMdl.findAutoreplies(appId, (data) => {
                        if (null === data || '' === data || undefined === data) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_FIND);
                            return;
                        }
                        let autoreplyIds = Object.keys(data);
                        resolve(autoreplyIds);
                    });
                });
            }).then((autoreplyIds) => { // 判斷appId中是否有目前autoreplyId
                return new Promise((resolve, reject) => {
                    if (!autoreplyIds.includes(autoreplyId)) {
                        reject(API_ERROR.USER_DID_NOT_HAVE_THIS_AUTOREPLY);
                        return;
                    }
                    resolve();
                });
            }).then(() => {
                return new Promise((resolve, reject) => {
                    appsAutorepliesMdl.remove(appId, autoreplyId, (data) => {
                        if (!data) {
                            reject(API_ERROR.APP_AUTOREPLY_FAILED_TO_REMOVE);
                            return;
                        }
                        resolve(data);
                    });
                });
            }).then((appsAutoreplies) => {
                let json = {
                    status: 1,
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: appsAutoreplies
                };
                res.status(200).json(json);
            }).catch((ERR) => {
                let json = {
                    status: 0,
                    msg: ERR.MSG,
                    code: ERR.CODE
                };
                res.status(500).json(json);
            });
        };
    }

    return new AppsAutorepliesController();
}());
