var chats = require('./models/chats');
var utility = require('./helpers/utility');
var messageHandle = {};
messageHandle.toDB = (obj, pictureUrl, channelId, receiverId, unRead, callback) => {
    send_to_firebase(obj, pictureUrl, channelId, receiverId, unRead, callback);
}
messageHandle.toFront = (obj, pictureUrl, channelId, receiverId, unRead, callback) => {
    send_to_frontSocket(obj, pictureUrl, channelId, receiverId, unRead, callback);
}
messageHandle.filterUser = (channelIdArr, chatData, callback) => {
  let newData = {};
  for( let i in chatData ) {
    let profile = chatData[i].Profile;
    if( !profile ) continue;
    let chanId = profile.channelId;
    if( channelIdArr.indexOf(chanId)!=-1 ) {
      newData[i] = chatData[i];
    }
  }
  callback(newData);
}
messageHandle.loadChatHistory = (chatData,callback) => {
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
function send_to_firebase(obj, pictureUrl, channelId, receiverId, unRead, callback){
    let flag = true;
    let count_unread = unRead;    //0 or 1
    chats.findChatData(function(chatData){
      console.log(chatData);
        for( let prop in chatData ) {
          let data = chatData[prop];
          if( utility.isSameUser(data.Profile, receiverId, channelId) ) {
            let length = data.Messages.length;    //訊息總長度
            count_unread += data.Profile.unRead;    //新的UNREAD加上舊的UNREAD數目
            let updateObj = {};       //建立update物件
            updateObj['/'+prop+'/Messages/'+length] = obj;  //將最新一則的訊息放至訊息陣列的最後
            if( unRead>0 ) updateObj['/'+prop+'/Profile/unRead'] = count_unread;    //如果新訊息是user發的，則須更新unread
            if( pictureUrl ) updateObj['/'+prop+'/Profile/photo'] = pictureUrl;    //如果有獲得user的頭貼，則更新頭貼
            else pictureUrl = data.Profile.pictureUrl;      //如果無獲得user的頭貼，則將原本頭貼傳回全端
            chats.update(updateObj);
            flag = false;
            break;
          }
        }
        if( flag ) {
            let newData = {
                Profile: {
                    name: obj.name,
                    userId: receiverId ? receiverId : obj.id,
                    channelId: channelId ? channelId : 'unassigned',
                    gender: obj.gend ? obj.gend : "",
                    age: -1,
                    telephone: "",
                    firstChat: Date.now(),
                    recentChat: Date.now(),
                    chatTimeCount: 1,
                    totalChat: 1,
                    avgChat: 1,
                    unRead: 1,
                    assigned: "",
                    email: "",
                    remark: "",
                    photo: pictureUrl? pictureUrl : ""
                },
                Messages: [obj]
          };
          chats.create(newData);
          callback(newData.Profile);
        }
    });
}
function send_to_frontSocket(obj, pictureUrl, channelId, receiverId, unRead, callback) {
    let data = JSON.parse(JSON.stringify(obj));
    data.unRead = unRead;
    data.channelId = channelId;
    data.id = receiverId;
    data.photo = pictureUrl;
    callback(data);
}
module.exports = messageHandle;
