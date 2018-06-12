module.exports = (function() {
    const ModelCore = require('../cores/model');
    const USERS = 'users';

    class UsersModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(USERS, this.UsersSchema);
        }

        /**
         * 根據 使用者ID 取得該使用者
         *
         * @param {string|string[]} [userIds]
         * @param {string|string[]} [emails]
         * @param {(users: Chatshier.Models.Users | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Users | null>}
         */
        find(userIds, emails, callback) {
            if (userIds && !(userIds instanceof Array)) {
                userIds = [userIds];
            }

            if (emails && !(emails instanceof Array)) {
                emails = [emails];
            }

            let query = {
                isDeleted: false
            };

            if (userIds instanceof Array) {
                query['_id'] = {
                    $in: userIds.map((userId) => this.Types.ObjectId(userId))
                };
            }

            if (emails instanceof Array) {
                query['email'] = {
                    $in: emails
                };
            }

            return this.Model.find(query).then((results) => {
                let users = {};
                if (0 !== results.length) {
                    users = this.toObject(results);
                }
                return Promise.resolve(users);
            }).then((users) => {
                ('function' === typeof callback) && callback(users);
                return users;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} userId
         * @param {(calendarIds: string[] | null) => any} [callback]
         * @returns {Promise<string[] | null>}
         */
        findCalendarId(userId, callback) {
            let query = {
                '_id': userId
            };
            return this.Model.findOne(query).then((user) => {
                if (!user) {
                    return Promise.reject(new Error());
                };
                return user.calendar_ids;
            }).then((calendarIds) => {
                ('function' === typeof callback) && callback(calendarIds);
                return calendarIds;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {any} user
         * @param {(users: Chatshier.Models.Users | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Users | null>}
         */
        insert(user, callback) {
            let users;
            let query = {};
            let _query = {};

            let _user = new this.Model();
            _user._id = user._id || '';
            _user.email = user.email || '';
            _user.name = user.name || '';
            _user.company = user.company || '';
            _user.password = user.password;
            _user.group_ids = user.group_ids || [];
            _user.createdTime = user.updatedTime = Date.now();

            if (user.email) {
                query['email'] = user.email;
            }
            return this.Model.findOne(query).then((__user) => {
                if (__user) {
                    return Promise.reject(new Error('USER_IS_EXIST'));
                };
            }).then(() => {
                return _user.save();
            }).then((__user) => {
                _query = {
                    '_id': __user._id
                };
                return this.Model.findOne(_query);
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
                return users;
            }).then((users) => {
                ('function' === typeof callback) && callback(users);
                return users;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }

        /**
         * @param {string} userId
         * @param {any} putUser
         * @param {(users: Chatshier.Models.Users | null) => any} [callback]
         * @returns {Promise<Chatshier.Models.Users | null>}
         */
        update(userId, putUser, callback) {
            putUser = putUser || {};
            putUser.updatedTime = Date.now();

            let query = {
                '_id': this.Types.ObjectId(userId)
            };

            let doc = { $set: {} };
            for (let prop in putUser) {
                doc.$set[prop] = putUser[prop];
            }

            return this.Model.update(query, doc).then((result) => {
                if (!result.ok) {
                    return Promise.reject(new Error());
                };
                return this.Model.findOne(query);
            }).then((user) => {
                let users = {
                    [user._id]: user
                };
                ('function' === typeof callback) && callback(users);
                return users;
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
                return null;
            });
        }
    }
    return new UsersModel();
})();
