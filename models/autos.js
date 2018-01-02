var admin = require("firebase-admin"); //firebase admin SDK
var autos = {};

autos.get = function(callback) {
  admin.database().ref().child('message-autoreply').once('value', snapshot=> {
    let autoreplyData;
    if(snapshot.val() !== null){
      autoreplyData = snapshot.val();
    }
    callback(autoreplyData);
  });
}

autos.getAll = function(callback) {
  admin.database().ref().child('autos').once('value', snapshot => {
    console.log(snapshot.val());
    callback();
  });
}

autos.getAutoInfoById = function(autoId,callback) {
  admin.database().ref().child('autos/' + autoId).once('value', snapshot => {
    let data = snapshot.val()
    callback(data);
  });
}

autos.post = function(obj,callback) {
  let hash = admin.database().ref('autos').push().key;
  admin.database().ref('autos/' + hash).update({...obj,hash});
  callback(hash);
}

autos.update = function(obj,hash,callback) {
  admin.database().ref('autos/' + hash).update(obj);
  callback(hash);
}

autos.del = function(hash,callback) {
  admin.database().ref('autos/' + hash).remove();
  callback();
}

module.exports = autos;
