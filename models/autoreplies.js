var admin = require("firebase-admin"); //firebase admin SDK
var autoreplies = {};

autoreplies.getAll = function(callback) {
  admin.database().ref().child('autoreplies').once('value', snapshot => {
    console.log(snapshot.val());
    callback();
  });
}

autoreplies.getAutoInfoById = function(autosUserId,callback) {
  admin.database().ref().child('autoreplies/' + autosUserId).once('value', snapshot => {
    let data = snapshot.val()
    callback(data);
  });
}

autoreplies.post = function(obj,callback) {
  let autoHashId = admin.database().ref('autoreplies').push().key;
  admin.database().ref('autoreplies/' + autoHashId).update({...obj,hash});
  callback(autoHashId);
}

autoreplies.update = function(obj,autoHashId,callback) {
  admin.database().ref('autoreplies/' + autoHashId).update(obj);
  callback(autoHashId);
}

autoreplies.del = function(autoHashId,callback) {
  admin.database().ref('autoreplies/' + autoHashId).remove();
  callback();
}

module.exports = autoreplies;
