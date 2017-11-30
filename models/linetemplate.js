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
linetemplate.get = (channelId, msg, callback) => {
    admin.database().ref().child('message-line-template').once('value', snapshot=> {
        let data;
        if(snapshot.val() !== null){
            data = snapshot.val();
            for( let prop in data ) {
                if( data[prop].keyword==msg ) {
                    callback(data[prop].template);
                    return;
                }
            }
        }
        else callback(null);
    });
}
linetemplate.set = function(keyword, template){
  admin.database().ref().child('message-line-template').child(keyword).set(template);
}
module.exports = linetemplate;
