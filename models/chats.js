var admin = require("firebase-admin"); //firebase admin SDK
var chats = {}; // 宣告物件因為module需要物件
chats.get = callback => {
  admin.database().ref().child('chats/Data').once('value', snapshot=> {
    let chatData;
    if(snapshot.val() !== null){
      chatData = snapshot.val();
    }
    callback(chatData);
  });
}
chats.create = obj => {
  admin.database().ref().child('chats/Data').push(obj);
}
chats.update = obj => {
  admin.database().ref().child('chats/Data').update(obj);
}
chats.updateObj = (i,obj) => {
  admin.database().ref().child('chats/Data').child(i).child("Profile").update(obj);
}
module.exports = chats;
