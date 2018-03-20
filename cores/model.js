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
    let RootSchema = new mongoose.Schema();

    let AutoreplySchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'isDeleted': Boolean,
        'startedTime': {type: Date, default: Date.now()},
        'text': String,
        'title': String,
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let ChatroomSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'messagers': [{
            'unRead': {type: Number, default: 0}
        }],
        'messages': [{
            'from': String,
            'isDeleted': Boolean,
            'messager_id': {type: Array, default: []},
            'src': String,
            'text': String,
            'time': {type: Date, default: Date.now()},
            'type': String
        }]
    });

    let KeywordreplySchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': Boolean,
        'keyword': String,
        'replyCount': Number,
        'status': Number,
        'text': String,
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let ComposeSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'isDeleted': Boolean,
        'startedTime': {type: Date, default: Date.now()},
        'text': String,
        'title': String,
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    let GreetingSchema = new mongoose.Schema({
        'isDeleted': Boolean,
        'text': String,
        'type': String,
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()}
    });

    let MessagerSchema = new mongoose.Schema({
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

    let TicketSchema = new mongoose.Schema({
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'dueTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'messager_id': String,
        'priority': Number, // TODO 三個 型態建議用字串大寫
        'status': Number    // TODO 三個 型態建議用字串大寫
    });

    let AppSchema = new mongoose.Schema({
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

        'autoreplies': [AutoreplySchema] || [],
        'chatrooms': [ChatroomSchema] || [],
        'keywordreplies': [KeywordreplySchema] || [],
        'composes': [ComposeSchema] || [],
        'greetings': [GreetingSchema] || [],
        'messagers': [MessagerSchema] || [],
        'tickets': [TicketSchema] || [],
        'webhook_id': {type: Array, default: []}
    });

    let EventSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'description': String,
        'endedTime': Date,
        'isAllDay': {type: Boolean, default: false},
        'isDeleted': {type: Boolean, default: false},
        'startedTime': Date,
        'title': String
    });

    let CalendarSchema = new mongoose.Schema({
        'events': [EventSchema]
    });

    let MemberSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'status': {type: Boolean, default: false},
        'type': String,
        'user_id': {type: Array, default: []}
    });

    let GroupSchema = new mongoose.Schema({
        'app_id': {type: Array, default: []},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'members': [MemberSchema],
        'name': {type: String, default: ''}
    });

    let UserSchema = new mongoose.Schema({
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

    let WebhookSchema = new mongoose.Schema({
        'app_id': {type: Array, default: []}
    });
    // endregion

    class ModelCore {
        constructor () {
            this.RootSchema = RootSchema;
            this.AppSchema = AppSchema;
            this.CalendarSchema = CalendarSchema;
            this.GroupSchema = GroupSchema;
            this.UserSchema = UserSchema;
            this.WebhookSchema = WebhookSchema;
        }

        model (name, schema) {
            return mongoose.model(name, schema);
        }
    };

    return ModelCore;
})();