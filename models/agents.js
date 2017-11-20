var admin = require("firebase-admin"); //firebase admin SDK
var agents = {};
agents.get = function(callback){
  admin.database().ref().child('chats/AgentChatData').once('value', snapshot=> {
    let agentData;
    if(snapshot.val() !== null){
      agentData = snapshot.val();
    }
    callback(agentData);
  });
}
agents.create = obj => {
  admin.database().ref().child('chats/AgentChatData').push(obj);
}
agents.update = obj => {
  admin.database().ref().child('chats/AgentChatData').update(obj);
}
agents.updateProf = (i,obj) => {
  admin.database().ref().child('chats/AgentChatData').child(i).child("Profile").update(obj);
}
module.exports = agents;
