module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const API_ERROR = require('../config/api_error.json');
    /** @type {any} */
    const API_SUCCESS = require('../config/api_success.json');

    let appsReceptionistsMdl = require('../models/apps_receptionists');

    class AppsReceptionistsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.postOne = this.postOne.bind(this);
            this.putOne = this.putOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res) {
            return this.appsRequestVerify(req).then((checkedAppIds) => {
                let appIds = checkedAppIds;
                return appsReceptionistsMdl.find(appIds).then((appsReceptionists) => {
                    if (!appsReceptionists) {
                        return Promise.reject(API_ERROR.APP_RECEPTIONIST_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsReceptionists);
                });
            }).then((appsReceptionists) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionists
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let appId = req.params.appid;
            let postReceptionist = {
                name: ('string' === typeof req.body.name) ? req.body.name : '',
                photo: ('string' === typeof req.body.photo) ? req.body.photo : '',
                gmail: ('string' === typeof req.body.gmail) ? req.body.gmail : '',
                phone: ('string' === typeof req.body.phone) ? req.body.phone : '',
                timezoneOffset: ('number' === typeof req.body.timezoneOffset) ? req.body.timezoneOffset : 0,
                maxNumber: ('number' === typeof req.body.maxNumber) ? req.body.maxNumber : 0,
                interval: ('number' === typeof req.body.interval) ? req.body.interval : 0,
                schedules: (req.body.schedules instanceof Array) ? req.body.schedules : []
            };

            return this.appsRequestVerify(req).then(() => {
                return appsReceptionistsMdl.insert(appId, postReceptionist);
            }).then((appsReceptionists) => {
                if (!appsReceptionists) {
                    return Promise.reject(API_ERROR.APP_RECEPTIONIST_FAILED_TO_INSERT);
                }
                return Promise.resolve(appsReceptionists);
            }).then((appsReceptionists) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionists
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        putOne(req, res) {
            let appId = req.params.appid;
            let receptionistId = req.params.receptionistid;

            let putReceptionist = {};
            ('string' === typeof req.body.name) && (putReceptionist.name = req.body.name);
            ('string' === typeof req.body.photo) && (putReceptionist.photo = req.body.photo);
            ('string' === typeof req.body.gmail) && (putReceptionist.gmail = req.body.gmail);
            ('string' === typeof req.body.phone) && (putReceptionist.phone = req.body.phone);
            ('number' === typeof req.body.timezoneOffset) && (putReceptionist.timezoneOffset = req.body.timezoneOffset);
            ('number' === typeof req.body.maxNumber) && (putReceptionist.maxNumber = req.body.maxNumber);
            ('number' === typeof req.body.interval) && (putReceptionist.interval = req.body.interval);
            (req.body.schedules instanceof Array) && (putReceptionist.schedules = req.body.schedules);

            return this.appsRequestVerify(req).then(() => {
                return appsReceptionistsMdl.update(appId, receptionistId, putReceptionist);
            }).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    return Promise.reject(API_ERROR.APP_RECEPTIONIST_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsReceptionists);
            }).then((appsReceptionists) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionists
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let appId = req.params.appid;
            let receptionistId = req.params.receptionistid;

            return this.appsRequestVerify(req).then(() => {
                return appsReceptionistsMdl.remove(appId, receptionistId);
            }).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    return Promise.reject(API_ERROR.APP_RECEPTIONIST_FAILED_TO_REMOVE);
                }
                return Promise.resolve(appsReceptionists);
            }).then((appsReceptionists) => {
                let suc = {
                    msg: API_SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: appsReceptionists
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new AppsReceptionistsController();
})();
