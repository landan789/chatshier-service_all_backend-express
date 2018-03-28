module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let mongoose = require('mongoose');

    // region DB 連線只需要做一次，故放 class 外面
    let url = 'mongodb://' + CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT + '/' + CHATSHIER.MONGODB.DATABASE;
    let options = {
        user: CHATSHIER.MONGODB.USERNAME,
        pass: CHATSHIER.MONGODB.PASSWORD
    };
    mongoose.connect(url, options);
    let db = mongoose.connection;
    db.on('error', () => {
        console.log('[FAILED]    ' + url + ' failed to connect !!');
    });
    db.once('open', () => {
        console.log('[SUCCEEDED] ' + url + ' succeeded to connect !!');
    });
    // endregion

    // region DB Schema
    let RootsSchema = new mongoose.Schema();

    let AutorepliesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'startedTime': {type: Date, default: Date.now()},
        'text': {type: String, default: ''},
        'title': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let ChatroomsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'messagers': [{
            'isDeleted': {type: Boolean, default: false},
            'unRead': {type: Number, default: 0}
        }],
        'messages': [{
            'from': {type: String, default: 'SYSTEM'},
            'isDeleted': {type: Boolean, default: false},
            'messager_id': {type: String, default: ''},
            'src': {type: String, default: ''},
            'text': {type: String, default: ''},
            'time': {type: Date, default: Date.now()},
            'type': {type: String, default: 'text'}
        }]
    });

    let KeywordrepliesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'keyword': {type: String, default: ''},
        'replyCount': {type: Number, default: 0},
        'status': {type: Boolean, default: false},
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let ComposesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()},
        'ageRange': {type: Array},
        'status': {type: Boolean, default: false},
        'gender': {type: String, default: ''},
        'field_ids': {type: Object, default: {}},
        'time': {type: Date, default: Date.now() - 60000} // 立刻群發後讓訊息變成歷史訊息
    });

    let GreetingsSchema = new mongoose.Schema({
        'isDeleted': {type: Boolean, default: false},
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()}
    });

    let MessagersSchema = new mongoose.Schema({
        'platformUid': {type: String, default: ''},
        'age': {type: Number, default: 0},
        'assigned': {type: String, default: ''},
        'chatCount': {type: Number, default: 0},
        'chatroom_id': {type: String, default: ''},
        'custom_fields': {type: Object, default: {}},
        'email': {type: String, default: ''},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'gender': {type: String, default: ''},
        'isDeleted': {type: Boolean, default: false},
        'name': {type: String, default: ''},
        'photo': {type: String, default: ''},
        'lastTime': {type: Date, default: Date.now()},
        'remark': {type: String, default: ''},
        'totalCount': {type: Number, default: 0}
    });

    let FieldsSchema = new mongoose.Schema({
        'text': {type: String, default: ''},
        'alias': {type: String, default: ''},
        'type': {type: String, default: 'CUSTOM'},
        'sets': {type: Array, default: ['']},
        'setsType': {type: String, default: 'TEXT'},
        'order': {type: Number, default: 0},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false}
    });

    let TicketsSchema = new mongoose.Schema({
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'description': {type: String, default: ''},
        'dueTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'messager_id': {type: String, default: ''},
        'assigned_id': {type: String, default: ''},
        'priority': {type: Number, default: 0}, // TODO 三個 型態建議用字串大寫
        'status': {type: Number, default: 0} // TODO 三個 型態建議用字串大寫
    });

    let AppsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'group_id': {type: String, default: ''},
        'id1': {type: String, default: ''},
        'id2': {type: String, default: ''},
        'isDeleted': {type: Boolean, default: false},
        'name': {type: String, default: ''},
        'secret': {type: String, default: ''},
        'token1': {type: String, default: ''},
        'token2': {type: String, default: ''},
        'type': {type: String, default: ''},

        'autoreplies': [AutorepliesSchema],
        'chatrooms': [ChatroomsSchema],
        'keywordreplies': [KeywordrepliesSchema],
        'composes': [ComposesSchema],
        'greetings': [GreetingsSchema],
        'messagers': [MessagersSchema],
        'fields': [FieldsSchema],
        'tickets': [TicketsSchema],
        'webhook_id': {type: String, default: ''}
    });

    let EventsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'description': {type: String, default: ''},
        'endedTime': {type: Date, default: Date.now()},
        'isAllDay': {type: Boolean, default: false},
        'isDeleted': {type: Boolean, default: false},
        'startedTime': {type: Date, default: Date.now()},
        'title': {type: String, default: ''}
    });

    let CalendarsSchema = new mongoose.Schema({
        'events': [EventsSchema],
        'isDeleted': {type: Boolean, default: false}
    });

    let MembersSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'status': {type: Boolean, default: false},
        'type': {type: String, default: ''},
        'user_id': {type: String, default: ''}
    });

    let GroupsSchema = new mongoose.Schema({
        'app_ids': {type: Array, default: []},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'members': [MembersSchema],
        'name': {type: String, default: ''}
    });

    let UsersSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'address': {type: String, default: ''},
        'calendar_ids': {type: Array, default: []},
        'company': {type: String, default: ''},
        'email': {type: String, default: ''},
        'phone': {type: String, default: ''},
        'isDeleted': {type: Boolean, default: false},
        'password': {type: String, default: '300102985f51c92c06703ea845025b4fb4c791b7'}, // cipher.Hlp.encode('123456') -> 300102985f51c92c06703ea845025b4fb4c791b7
        'name': {type: String, default: ''},
        'group_ids': {type: Array, default: []}
    });

    let WebhooksSchema = new mongoose.Schema({
        'app_id': {type: String, default: ''}
    });
    // endregion

    class ModelCore {
        constructor () {
            this.Types = mongoose.Types;
            this.AutorepliesSchema = AutorepliesSchema;
            this.RootsSchema = RootsSchema;
            this.AppsSchema = AppsSchema;
            this.CalendarsSchema = CalendarsSchema;
            this.GroupsSchema = GroupsSchema;
            this.UsersSchema = UsersSchema;
            this.WebhooksSchema = WebhooksSchema;
            this.KeywordrepliesSchema = KeywordrepliesSchema;
        }

        model(collection, schema) {
            return mongoose.model(collection, schema);
        }

        /**
         * @param {any[]} array
         * @param {string} [idKey="_id"]
         */
        toObject(array, idKey) {
            idKey = idKey || '_id';

            if (array && array[idKey]) {
                let output = {
                    [array[idKey]]: array
                };
                return output;
            } else if (!(array instanceof Array)) {
                return array || {};
            }

            return array.reduce((output, item) => {
                if (!item[idKey]) {
                    return output;
                }

                output[item[idKey]] = item;
                return output;
            }, {});
        }
    };

    return ModelCore;
})();
