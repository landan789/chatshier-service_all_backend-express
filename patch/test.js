var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/chatshier');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

// var users = mongoose.Schema({
//     name: String,
//     email: String
// })

// var Users = mongoose.model('users', users);
// let user = new Users();
// user.name = 'TOM';
// user.email = 'tom@gmail.com';
// user.save(() => {
//     console.log('user saved...');
// });

var childSchema = mongoose.Schema({
    name: String,
    age: Number
});

var parentSchema = mongoose.Schema({
    // Array of subdocuments
    children: [childSchema],
    // Single nested subdocuments. Caveat: single nested subdocs only work
    // in mongoose >= 4.2.0
    child: childSchema
});

var Parent = mongoose.model('Parent', parentSchema);
var parent = new Parent({ children: [{ name: 'Matt' }, { name: 'Sarah' }] })

parent.children[0].name = 'Matthew';

// parent.save(() => {
//     console.log('parent saved...');
// });
var cursor = Parent.find({
    'children.name': 'Mattew'
}).cursor();


cursor.on('data', function(doc) {
  console.log(doc);
});