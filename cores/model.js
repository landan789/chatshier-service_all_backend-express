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
    let RootSchema = new mongoose.Schema();
    let AppsSchema = new mongoose.Schema({
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

        'autoreplies': [{
            'createdTime': {type: Date, defualt: Date.now()},
            'endedTime': {type: Date, defualt: Date.now()},
            'isDeleted': Boolean,
            'startedTime': {type: Date, defualt: Date.now()},
            'text': String,
            'title': String,
            'type': {type: String, defualt: 'text'},
            'updatedTime': {type: Date, defualt: Date.now()}
        }],
        'chatrooms': [{
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
        }],
        'keywordreplies': [{
            'createdTime': {type: Date, defualt: Date.now()},
            'endedTime': {type: Date, defualt: Date.now()},
            'isDeleted': Boolean,
            'startedTime': {type: Date, defualt: Date.now()},
            'text': String,
            'title': String,
            'type': {type: String, defualt: 'text'},
            'updatedTime': {type: Date, defualt: Date.now()}
        }],
        'composes': [{
            'createdTime': {type: Date, defualt: Date.now()},
            'endedTime': {type: Date, defualt: Date.now()},
            'isDeleted': Boolean,
            'startedTime': {type: Date, defualt: Date.now()},
            'text': String,
            'title': String,
            'type': {type: String, defualt: 'text'},
            'updatedTime': {type: Date, defualt: Date.now()}
        }],
        'greetings': [{
            'isDeleted': Boolean,
            'text': String,
            'type': String,
            'updatedTime': {type: Date, defualt: Date.now()},
            'createdTime': {type: Date, defualt: Date.now()}
        }],
        'messagers': [{
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
        }],
        'tickets': [{
            'updatedTime': {type: Date, defualt: Date.now()},
            'createdTime': {type: Date, defualt: Date.now()},
            'dueTime': {type: Date, defualt: Date.now()},
            'isDeleted': Boolean,
            'messager_id': String,
            'priority': Number, // TODO 三個 型態建議用字串大寫
            'status': Number    // TODO 三個 型態建議用字串大寫
        }],
        'webhook_id': String
    });
    class ModelCore {
        constructor () {
            this.RootSchema = RootSchema;
            this.AppsSchema = AppsSchema;
        }

        model (name, schema) {
            return mongoose.model(name, schema);
        }
    };

    return ModelCore;
})();