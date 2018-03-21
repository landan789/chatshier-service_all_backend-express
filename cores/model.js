module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let mongoose = require('mongoose');

    // region DB 連線只需要做一次，故放 class 外面
    let url = 'mongodb://' + CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT + '/' + CHATSHIER.MONGODB.DATABASE;
    mongoose.connect(url);
    let db = mongoose.connection;
    db.on('error', () => {
        console.log('[FAILED] ' + url + ' failed to connect ...');
    });
    db.once('open', () => {
        console.log('[SUCCED] ' + url + ' succeded to connect ...');
    });
    // endregion

    // region DB Schema
    let RootsSchema = new mongoose.Schema();

    let AutorepliesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'isDeleted': Boolean,
        'startedTime': {type: Date, default: Date.now()},
        'text': String,
        'title': String,
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let ChatroomsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'messagers': [{
            'unRead': {type: Number, default: 0}
        }],
        'messages': [{
            'from': String,
            'isDeleted': Boolean,
            'messager_id': {type: String, default: ''},
            'src': String,
            'text': String,
            'time': {type: Date, default: Date.now()},
            'type': {type: String, default: 'text'}
        }]
    });

    let KeywordrepliesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': Boolean,
        'keyword': String,
        'replyCount': Number,
        'status': Number,
        'text': String,
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let ComposesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'isDeleted': Boolean,
        'startedTime': {type: Date, default: Date.now()},
        'text': String,
        'title': String,
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let GreetingsSchema = new mongoose.Schema({
        'isDeleted': Boolean,
        'text': String,
        'type': String,
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()}
    });

    let MessagersSchema = new mongoose.Schema({
        'Uid': String,
        'age': Number,
        'assigned': String,
        'chatCount': Number, // TODO chatTimeCount -> chatCount
        'chatroom_id': String,
        'custom_tags': Object,
        'email': String,
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()}, // firstChat -> createdTime
        'gener': String,
        'isDeleted': Boolean,
        'name': String,
        'photo': String,
        'lastTime': String,
        'remark': String,
        'totalCount': Number
    });

    let FieldsSchema = new mongoose.Schema({
        'text': String,
        'alias': String,
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
        'dueTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'messager_id': String,
        'priority': Number, // TODO 三個 型態建議用字串大寫
        'status': Number // TODO 三個 型態建議用字串大寫
    });

    let AppsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'group_id': {type: Array, default: []},
        'id1': String,
        'id2': String,
        'isDeleted': {type: Boolean, default: false},
        'name': String,
        'secret': String,
        'token1': String,
        'token2': String,
        'type': String,

        'autoreplies': [AutorepliesSchema],
        'chatrooms': [ChatroomsSchema],
        'keywordreplies': [KeywordrepliesSchema],
        'composes': [ComposesSchema],
        'greetings': [GreetingsSchema],
        'messagers': [MessagersSchema],
        'fields': [FieldsSchema],
        'tickets': [TicketsSchema],
        'webhook_id': {type: Array, default: []}
    });

    let EventsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'description': String,
        'endedTime': Date,
        'isAllDay': {type: Boolean, default: false},
        'isDeleted': {type: Boolean, default: false},
        'startedTime': Date,
        'title': String
    });

    let CalendarsSchema = new mongoose.Schema({
        'events': [EventsSchema]
    });

    let MembersSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'status': {type: Boolean, default: false},
        'type': String,
        'user_id': {type: Array, default: []}
    });

    let GroupsSchema = new mongoose.Schema({
        'app_id': {type: Array, default: []},
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
        'calendar_id': {type: Array, default: []},
        'company': {type: String, default: ''},
        'email': {type: String, default: ''},
        'phone': {type: String, default: ''},
        'isDeleted': {type: Boolean, default: false},
        'password': {type: String, default: '300102985f51c92c06703ea845025b4fb4c791b7'}, // cipher.Hlp.encode('123456') -> 300102985f51c92c06703ea845025b4fb4c791b7
        'name': {type: String, default: ''},
        'group_id': {type: Array, default: []}
    });

    let WebhooksSchema = new mongoose.Schema({
        'app_id': {type: Array, default: []}
    });
    // endregion

    class ModelCore {
        constructor () {
            this.Types = mongoose.Types;

            this.RootsSchema = RootsSchema;
            this.AppsSchema = AppsSchema;
            this.CalendarsSchema = CalendarsSchema;
            this.GroupsSchema = GroupsSchema;
            this.UsersSchema = UsersSchema;
            this.WebhooksSchema = WebhooksSchema;
        }

        model(collection, schema) {
            return mongoose.model(collection, schema);
        }

        toObject(array) {
            if (array && array._id) {
                let output = {
                    [array._id]: Object.assign({}, array)
                };
                delete output[array._id]._id;
                return output;
            } else if (!(array instanceof Array)) {
                return array || {};
            }

            return array.reduce((output, curr) => {
                if (!curr._id) {
                    return output;
                }

                output[curr._id] = curr;
                delete curr._id;
                return output;
            }, {});
        }
    };

    return ModelCore;
})();
