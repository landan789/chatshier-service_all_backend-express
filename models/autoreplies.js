var admin = require("firebase-admin"); //firebase admin SDK
var autoreplies = {};

autoreplies.getAll = function(callback) {
  admin.database().ref().child('autoreplies').once('value', snapshot => {
    callback();
  });
}

autoreplies.getAutoInfoById = function(autosUserId,callback) {
  admin.database().ref().child('autoreplies/' + autosUserId).once('value', snapshot => {
    let data = snapshot.val();
    callback(data);
  });
}

autoreplies.post = function(obj,callback) {
  let autosHashId = admin.database().ref('autoreplies').push().key;
  admin.database().ref('autoreplies/' + autosHashId).update({...obj,autosHashId});
  callback(autosHashId);
}

autoreplies.update = function(obj,autosHashId,callback) {
  admin.database().ref('autoreplies/' + autosHashId).update(obj);
  callback();
}

autoreplies.del = function(autosHashId,callback) {
  admin.database().ref('autoreplies/' + autosHashId).remove();
  callback();
}

module.exports = autoreplies;
