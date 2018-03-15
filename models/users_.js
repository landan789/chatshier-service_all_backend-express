module.exports = (function() {
    let ModelCore = require('../cores/model');
    let COLLECTION = 'users';
    class UsersModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(COLLECTION, this.UserSchema);
        }

        /**
         * 根據 使用者ID 取得該使用者
         *
         * @param {string} userId
         * @param {(data: any) => any} callback
         * @returns {void}
         */
        find(userId, callback) {
            let query = {
                '_id': userId
            };
            let users = {};
            Promise.resolve().then(() => {
                return this.Model.findOne(query);
            }).then((user) => {
                users = {
                    [user._id]: user
                };
                callback(users);
            }).catch(() => {
                callback(null);
            });
        }

        insert(userId, user, callback) {
            let query = {
                '_id': userId
            };
            let _user = new this.Model();
            _user.address = user.address;

            let users = {};
            Promise.resolve().then(() => {
                return this.Model.findOne(query);
            }).then((__user) => {
                if (__user) {
                    return Promise.reject(new Error());
                };
                return _user.save();
            }).then((_user) => {
                users = {
                    [_user._id]: _user
                };
                callback(users);
            }).catch(() => {
                callback(null);
            });
        }

        findCalendarId(userId, callback) {
            let query = {
                '_id': userId
            };
            Promise.resolve().then(() => {
                return this.Model.findOne(query);
            }).then((user) => {
                if (!user) {
                    return Promise.reject(new Error());
                };
                return Promise.resolve(user);
            }).then((user) => {
                let calendarId = user.calendar_id;
                callback(calendarId);
            }).catch(() => {
                callback(null);
            });
        }

        update(userId, user, callback) {
            let query = {
                '_id': userId
            };
            let users;
            Promise.resolve().then(() => {
                return this.Model.update(query, {
                    $set: user
                });
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                users = {
                    [user._id]: user
                };
                return this.Model.findOne(query);
            }).then((user) => {
                users = {
                    [user._id]: user
                };
                callback(users);
            }).catch(() => {
                callback(null);
            });
        }
    }
    return new UsersModel();
    
})();
