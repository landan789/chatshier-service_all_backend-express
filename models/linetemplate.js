var admin = require("firebase-admin"); //firebase admin SDK
var linetemplate = {};
linetemplate.get = function(callback){
  admin.database().ref().child('message-line-template').once('value', snapshot=> {
    let data;
    if(snapshot.val() !== null){
      data = snapshot.val();
    }
    callback(data);
  });
}
linetemplate.set = function(keyword, template){
  admin.database().ref().child('message-line-template').child(keyword).set(template);
}
module.exports = linetemplate;
