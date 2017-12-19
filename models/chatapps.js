var admin = require("firebase-admin"); //firebase admin SDK
var chatappsModel = {};
chatappsModel.getApps = (userId,callback) => {
    admin.database().ref('apps/' + userId).once('value', snap => {
        let Data = snap.val();
        callback(Data);
    });
}
module.exports = chatappsModel;