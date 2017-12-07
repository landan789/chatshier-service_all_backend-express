var admin = require("firebase-admin"); //firebase admin SDK
var linetemplate = {};
linetemplate.get = (userId, callback) => {
    //return all data in this userId
    admin.database().ref().child('message-line-template').once('value', snapshot=> {
        let data;
        if(snapshot.val() !== null){
            data = snapshot.val();
        }
        callback(data);
    });
}
linetemplate.getTemplate = (channelId, msg, callback) => {
    //return template with same channelId & keyword
    admin.database().ref().child('message-line-template').once('value', snapshot=> {
        let data;
        if(snapshot.val() !== null){
            data = snapshot.val();
            for( let prop in data ) {
                if( data[prop].keyword==msg && data[prop].channelId==channelId ) {
                    callback(data[prop]);
                    return;
                }
            }
        }
        else callback(null);
    });
}
linetemplate.getMsg = (channelId, msg, callback) => {
    //return template with same channelId & keyword
    admin.database().ref().child('message-line-template').once('value', snapshot=> {
        let data;
        if(snapshot.val() !== null){
            data = snapshot.val();
            for( let prop in data ) {
                if( data[prop].status=="open" && data[prop].keyword==msg && data[prop].channelId==channelId ) {
                    callback(data[prop].template);
                    return;
                }
            }
        }
        else callback(null);
    });
}
linetemplate.set = function(userId, path, template){
    //set template with same userId & path
    admin.database().ref().child('message-line-template').child(path).update(template);
}
linetemplate.create = function(userId, template){
    //set template with same userId & path
    admin.database().ref().child('message-line-template').push(template);
}
module.exports = linetemplate;
