module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    const mongoose = require('mongoose');

    // region DB 連線只需要做一次，故放 class 外面
    const url = 'mongodb://' + CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT + '/' + CHATSHIER.MONGODB.DATABASE;
    const options = {
        user: CHATSHIER.MONGODB.USERNAME,
        pass: CHATSHIER.MONGODB.PASSWORD
    };
    mongoose.connect(url, options);

    const db = mongoose.connection;
    db.on('error', () => {
        console.log('[FAILED] the db client of service.chatshier is not connecting to MongoDB !!');
    });
    db.once('open', () => {
        console.log('[SUCCEEDED] the db client of service.chatshier is connecting to MongoDB !!');
    });
    // endregion

    // region DB Schema
    const RootsSchema = new mongoose.Schema();

    const AutorepliesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'startedTime': {type: Date, default: Date.now()},
        'text': {type: String, default: ''},
        'title': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    const ChatroomsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'platformGroupId': {type: String, default: ''},
        'platformGroupType': {type: String, default: ''},
        'messagers': [{
            'createdTime': {type: Date, default: Date.now()},
            'updatedTime': {type: Date, default: Date.now()},
            'type': {type: String, default: 'CHATSHIER'},
            'age': {type: Number, default: 0},
            'custom_fields': {type: Object, default: {}},
            'email': {type: String, default: ''},
            'gender': {type: String, default: ''},
            'phone': {type: String, default: ''},
            'platformUid': {type: String, default: ''},
            'isDeleted': {type: Boolean, default: false},
            'lastTime': {type: Date, default: Date.now()},
            'chatCount': {type: Number, default: 0},
            'unRead': {type: Number, default: 0},
            'remark': {type: String, default: ''},
            'assigned_ids': {type: [{type: String}], default: []}
        }],
        'messages': [{
            'from': {type: String, default: 'SYSTEM'},
            'isDeleted': {type: Boolean, default: false},
            'messager_id': {type: String, default: ''},
            'src': {type: String, default: ''},
            'text': {type: String, default: ''},
            'time': {type: Date, default: Date.now()},
            'type': {type: String, default: 'text'},
            'template': {type: Object, default: {}}
        }]
    }, { minimize: false });

    const KeywordrepliesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'keyword': {type: String, default: ''},
        'replyCount': {type: Number, default: 0},
        'status': {type: Boolean, default: false}, // false 為草稿，true 為開放
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()}
    });

    const ComposesSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'text': {type: String, default: ''},
        'src': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()},
        'ageRange': {type: Array},
        'status': {type: Boolean, default: false}, // false 為草稿，true 為開放
        'gender': {type: String, default: ''},
        'field_ids': {type: Object, default: {}},
        'time': {type: Date, default: Date.now() - 60000} // 立刻群發後讓訊息變成歷史訊息
    }, { minimize: false });

    const GreetingsSchema = new mongoose.Schema({
        'isDeleted': {type: Boolean, default: false},
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()}
    });

    const TemplatesSchema = new mongoose.Schema({
        'isDeleted': {type: Boolean, default: false},
        'keyword': {type: String, default: ''},
        'altText': {type: String, default: ''},
        'type': {type: String, default: 'template'},
        'template': {type: Object, default: {}},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()}
    });

    const RichmenusAreasSchema = new mongoose.Schema({
        'bounds': {type: Object, default: {}},
        'action': {type: Object, default: {}}
    }, { minimize: false });

    const RichmenusSchema = new mongoose.Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'selected': {type: Boolean, default: false},
        'chatBarText': {type: String, default: ''},
        'form': {type: String, default: ''},
        'name': {type: String, default: ''},
        'src': {type: String, default: ''},
        'platformMenuId': {type: String, default: ''},
        'size': {type: Object, default: {}},
        'areas': [RichmenusAreasSchema]
    }, { minimize: false });

    const FieldsSchema = new mongoose.Schema({
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

    const TicketsSchema = new mongoose.Schema({
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'description': {type: String, default: ''},
        'dueTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'platformUid': {type: String, default: ''},
        'assigned_id': {type: String, default: ''},
        'priority': {type: Number, default: 0}, // TODO 三個 型態建議用字串大寫
        'status': {type: Number, default: 0} // TODO 三個 型態建議用字串大寫
    });

    const AppsSchema = new mongoose.Schema({
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
        'templates': [TemplatesSchema],
        'fields': [FieldsSchema],
        'tickets': [TicketsSchema],
        'richmenus': [RichmenusSchema],
        'webhook_id': {type: String, default: ''}
    });

    const EventsSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'description': {type: String, default: ''},
        'endedTime': {type: Date, default: Date.now()},
        'isAllDay': {type: Boolean, default: false},
        'isDeleted': {type: Boolean, default: false},
        'startedTime': {type: Date, default: Date.now()},
        'title': {type: String, default: ''}
    });

    const CalendarsSchema = new mongoose.Schema({
        'events': [EventsSchema],
        'isDeleted': {type: Boolean, default: false}
    });

    const MembersSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'status': {type: Boolean, default: false},
        'type': {type: String, default: ''},
        'user_id': {type: String, default: ''}
    });

    const GroupsSchema = new mongoose.Schema({
        'app_ids': {type: [{type: String}], default: []},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'members': [MembersSchema],
        'name': {type: String, default: ''}
    });

    const UsersSchema = new mongoose.Schema({
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'address': {type: String, default: ''},
        'calendar_ids': {type: [{type: String}], default: []},
        'company': {type: String, default: ''},
        'email': {type: String, default: ''},
        'phone': {type: String, default: ''},
        'isDeleted': {type: Boolean, default: false},
        'password': {type: String, default: '300102985f51c92c06703ea845025b4fb4c791b7'}, // cipher.Hlp.encode('123456') -> 300102985f51c92c06703ea845025b4fb4c791b7
        'name': {type: String, default: ''},
        'group_ids': {type: [{type: String}], default: []}
    });

    const ConsumersSchema = new mongoose.Schema({
        'type': {type: String, default: ''},
        'platformUid': {type: String, default: ''},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'name': {type: String, default: ''},
        'photo': {type: String, default: ''}
    });

    // endregion

    class ModelCore {
        constructor () {
            this.Types = mongoose.Types;
            this.AutorepliesSchema = AutorepliesSchema;
            this.RootsSchema = RootsSchema;
            this.AppsSchema = AppsSchema;
            this.CalendarsSchema = CalendarsSchema;
            this.ConsumersSchema = ConsumersSchema;
            this.GroupsSchema = GroupsSchema;
            this.UsersSchema = UsersSchema;
        }

        model(collection, schema) {
            return mongoose.model(collection, schema);
        }

        /**
         * @param {any[]} array
         * @param {string} [key="_id"]
         */
        toObject(array, key) {
            let idKey = key || '_id';
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
