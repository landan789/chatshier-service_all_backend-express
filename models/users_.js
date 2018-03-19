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
         */
        find(userId, callback) {
            let query = {
                '_id': userId
            };
            let users = {};
            return this.Model.findOne(query).then((user) => {
                users = {
                    [user._id]: user
                };
                ('function' === typeof callback) && callback(users);
                return Promise.resolve(users);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }

        insert(userId, user, callback) {
            let users;
            let _user = new this.Model();
            _user.email = user.email || '';
            _user.name = user.name || '';
            _user.company = user.company || '';


            return _user.save().then((__user) => {
                let query = {
                    '_id': __user._id
                };
                return this.Model.findOne(query);
            }).then((user) => {
                let _user = {
                    createdTime: user.createdTime,
                    updatedTime: user.updatedTime,
                    isDeleted: user.isDeleted,
                    email: user.email,
                    company: user.company,
                    name: user.name
                };
                users = {
                    [user._id]: _user
                };
                return Promise.resolve(users);
            }).then((users) => {
                ('function' === typeof callback) && callback(users);
                return Promise.resolve(users);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }

        findCalendarId(userId, callback) {
            let query = {
                '_id': userId
            };
            return this.Model.findOne(query).then((user) => {
                if (!user) {
                    return Promise.reject(new Error());
                };
                return Promise.resolve(user);
            }).then((user) => {
                let calendarId = user.calendar_id;
                ('function' === typeof callback) && callback(calendarId);
                return Promise.resolve(calendarId);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }

        update(userId, user, callback) {
            let query = {
                '_id': userId
            };
            let users;
            return this.Model.update(query, {
                $set: user
            }).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.Model.findOne(query);
            }).then((user) => {
                users = {
                    [user._id]: user
                };
                ('function' === typeof callback) && callback(users);
                return Promise.resolve(users);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(null);
            });
        }
    }
    return new UsersModel();
    
})();
