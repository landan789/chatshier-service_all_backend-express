module.exports = (function() {
    const CHATSHIER = require('../config/chatshier');
    let mongoose = require('mongoose');

    // #region DB 連線只需要做一次，故放 class 外面
    const url = 'mongodb://' + CHATSHIER.MONGODB.HOST + ':' + CHATSHIER.MONGODB.PORT + '/' + CHATSHIER.MONGODB.DATABASE;
    const options = {
        user: CHATSHIER.MONGODB.USERNAME,
        pass: CHATSHIER.MONGODB.PASSWORD,
        connectTimeoutMS: 0
    };
    mongoose.connect(url, options);

    const db = mongoose.connection;
    db.on('error', () => {
        console.log('[FAILED] the db client of api-chatshier is not connecting to MongoDB !!');
    });
    db.once('open', () => {
        console.log('[SUCCEEDED] the db client of api-chatshier is connecting to MongoDB !!');
    });
    // #endregion

    // #region DB Schema
    const Schema = mongoose.Schema;
    const RootsSchema = new Schema();

    const AutorepliesSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'startedTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'timezoneOffset': {type: Number, default: 0},
        'periods': [{
            'days': {type: Array, default: []},
            'startedTime': {type: String, default: '00:00'},
            'endedTime': {type: String, default: '00:00'}
        }],
        'text': {type: String, default: ''},
        'title': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'src': {type: String, default: ''},
        'template_id': {type: String, default: ''},
        'imagemap_id': {type: String, default: ''}
    });

    const ChatroomsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'name': {type: String, default: ''},
        'platformGroupId': {type: String, default: ''},
        'platformGroupType': {type: String, default: ''},
        'messagers': [{
            'isDeleted': {type: Boolean, default: false},
            'createdTime': {type: Date, default: Date.now()},
            'updatedTime': {type: Date, default: Date.now()},
            'age': {type: Number, default: 0},
            'assigned_ids': {type: [{type: String}], default: []},
            'address': {type: String, default: ''},
            'county': {type: String, default: ''},
            'chatCount': {type: Number, default: 0},
            'birthday': {type: String, default: '1970-01-01'},
            'custom_fields': {type: Object, default: {}},
            'district': {type: String, default: ''},
            'email': {type: String, default: ''},
            'gender': {type: String, default: ''},
            'isUnfollowed': {type: Boolean, default: false},
            'lastTime': {type: Date, default: Date.now()},
            'namings': {type: Object, default: {}},
            'phone': {type: String, default: ''},
            'platformUid': {type: String, default: ''},
            'remark': {type: String, default: ''},
            'tags': {type: [{type: String}], default: []},
            'type': {type: String, default: 'CHATSHIER'},
            'unRead': {type: Number, default: 0}
        }],
        'messages': [{
            'isDeleted': {type: Boolean, default: false},
            'from': {type: String, default: 'SYSTEM'},
            'messager_id': {type: String, default: ''},
            'src': {type: String, default: ''},
            'text': {type: String, default: ''},
            'time': {type: Date, default: Date.now()},
            'type': {type: String, default: 'text'},
            'template': {type: Object, default: {}},
            'imagemap': {type: Object, default: {}}
        }]
    }, { minimize: false });

    const KeywordrepliesSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'keyword': {type: String, default: ''},
        'subKeywords': {type: Array, default: []},
        'replyCount': {type: Number, default: 0},
        'status': {type: Boolean, default: false}, // false 為草稿，true 為開放
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'src': {type: String, default: ''},
        'template_id': {type: String, default: ''},
        'imagemap_id': {type: String, default: ''}
    });

    const ComposesSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'text': {type: String, default: ''},
        'src': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'conditions': [{
            'type': {type: String, default: ''},
            'values': {type: Array, default: []},
            'field_id': {type: String, default: ''}
        }],
        'status': {type: Boolean, default: false}, // false 為草稿，true 為開放
        'time': {type: Date, default: Date.now() - 60000}, // 立刻群發後讓訊息變成歷史訊息
        'template_id': {type: String, default: ''},
        'imagemap_id': {type: String, default: ''}
    }, { minimize: false });

    const GreetingsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'text': {type: String, default: ''},
        'type': {type: String, default: 'text'},
        'src': {type: String, default: ''},
        'template_id': {type: String, default: ''},
        'imagemap_id': {type: String, default: ''}
    });

    const TemplatesSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'name': {type: String, default: ''},
        'type': {type: String, default: 'template'},
        'altText': {type: String, default: ''},
        'template': {type: Object, default: {}}
    });

    const RichmenusSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'selected': {type: Boolean, default: false},
        'chatBarText': {type: String, default: ''},
        'form': {type: String, default: ''},
        'name': {type: String, default: ''},
        'src': {type: String, default: ''},
        'platformMenuId': {type: String, default: ''},
        'isActivated': {type: Boolean, default: false},
        'isDefault': {type: Boolean, default: false},
        'size': {type: Object, default: {}},
        'areas': [{
            'bounds': {type: Object, default: {}},
            'action': {type: Object, default: {}}
        }]
    }, { minimize: false });

    const ImagemapsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'type': {type: String, default: 'imagemap'},
        'baseUrl': {type: String, default: ''},
        'altText': {type: String, default: ''},
        'form': {type: String, default: ''},
        'title': {type: String, default: ''},
        'baseSize': {type: Object, default: {}},
        'actions': [{
            'type': {type: String, default: ''},
            'linkUri': {type: String, default: ''},
            'text': {type: String, default: ''},
            'area': {type: Object, default: {}}
        }]
    }, { minimize: false });

    const CategoriesSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'type': {type: String, default: 'NORMAL'},
        'parent_id': {type: String, default: ''},
        'name': {type: String, default: ''},
        'product_ids': {type: [{type: String}], default: []}
    });

    const ProductsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'type': {type: String, default: 'NORMAL'},
        'name': {type: String, default: ''},
        'description': {type: String, default: ''},
        'price': {type: Number, default: 0},
        'quantity': {type: Number, default: 0},
        'src': {type: String, default: ''},
        'isOnShelf': {type: Boolean, default: false},
        'receptionist_ids': {type: [{type: String}], default: []}
    });

    const ReceptionistsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'gcalendarId': {type: String, default: ''},
        'isCalendarShared': {type: Boolean, default: false},
        'name': {type: String, default: ''},
        'photo': {type: String, default: ''},
        'email': {type: String, default: ''},
        'phone': {type: String, default: ''},
        'timezoneOffset': {type: Number, default: 0},
        'maxNumberPerDay': {type: Number, default: 1},
        'interval': {type: Number, default: 0}, // Unit time
        'timesOfAppointment': {type: Number, default: 0},
        'schedules': [{
            'isDeleted': {type: Boolean, default: false},
            'createdTime': {type: Date, default: Date.now()},
            'updatedTime': {type: Date, default: Date.now()},
            'eventId': {type: String, default: ''},
            'eventChannelId': {type: String, default: ''},
            'summary': {type: String, default: ''},
            'description': {type: String, default: ''},
            'start': {
                'date': {type: Date, default: Date.now()},
                'dateTime': {type: Date, default: Date.now()}
            },
            'end': {
                'date': {type: Date, default: Date.now()},
                'dateTime': {type: Date, default: Date.now()}
            },
            'recurrence': {type: [{type: String}], default: []}
        }]
    });

    const AppointmentsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'product_id': {type: String, default: ''},
        'receptionist_id': {type: String, default: ''},
        'platformUid': {type: String, default: ''},
        'startedTime': {type: Date, default: Date.now()},
        'endedTime': {type: Date, default: Date.now()},
        'summary': {type: String, default: ''},
        'description': {type: String, default: ''},
        'eventId': {type: String, default: ''}, // Google calendar event,
        'eventChannelId': {type: String, default: ''},
        'isAccepted': {type: Boolean, default: false}
    });

    const FieldsSchema = new Schema({
        'text': {type: String, default: ''},
        'alias': {type: String, default: ''},
        'type': {type: String, default: 'CUSTOM'},
        'sets': {type: Array, default: ['']},
        'setsType': {type: String, default: 'TEXT'},
        'order': {type: Number, default: 0},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'isDeleted': {type: Boolean, default: false},
        'canShowingOnForm': {type: Boolean, default: false}
    });

    const TicketsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'description': {type: String, default: ''},
        'dueTime': {type: Date, default: Date.now()},
        'platformUid': {type: String, default: ''},
        'assigned_id': {type: String, default: ''},
        'priority': {type: Number, default: 0}, // TODO 三個 型態建議用字串大寫
        'status': {type: Number, default: 0} // TODO 三個 型態建議用字串大寫
    });

    const PaymentsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'type': {type: String, default: ''},
        'merchantId': {type: String, default: ''},
        'hashKey': {type: String, default: ''},
        'hashIV': {type: String, default: ''},
        'canIssueInvoice': {type: Boolean, default: false},
        'invoiceMerchantId': {type: String, default: ''},
        'invoiceHashKey': {type: String, default: ''},
        'invoiceHashIV': {type: String, default: ''}
    });

    const AppsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'group_id': {type: String, default: ''},
        'id1': {type: String, default: ''},
        'id2': {type: String, default: ''},
        'name': {type: String, default: ''},
        'secret': {type: String, default: ''},
        'token1': {type: String, default: ''},
        'token2': {type: String, default: ''},
        'type': {type: String, default: ''},
        'webhook_id': {type: String, default: ''},
        'gcalendarId': {type: String, default: ''},

        'payments': [PaymentsSchema],
        'autoreplies': [AutorepliesSchema],
        'chatrooms': [ChatroomsSchema],
        'keywordreplies': [KeywordrepliesSchema],
        'composes': [ComposesSchema],
        'greetings': [GreetingsSchema],
        'templates': [TemplatesSchema],
        'fields': [FieldsSchema],
        'tickets': [TicketsSchema],
        'richmenus': [RichmenusSchema],
        'imagemaps': [ImagemapsSchema],

        'categories': [CategoriesSchema],
        'products': [ProductsSchema],
        'receptionists': [ReceptionistsSchema],
        'appointments': [AppointmentsSchema]
    });

    const EventsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'description': {type: String, default: ''},
        'endedTime': {type: Date, default: Date.now()},
        'isAllDay': {type: Boolean, default: false},
        'startedTime': {type: Date, default: Date.now()},
        'title': {type: String, default: ''}
    });

    const CalendarsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'events': [EventsSchema]
    });

    const MembersSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'status': {type: Boolean, default: false},
        'type': {type: String, default: ''},
        'user_id': {type: String, default: ''}
    });

    const GroupsSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'members': [MembersSchema],
        'name': {type: String, default: ''},
        'app_ids': {type: [{type: String}], default: []}
    });

    const UsersSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'address': {type: String, default: ''},
        'calendar_ids': {type: [{type: String}], default: []},
        'company': {type: String, default: ''},
        'email': {type: String, default: ''},
        'phone': {type: String, default: ''},
        'password': {type: String, default: '300102985f51c92c06703ea845025b4fb4c791b7'}, // cipher.Hlp.encode('123456') -> 300102985f51c92c06703ea845025b4fb4c791b7
        'name': {type: String, default: ''},
        'group_ids': {type: [{type: String}], default: []},
        'oneSignals': [{ // use for OneSignal notification
            'isDeleted': {type: Boolean, default: false},
            'createdTime': {type: Date, default: Date.now()},
            'updatedTime': {type: Date, default: Date.now()},
            'oneSignalAppId': {type: String, default: ''},
            'oneSignalUserId': {type: String, default: ''}
        }]
    });

    const ConsumersSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'updatedTime': {type: Date, default: Date.now()},
        'createdTime': {type: Date, default: Date.now()},
        'type': {type: String, default: ''},
        'platformUid': {type: String, default: ''},
        'name': {type: String, default: ''},
        'photo': {type: String, default: ''},
        'photoOriginal': {type: String, default: ''}
    });

    const OrdersSchema = new Schema({
        'isDeleted': {type: Boolean, default: false},
        'createdTime': {type: Date, default: Date.now()},
        'updatedTime': {type: Date, default: Date.now()},
        'products': [{
            'product_id': {type: String, default: ''},
            'name': {type: String, default: ''},
            'description': {type: String, default: ''},
            'count': {type: Number, default: 0},
            'unitPrice': {type: Number, default: 0},
            'unit': {type: String, default: ''},
            'remark': {type: String, default: ''}
        }],
        'tradeId': {type: String, default: ''},
        'tradeDate': {type: Date, default: Date.now()},
        'tradeAmount': {type: Number, default: 0},
        'tradeDescription': {type: String, default: ''},
        'isPaid': {type: Boolean, default: false},
        'isInvoiceIssued': {type: Boolean, default: false},
        'invoiceId': {type: String, default: ''},
        'invoiceNumber': {type: String, default: ''},
        'invoiceRandomNumber': {type: String, default: ''},
        'taxId': {type: String, default: ''},
        'consumer_id': {type: String, default: ''},
        'payerName': {type: String, default: ''},
        'payerEmail': {type: String, default: ''},
        'payerPhone': {type: String, default: ''},
        'payerAddress': {type: String, default: ''},
        'app_id': {type: String, default: ''}
    });

    // #endregion

    class ModelCore {
        constructor () {
            this.COLLECTION = '';
            this.Types = mongoose.Types;
            this.RootsSchema = RootsSchema;
            this.AppsSchema = AppsSchema;
            this.CalendarsSchema = CalendarsSchema;
            this.ConsumersSchema = ConsumersSchema;
            this.GroupsSchema = GroupsSchema;
            this.UsersSchema = UsersSchema;
            this.OrdersSchema = OrdersSchema;

            this.Schemas = {
                'apps': AppsSchema
            };
        }

        model(collection, schema) {
            return mongoose.model(collection, schema);
        }

        _find(query) {
            if ('' === this.COLLECTION) {
                return Promise.reject(new Error());
            }
            let virtualModel = this.COLLECTION;
            let modelsArray = virtualModel.split('.');
            let realModel = modelsArray[0] || '';
            this.realModel = this.model(realModel, this.Schemas[realModel]);

            let pipelinesArray = [];

            // $unwind
            let _model = '';
            for (let i = 1; i < modelsArray.length; i++) {
                let model = modelsArray[i];
                _model = _model + (1 === i ? '' : '.') + model;
                let pipeline = {
                    $unwind: '$' + _model
                };
                pipelinesArray.push(pipeline);
            }

            // $match
            let match = {};
            _model = '';
            match['isDeleted'] = false;
            for (let i = 1; i < modelsArray.length; i++) {
                let model = modelsArray[i];

                _model = _model + (1 === i ? '' : '.') + model;
                match[`${_model}.isDeleted`] = false;
            }
            /** @type Object */
            let pipeline = {
                $match: {
                    ...match,
                    ...query
                }
            };
            pipelinesArray.push(pipeline);

            // $project
            pipeline = {
                $project: {}
            };

            if (0 === modelsArray.length) {
                pipeline['$project']['_id'] = true;
            }

            if (1 < modelsArray.length) {
                pipeline['$project'][modelsArray[1]] = true;
            }

            pipelinesArray.push(pipeline);

            // $group
            for (let j = modelsArray.length; j > 1; j--) {
                let _id = {};
                for (let i = 0; i < j - 1; i++) {
                    let _model = modelsArray.slice(1, i + 1).map((model) => {
                        return model.replace(/s$/g, '');
                    }).join('_');
                    let __model = modelsArray.slice(1, i + 1).join('.');

                    (j === modelsArray.length) && (_id[`${_model}_id`] = '$' + __model + (0 === i ? '' : '.') + '_id');
                    (j !== modelsArray.length) && (_id[`${_model}_id`] = '$_id.' + _model + '_id');
                }
                pipeline = {
                    $group: {
                        _id: _id,
                        [modelsArray[(j - 1)]]: {
                            $push: '$' + modelsArray.slice(1, j).join('.')
                        }
                    }
                };
                pipelinesArray.push(pipeline);
            }

            // let __model = modelsArray[(modelsArray.length - 1)];
            // pipeline['$group'][__model] = {
            //     $push: '$' + _model
            // }
            console.log(JSON.stringify(pipelinesArray, null, 2));

            return this.realModel.aggregate(pipelinesArray).then((resultsArray) => {

            });
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
