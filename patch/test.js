let users_mdl = require('../models/users_.js');

// users_mdl.insert('5aa8d75977e1b034f7f8508f', user, (user) => {
//   console.log(user);
// });

// users_mdl.find('5aaa2ad5c27c600586125a62', (users) => {
//     console.log(users);
// });
let userId = '5aaa2c5a84297108d14b731c';
let user = {
    address: '地址拉ss!!!'
};

users_mdl.update(userId, user, (users) => {
    console.log('sss');
});
