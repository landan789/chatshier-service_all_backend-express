
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

// var childSchema = mongoose.Schema({
//     name: String,
//     age: Number,
//     phone: String
// });

// var parentSchema = mongoose.Schema({
//     // Array of subdocuments
//     // Single nested subdocuments. Caveat: single nested subdocs only work
//     // in mongoose >= 4.2.0
//     test: String,
//     date: String
// });

// var Parent = mongoose.model('Parent', parentSchema);

// // parent.save(() => {
// //     console.log('parent saved...');
// // });
// var cursor = Parent.find({}).cursor();


// cursor.on('data', function(doc) {
//   console.log(doc);
// });

let apps_mdl = require('../models/apps_.js');
let cursor = apps_mdl.find({}).cursor();

cursor.on('data', function(doc) {
  console.log(doc);
});