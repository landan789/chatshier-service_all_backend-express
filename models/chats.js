var admin = require("firebase-admin"); //firebase admin SDK
var chats = {}; // 宣告物件因為module需要物件
chats.findChatData = callback => {
  admin.database().ref().child('chats/Data').once('value', snapshot=> {
    let chatData = snapshot.val();
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
chats.insertMessageByMessengerIdAndAppId = (appId,msgId,msgObj) => {
  let proceed = new Promise((resolve,reject) => {
    resolve();
  });

  proceed
    .then(() => {
      return new Promise((resolve,reject) => {
        admin.database().ref().child('apps/' + appId + '/messengers/' + msgId).once('value', (data) => {
          let chats = data.val().chats;
          resolve(chats);
        });
      });
    })
    .then((data) => {
      let chats = data;
      if(null === chats || undefined === chats || 0 === chats.length) {
        admin.database().ref().child('apps/' + appId + '/messengers/' + msgId + '/chats/0').set(msgObj);
        return;
      }
      admin.database().ref().child('apps/' + appId + '/messengers/' + msgId + '/chats/' + chats.length).set(msgObj);
    })
    .catch(() => {
      console.log('Insert Failed');
    });
}
chats.updateProfileByMessengerIdAndAppId = (appId,msgId,profObj) => {
  admin.database().ref().child('apps/' + appId + '/messengers/' + msgId).update(profObj);
}
chats.loadChatHistory = (chatData,callback) => {
  let sendData = [];
    for( let i in chatData ) {
        let profile = chatData[i].Profile;
        let _lastMsg = chatData[i].Messages[ chatData[i].Messages.length-1 ];
        if( profile.recentChat != _lastMsg.time ) {
          profile.recentChat = _lastMsg.time;
          let timeArr = chatData[i].Messages.map( function(ele) {
            return ele.time;
          });
          let times = [];
          let j=0;
          const GAP = 1000*60*15; //15 min
          let headTime;
          let tailTime;
          while( j<timeArr.length ) {
            headTime = tailTime = timeArr[j];
            while( timeArr[j]-tailTime < GAP ) {
              tailTime = timeArr[j];
              j++;
              if( j==timeArr.length ) break;
            }
            let num = tailTime-headTime;
            if( num<1000 ) num = 1000;
            times.push(num);
          }
          let sum = 0;
          for( let j in times ) sum += times[j];
          sum /= 60000;
          profile.totalChat = sum;
          profile.avgChat = sum/times.length;
          profile.chatTimeCount = times.length;
          if( isNaN(profile.avgChat) || profile.avgChat<1 ) profile.avgChat = 1;
          if( isNaN(profile.totalChat) || profile.totalChat<1 ) profile.totalChat  = 1;
          let updateObj = {};
          chats.updateObj(i,{
            "avgChat": profile.avgChat,
            "totalChat": profile.totalChat,
            "chatTimeCount": profile.chatTimeCount,
            "recentChat": profile.recentChat
          });
        }
        let msgs = chatData[i].Messages;
        let position = 0;
        if( msgs.length>20 ) {
          position = msgs.length-20;
          msgs = msgs.slice(position);
        }
        sendData.push({
          Messages: msgs,
          position: position,
          Profile: profile
        });
    }
    callback(sendData);
}
module.exports = chats;
