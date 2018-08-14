module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');
    const CHATSHIER_CFG = require('../config/chatshier.js');

    let gcalendarHlp = require('../helpers/gcalendar');
    let appsMdl = require('../models/apps');
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
                        return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_FIND);
                    }
                    return Promise.resolve(appsReceptionists);
                });
            }).then((appsReceptionists) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
                email: ('string' === typeof req.body.email) ? req.body.email : '',
                phone: ('string' === typeof req.body.phone) ? req.body.phone : '',
                timezoneOffset: ('number' === typeof req.body.timezoneOffset) ? req.body.timezoneOffset : 0,
                maxNumber: ('number' === typeof req.body.maxNumber) ? req.body.maxNumber : 0,
                interval: ('number' === typeof req.body.interval) ? req.body.interval : 0,
                schedules: (req.body.schedules instanceof Array) ? req.body.schedules : []
            };

            return this.appsRequestVerify(req).then(() => {
                return gcalendarHlp.isAvailableGmail(postReceptionist.email);
            }).then((isAvailable) => {
                if (!isAvailable) {
                    return Promise.reject(ERROR.UNAVAILABLE_GMAIL);
                }
                return appsReceptionistsMdl.insert(appId, postReceptionist);
            }).then((appsReceptionists) => {
                if (!appsReceptionists) {
                    return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_INSERT);
                }
                return Promise.resolve(appsReceptionists);
            }).then((appsReceptionists) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
            ('string' === typeof req.body.email) && (putReceptionist.email = req.body.email);
            ('string' === typeof req.body.phone) && (putReceptionist.phone = req.body.phone);
            ('number' === typeof req.body.timezoneOffset) && (putReceptionist.timezoneOffset = req.body.timezoneOffset);
            ('number' === typeof req.body.maxNumber) && (putReceptionist.maxNumber = req.body.maxNumber);
            ('number' === typeof req.body.interval) && (putReceptionist.interval = req.body.interval);
            (req.body.schedules instanceof Array) && (putReceptionist.schedules = req.body.schedules);

            let shareToGmail = req.body.shareTo;

            return this.appsRequestVerify(req).then(() => {
                if (0 === Object.keys(putReceptionist).length) {
                    return Promise.reject(ERROR.INVALID_REQUEST_BODY_DATA);
                } else if (putReceptionist.email) {
                    return gcalendarHlp.isAvailableGmail(putReceptionist.email).then((isAvailable) => {
                        if (!isAvailable) {
                            return Promise.reject(ERROR.UNAVAILABLE_GMAIL);
                        }
                        return Promise.resolve();
                    });
                }
                return Promise.resolve();
            }).then(() => {
                if (shareToGmail) {
                    /** @type {Chatshier.Models.Receptionist} */
                    let receptionist;
                    return gcalendarHlp.isAvailableGmail(shareToGmail).then((isAvailable) => {
                        if (!isAvailable) {
                            return Promise.reject(ERROR.UNAVAILABLE_GMAIL);
                        }
                        return appsReceptionistsMdl.find(appId, receptionistId);
                    }).then((appsReceptionists) => {
                        if (!(appsReceptionists && appsReceptionists[appId])) {
                            return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_FIND);
                        }

                        receptionist = appsReceptionists[appId].receptionists[receptionistId];
                        let gcalendarId = receptionist.gcalendarId;
                        return Promise.resolve().then(() => {
                            if (!gcalendarId) {
                                return appsMdl.find(appId).then((apps) => {
                                    if (!(apps && apps[appId])) {
                                        return Promise.reject(ERROR.APP_FAILED_TO_FIND);
                                    }

                                    let summary = '[' + receptionist.name + '][' + apps[appId].name + '] - ' + receptionistId;
                                    let description = 'Created by ' + CHATSHIER_CFG.GMAIL.USER;
                                    return gcalendarHlp.insertCalendar(summary, description);
                                }).then((gcalendar) => {
                                    gcalendarId = putReceptionist.gcalendarId = gcalendar.id;
                                    return gcalendarId;
                                });
                            }
                            return gcalendarId;
                        });
                    }).then((gcalendarId) => {
                        return gcalendarHlp.shareCalendar(gcalendarId, shareToGmail);
                    }).then(() => {
                        if (shareToGmail === receptionist.email) {
                            putReceptionist.isCalendarShared = true;
                        }
                        return appsReceptionistsMdl.update(appId, receptionistId, putReceptionist);
                    });
                }
                return appsReceptionistsMdl.update(appId, receptionistId, putReceptionist);
            }).then((appsReceptionists) => {
                if (!(appsReceptionists && appsReceptionists[appId])) {
                    return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_UPDATE);
                }
                return Promise.resolve(appsReceptionists);
            }).then((appsReceptionists) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
                    return Promise.reject(ERROR.APP_RECEPTIONIST_FAILED_TO_REMOVE);
                }
                return Promise.resolve(appsReceptionists);
            }).then((appsReceptionists) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
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
