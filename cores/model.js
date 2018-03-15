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
        'createdTime': {type: Date, defualt: Date.now()},
        'endedTime': {type: Date, defualt: Date.now()},
        'isDeleted': Boolean,
        'startedTime': {type: Date, defualt: Date.now()},
        'text': String,
        'title': String,
        'type': {type: String, defualt: 'text'},
        'updatedTime': {type: Date, defualt: Date.now()}
    });

    let ChatroomSchema = new mongoose.Schema({
        'createdTime': {type: Date, defualt: Date.now()},
        'messagers': [{
            'unRead': {type: Number, defualt: 0}
        }],
        'messages': [{
            'from': String,
            'isDeleted': Boolean,
            'messager_id': String,
            'src': String,
            'text': String,
            'time': {type: Date, defualt: Date.now()},
            'type': String
        }]
    });

    let KeywordreplySchema = new mongoose.Schema({
        'createdTime': {type: Date, defualt: Date.now()},
        'messagers': [{
            'unRead': {type: Number, defualt: 0}
        }],
        'messages': [{
            'from': String,
            'isDeleted': Boolean,
            'messager_id': String,
            'src': String,
            'text': String,
            'time': {type: Date, defualt: Date.now()},
            'type': String
        }]
    });

    let ComposeSchema = new mongoose.Schema({
        'createdTime': {type: Date, defualt: Date.now()},
        'endedTime': {type: Date, defualt: Date.now()},
        'isDeleted': Boolean,
        'startedTime': {type: Date, defualt: Date.now()},
        'text': String,
        'title': String,
        'type': {type: String, defualt: 'text'},
        'updatedTime': {type: Date, defualt: Date.now()}
    });

    let GreetingSchema = new mongoose.Schema({
        'isDeleted': Boolean,
        'text': String,
        'type': String,
        'updatedTime': {type: Date, defualt: Date.now()},
        'createdTime': {type: Date, defualt: Date.now()}
    });

    let MessagerSchema = new mongoose.Schema({
        'Uid': String,
        'age': Number,
        'assigned': String,
        'chatCount': Number, // TODO chatTimeCount -> chatCount
        'chatroom_id': String,
        'custom_tags': Object,
        'email': String,
        'updatedTime': {type: Date, defualt: Date.now()},
        'createdTime': {type: Date, defualt: Date.now()}, // firstChat -> createdTime
        'gener': String,
        'isDeleted': Boolean,
        'name': String,
        'photo': String,
        'lastTime': String,
        'remark': String,
        'totalCount': Number
    });

    let TicketSchema = new mongoose.Schema({
        'updatedTime': {type: Date, defualt: Date.now()},
        'createdTime': {type: Date, defualt: Date.now()},
        'dueTime': {type: Date, defualt: Date.now()},
        'isDeleted': Boolean,
        'messager_id': String,
        'priority': Number, // TODO 三個 型態建議用字串大寫
        'status': Number    // TODO 三個 型態建議用字串大寫
    });

    let AppSchema = new mongoose.Schema({
        'createdTime': {type: Date, defualt: Date.now()},
        'updatedTime': {type: Date, defualt: Date.now()},
        'group_id': String,
        'id1': String,
        'id2': String,
        'isDeleted': Boolean,
        'name': String,
        'secret': String,
        'token1': String,
        'token2': String,
        'type': String,

        'autoreplies': [AutoreplySchema],
        'chatrooms': [ChatroomSchema],
        'keywordreplies': [KeywordreplySchema],
        'composes': [ComposeSchema],
        'greetings': [GreetingSchema],
        'messagers': [MessagerSchema],
        'tickets': [TicketSchema],
        'webhook_id': String
    });

    let EventSchema = new mongoose.Schema({
        'description': String,
        'endedTime': Date,
        'isAllDay': Boolean,
        'isDeleted': Boolean,
        'startedTime': Date,
        'title': Date
    });

    let CalendarSchema = new mongoose.Schema({
        'events': [EventSchema]
    });

    let MemberSchema = new mongoose.Schema({
        'createdTime': {type: Date, defualt: Date.now()},
        'updatedTime': {type: Date, defualt: Date.now()},
        'isDeleted': Boolean,
        'status': Boolean,
        'type': String,
        'user_id': String
    });

    let GroupSchema = new mongoose.Schema({
        'app_ids': [String],
        'createdTime': {type: Date, defualt: Date.now()},
        'updatedTime': {type: Date, defualt: Date.now()},
        'isDeleted': Boolean,
        'members': [MemberSchema],
        'name': String
    });

    let UserSchema = new mongoose.Schema({
        'createdTime': {type: Date, defualt: Date.now()},
        'updatedTime': {type: Date, defualt: Date.now()},
        'address': String,
        'calendar_id': String,
        'company': String,
        'email': String,
        'phone': String,
        'isDeleted': Boolean,
        'name': String,
        'group_ids': [String]
    });

    let WebhookSchema = new mongoose.Schema({
        'app_id': String
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