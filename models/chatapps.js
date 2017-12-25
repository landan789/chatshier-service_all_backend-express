var admin = require("firebase-admin"); //firebase admin SDK
var chatappsModel = {};
chatappsModel.getApps = (userId,callback) => {
    admin.database().ref('apps').on('value', snap => {
    	let dataArr = [];
        let Data = snap.val();
        for(let i in Data) {
        	if(Data[i].user_id === userId) {
        		dataArr.push(Data[i]);
        		callback(dataArr);
        	}
        }
    });
}
module.exports = chatappsModel;