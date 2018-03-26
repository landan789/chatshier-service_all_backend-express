module.exports = (function() {
    let ModelCore = require('../cores/model');
    const USERS = 'users';

    class AuthenticationsModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(USERS, this.UsersSchema);

            this.project = {
                email: true,
                name: true
            };
        }

        /**
         * @param {string|string[]|null} userIds
         * @param {string|string[]|null} emails
         * @param {Function} [callback]
         */
        findUser(userIds, emails, callback) {
            if (userIds && !(userIds instanceof Array)) {
                userIds = [userIds];
            }

            if (emails && !(emails instanceof Array)) {
                emails = [emails];
            }

            let query = {
                'isDeleted': false
            };

            if (userIds instanceof Array) {
                query['_id'] = {
                    $in: userIds.map((userId) => this.Types.ObjectId(userId))
                };
            };
            if (emails instanceof Array) {
                query['email'] = {
                    $in: emails
                };
            };

            return this.Model.find(query, this.project).then((results) => {
                let authentications = {};
                if (0 === results.length) {
                    return authentications;
                }
                return this.toObject(results);
            }).then((authentications) => {
                ('function' === typeof callback) && callback(authentications);
                return authentications;
            }).catch((err) => {
                ('function' === typeof callback) && callback(null);
                return Promise.reject(err);
            });
        }
    }

    return new AuthenticationsModel();
})();
