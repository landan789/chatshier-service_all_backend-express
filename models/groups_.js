module.exports = (function() {
    let ModelCore = require('../cores/model');
    let COLLECTION = 'users';
    const OWNER = 'OWNER';
    class GroupsModel extends ModelCore {
        constructor() {
            super();
            this.Model = this.model(COLLECTION, this.GroupSchema);
        }
        find(groupIds, userId, callback) {
            let groups = {};
            // polymorphism from groupid | groupid[]
            if ('string' === typeof groupIds) {
                groupIds = [groupIds];
            };
            return Promise.all(groupIds.map((groupId) => {
                let query = {
                    '_id': groupId,
                    'isDeleted': 0,
                    'members.isDeleted': 0,
                    'members.status': 1,
                    'members.user_id': userId
                };
                return this.Model.findOne(query).then((group) => {
                    let members = {};
                    let _members = group.members;
                    while (0 < _members.length) {
                        let member = _members.pop();
                        let __members = {
                            [member._id]: member
                        };
                        Object.assign(members, __members);
                    };
                    group.members = members;
                    groups[group._id] = group;
                });
            })).then(() => {
                ('function' === typeof callback) && callback(groups);
            }).catch(() => {
                ('function' === typeof callback) && callback(null);
            });
        }
        insert(userId, group, callback) {
            let groups = {};
            let groupId;

            let _group = new this.Model();
            _group.app_ids = group.app_ids;
            _group.name = group.name;
            
            // The creator of groups must be the owner of group
            _group.members[0] = {
                status: 1,
                type: OWNER,
                user_id: userId
            };

            return _group.save().then((__group) => {
                groups = {
                    [__group._id]: __group
                };
                callback(groups);
            });

        }
    }
    
})();
