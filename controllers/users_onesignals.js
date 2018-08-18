module.exports = (function() {
    const ControllerCore = require('../cores/controller');
    /** @type {any} */
    const ERROR = require('../config/error.json');
    /** @type {any} */
    const SUCCESS = require('../config/success.json');

    let usersOneSignalsMdl = require('../models/users_onesignals');

    class UsersOneSignalsController extends ControllerCore {
        constructor() {
            super();
            this.getAll = this.getAll.bind(this);
            this.postOne = this.postOne.bind(this);
            this.deleteOne = this.deleteOne.bind(this);
        }

        getAll(req, res) {
            let userId = req.params.userid;

            return Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USER_USERID_WAS_EMPTY);
                }

                return usersOneSignalsMdl.find({ userIds: userId });
            }).then((usersOneSignals) => {
                if (!usersOneSignals) {
                    return Promise.reject(ERROR.USER_ONESIGNAL_FAILED_TO_FIND);
                }
                return Promise.resolve(usersOneSignals);
            }).then((usersOneSignals) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_FIND.MSG,
                    data: usersOneSignals
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        postOne(req, res) {
            let userId = req.params.userid;
            let postOneSignal = {
                oneSignalAppId: ('string' === typeof req.body.oneSignalAppId) ? req.body.oneSignalAppId : '',
                oneSignalUserId: ('string' === typeof req.body.oneSignalUserId) ? req.body.oneSignalUserId : ''
            };

            return Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USER_USERID_WAS_EMPTY);
                }

                let query = {
                    userIds: userId,
                    oneSignalUserId: postOneSignal.oneSignalUserId,
                    isDeleted: null
                };

                return usersOneSignalsMdl.find(query).then((usersOneSignals) => {
                    if (usersOneSignals && usersOneSignals[userId]) {
                        let oneSignalId = Object.keys(usersOneSignals[userId].oneSignals).shift() || '';
                        postOneSignal.isDeleted = false;
                        return usersOneSignalsMdl.update(userId, oneSignalId, postOneSignal);
                    }
                    return usersOneSignalsMdl.insert(userId, postOneSignal);
                });
            }).then((usersOneSignals) => {
                if (!(usersOneSignals && usersOneSignals[userId])) {
                    return Promise.reject(ERROR.USER_ONESIGNAL_FAILED_TO_INSERT);
                }
                return Promise.resolve(usersOneSignals);
            }).then((usersOneSignals) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_INSERT.MSG,
                    data: usersOneSignals
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }

        deleteOne(req, res) {
            let userId = req.params.userid;
            let oneSignalId = req.params.onesignalid;

            return Promise.resolve().then(() => {
                if (!userId) {
                    return Promise.reject(ERROR.USER_USERID_WAS_EMPTY);
                }

                return usersOneSignalsMdl.remove(userId, oneSignalId);
            }).then((usersOneSignals) => {
                if (!(usersOneSignals && usersOneSignals[userId])) {
                    return Promise.reject(ERROR.USER_ONESIGNAL_FAILED_TO_REMOVE);
                }
                return Promise.resolve(usersOneSignals);
            }).then((usersOneSignals) => {
                let suc = {
                    msg: SUCCESS.DATA_SUCCEEDED_TO_REMOVE.MSG,
                    data: usersOneSignals
                };
                return this.successJson(req, res, suc);
            }).catch((err) => {
                return this.errorJson(req, res, err);
            });
        }
    }

    return new UsersOneSignalsController();
})();
