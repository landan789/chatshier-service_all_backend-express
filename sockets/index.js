var app = require('../app');
var socketio = require('socket.io');
var linebot = require('linebot'); // line串接
var MessengerPlatform = require('facebook-bot-messenger'); // facebook串接
var admin = require("firebase-admin"); //firebase admin SDK
var serviceAccount = require("../config/firebase-adminsdk.json"); //firebase admin requires .json auth
var databaseURL = require("../config/firebaseAdminDatabaseUrl.js");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});
var agents = require('../models/agents');
var autos = require('../models/autos');
var chats = require('../models/chats');
var keywords = require('../models/keywords');
var tags = require('../models/tags');
var users = require('../models/users');
var utility = require('../helpers/utility');
var messageHandle = require('../message_handle');
function init(server) {
    var io = socketio(server);
    var addFriendBroadcastMsg; // 加好友參數
    var bot = []; // LINE bot設定
    var channelIds = [-1, -1, -1];
    var overview = {};
    var linebotParser = [
      function() {
        console.log("Enter channel_1 information first");
      },
      function() {
        console.log("Enter channel_2 information first");
      }
    ];
    //==============FACEBOOK MESSAGE==============
    app.post('/webhook', function (req, res) {
      var data = req.body;
      console.log('data on line 91');
      console.log(data);

      // Make sure this is a page subscription
      if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
          var pageID = entry.id;
          var timeOfEvent = entry.time;

          // Iterate over each messaging event
          entry.messaging.forEach(function(event) {
            console.log('this is event');
            console.log(event);
            if (event.message) {
              console.log('Entered');
              loadFbProfile(event, event.sender.id);
            }
            else {
              console.log("Webhook received unknown event: ", event);
            }
          });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
      }else{
        console.log('on line 124');
      }
    });//app.post
    //==============FACEBOOK MESSAGE END==============
    app.post('/linehook1', function() {
      linebotParser[0](arguments[0], arguments[1], arguments[2]);
    });
    app.post('/linehook2', function() {
      linebotParser[1](arguments[0], arguments[1], arguments[2]);
    });
    io.on('connection', function (socket) {
      console.log('connected');
      /*===聊天室start===*/
      // 按照程式流程順序
      // 1.更新標籤
      socket.on('get tags from chat', () => {
        tags.get(function(tagsData){
          socket.emit('push tags to chat', tagsData);
        });
      });
      // 2.更新群組
      socket.on('update bot', (data) => {
        update_line_bot(data);
      });
      // 3.更新群組頻道
      socket.on('request channels', (userId)=> {
        users.getUser(userId, chatInfo => {
          utility.updateChannel(chatInfo, (channelObj) => {
            socket.emit('response line channel', channelObj);
          });
        });
      });
      // 4.撈出歷史訊息
      socket.on('get json from back', () => {
        chats.get(function(chatData){
          messageHandle.loadChatHistory(chatData, sendData => {
            socket.emit('push json to front', sendData);
          });
        });
      });
      // 從SHIELD chat傳送訊息
      socket.on('send message', data => {
        let msg = data.msg;
        let agent_sendTo_receiver = data.id === undefined ? "agent_sendTo_receiver undefined!" : data.id
        let chanId = data.channelId;
        let agent_nickname = socket.nickname ? socket.nickname : 'agent';
        var message;
        let nowTime = Date.now();
        //====send to fb or line====//
        if(chanId === 'FB_room'){
          send_to_FB(msg, agent_sendTo_receiver);
        }
        else {
          send_to_Line(msg, agent_sendTo_receiver, chanId);
        }
        // 傳到shield chat
        var msgObj = {
          owner: "agent",
          name: agent_nickname,
          time: nowTime,
          message: "undefined_message"
        };
        if(chanId === 'FB_room'){
          //------FACEBOOK-------
          if (msg.startsWith('/image')){
            // msgObj.message = data.msg+'"/>';
          }
          else if (msg.startsWith('/video')){
            // msgObj.message = data.msg+ '" type="video/mp4"></video>';
          }
          else if (msg.startsWith('/audio')){
            // msgObj.message = data.msg+ '" type="audio/mpeg"></audio>';
          }
          else {
            msgObj.message = data.msg;
          }
          messageHandle.toDB(msgObj, null, 'FB', agent_sendTo_receiver, 0, profile => {

          });
          messageHandle.toFront(msgObj, null, 'FB', agent_sendTo_receiver, 0, data => {
            
          });
          pushAndEmit(msgObj, null, 'FB', agent_sendTo_receiver, 0);
        }
        else {
          // -----LINE-----
          let channelId = -1;
          if( channelIds.indexOf(chanId) !== -1 ) channelId = chanId;
          if (msg.includes('/image')) {
            msgObj.message = '傳圖檔給客戶';
          }
          else if (msg.includes('/audio')) {
            msgObj.message = '傳音檔給客戶';
          }
          else if (msg.includes('/video')) {
            msgObj.message = '傳影檔給客戶';
          }
          else if ( utility.isUrl(msg) ) {
            let urlStr = '<a href=';
            if (msg.indexOf('https') !== -1 || msg.indexOf('http') !== -1) {
              urlStr += '"http://';
            }
            msgObj.message = urlStr + msg + '/" target="_blank">' + msg + '</a>';
          }
          else if (msg.includes('/sticker')) {
            msgObj.message = 'Send sticker to user';
          }
          else {
            msgObj.message = msg;
          }
          pushAndEmit(msgObj, null, channelId, agent_sendTo_receiver, 0);
        }
      }); //sent message
      // 更新客戶資料
      socket.on('update profile', (data, callback) => {
        console.log(184);
        chats.get(function(chatData){
          for( let i in chatData ) {
            if( utility.isSameUser(chatData[i].Profile, data.userId, data.channelId) ) {
              let updateObj = {};
              for( let prop in data ) {
                updateObj[prop] = data[prop];
              }
              chats.updateObj(i,updateObj);
              break;
            }
          }
        });
      });
      // 當使用者要看客戶之前的聊天記錄時要向上滾動
      socket.on('upload history msg from front', data => {
        let userId = data.userId;
        let roomId = data.roomId;
        let head = data.head;
        let tail = data.tail;
        let sendData = [];
        chats.get(function(chatData){
          for( let i in chatData ) {
            if( utility.isSameUser(chatData[i].Profile, userId, roomId) ) {
              for( let j=head; j<tail+1; j++ ) {
                sendData.push( chatData[i].Messages[j] );
              }
              break;
            }
          }
          socket.emit('upload history msg from back', {
            userId: userId,
            roomId: roomId,
            messages: sendData
          });
        });
      });
      // 訊息已讀
      socket.on('read message', data => {
        chats.get(function(chatData){
          for( let i in chatData ) {
            if( utility.isSameUser(chatData[i].Profile, data.userId, data.channelId) ) {
              chats.updateObj(i,{ "unRead": 0 });
              break;
            }
          }
        });
      });
      /*===聊天室end===*/

      /*===內部聊天室start===*/
      // 傳遞對照表，轉換agent的Id及Name
      socket.on('get agentIdToName list', function() {
        users.get(agentData => {
          let agentIdToName = { "0": "System" };
          for( let prop in agentData ) {
            agentIdToName[prop] = agentData[prop].nickname;
          }
          socket.emit('send agentIdToName list', agentIdToName);
        });
      });
      // 新增內部聊天室
      socket.on('create internal room', (Profile) => {
        let time = Date.now();
        Profile.roomId = time;
        Profile.firstChat = time;
        Profile.recentChat = time;
        let data = {
          "Messages": [{
            "agentId": "0",
            "message": Profile.roomName+"已建立",
            "time": time
          }],
          "Profile": Profile
        };
        agents.create(data);
      });
      // 5.撈出內部聊天室紀錄
      socket.on('get internal chat from back', (data) => {
        let thisAgentData = [];
        agents.get(function(agentChatData){
          for( let i in agentChatData ){
            if( agentChatData[i].Profile.agent.indexOf(data.id) != -1 ) {
              thisAgentData.push( agentChatData[i] );
            }
          }
          users.get(agentData => {
            let agentIdToName = { "0": "System" };
            for( let prop in agentData ) {
              agentIdToName[prop] = agentData[prop].nickname;
            }
            let internalTagsData = [
              { "name": "roomName", "type": "text", "set": "single", "modify": true },
              { "name": "description", "type": "text", "set": "multi", "modify": true },
              { "name": "owner", "type": "single-select", "set": [], "modify": true },
              { "name": "agent", "type": "multi-select", "set": [], "modify": true },
              { "name": "recentChat", "type": "time", "set": "", "modify": false },
              { "name": "firstChat", "type": "time", "set": "", "modify": false }
            ]
            socket.emit('push internal chat to front', {
              data: thisAgentData,
              agentIdToName: agentIdToName,
              internalTagsData: internalTagsData
            });
          });
        });
      });
      // 內部聊天室傳訊息
      socket.on('send internal message', (data) => {
        let roomId = data.roomId;
        emitIO_and_pushDB_internal(data.sendObj, roomId, socket.nickname);
      });
      // 更新內部聊天室右邊的資料
      socket.on('update internal profile', data => {
        agents.get(function(agentChatData){
          for( let i in agentChatData ) {
            if( agentChatData[i].Profile.roomId == data.roomId ) {
              let updateObj = {};
              for( let prop in data ) {
                updateObj[prop] = data[prop];
              }
              agents.updateProf(i, updateObj);
              break;
            }
          }
        });
      });
      /*===內部聊天室end===*/

      /*===訊息start===*/
      //更新關鍵字回覆
      socket.on('update add friend message', data => {
        addFriendBroadcastMsg = data;
      });
      socket.on('update overview', (data) => {
        overview[data.message] = data.time;
      });
      /*===訊息end===*/
      /*===設定start===*/
      // going to tags page
      socket.on('get tags from tags', () => {
        tags.get(function(tagsData){
          socket.emit('push tags to tags', tagsData);
        });
      });
      socket.on('update tags', data => {
        let updateObj = {};
        updateObj['/Data'] = data;
        tags.update(updateObj);
      });
      /*===設定end===*/
      // 新使用者
      socket.on('new user', (data, callback) => {
        if (data in users) {
          callback(false);
        }
        else {
          callback(true);
          socket.nickname = data;
          users[socket.nickname] = socket;
        }
      });
      socket.on('disconnect', (data) => {
        if (!socket.nickname) return;
        delete users[socket.nickname];
      });
    });
    // FUNCTIONS
    function pushAndEmit(obj, pictureUrl, channelId, receiverId, unRead){
      messageHandle.toDB(obj, pictureUrl, channelId, receiverId, unRead, profile => {
        io.sockets.emit('new user profile', profile);
      });
      messageHandle.toFront(obj, pictureUrl, channelId, receiverId, unRead, data => {
        io.sockets.emit('new message', data);
      });
    }
    //==============LINE MESSAGE==============
    function bot_on_message(event) {
      let channelId = this.options.channelId; // line群組ID
      let message_type = event.message.type; // line訊息類別 text, location, image, video...
      let receiverId = event.source.userId; // line客戶ID
      let nowTime = Date.now(); // 現在時間
      event.source.profile().then(function(profile) {
        let receiver_name = profile.displayName; // 客戶姓名
        let pictureUrl = profile.pictureUrl; // 客戶的profile pic
        if( receiver_name === undefined ) receiver_name = "userName_undefined";
        let msgObj = {
          owner: "user",
          name: receiver_name,
          time: nowTime,
          message: "undefined_message"
        };
        let replyMsgObj = {
          owner: "agent",
          name: "undefined name",
          time: nowTime,
          message: "undefined message"
      };
        //  ===================  訊息類別 ==================== //
        utility.lineMsgType(event, message_type, (msgData) => {
          msgObj.message = msgData;
          pushAndEmit(msgObj, pictureUrl, channelId, receiverId, 1);

          if (keywordsReply(msgObj.message)!==-1){
            console.log('keywordsreply bot replied!');
          }
          else if( autoReply(msgObj.message)!==-1 ) {
            console.log("autoreply bot replyed!");
          }
          else {
            console.log("no auto reply bot work! wait for agent reply");
          }
        });
        function keywordsReply(msg) {
            replyMsgObj.name = "KeyWords Reply";
            let sent = false;
            keywords.get(function(keywordData){
                for (let i in keywordData) {
                    for( let j in keywordData[i] ) {
                        let thisData = keywordData[i][j];
                        if(thisData.taskCate=="開放") {
                            let keywords = JSON.parse(JSON.stringify(thisData.taskSubK));
                            keywords.push(thisData.taskMainK);
                            keywords.map(function(word) {
                                if( msg.trim().toLowerCase() == word.trim().toLowerCase() ) {
                                    sent = true;
                                    for( let k in thisData.taskText ) {
                                        replyMsgObj.message = thisData.taskText[k];
                                        pushAndEmit(replyMsgObj, null, channelId, receiverId, 1);
                                        send_to_Line(thisData.taskText[k], receiverId, channelId);
                                    }
                                }
                            });
                        }
                    }
                }
                if(!sent) return -1;
            });
        }
        function autoReply(msg){
            replyMsgObj.name = "Auto Reply";
            sent = false;
            autos.get(function(autoreplyData){
                for(let i in autoreplyData) {
                    for( let j in autoreplyData[i] ) {
                        thisAutoReply = autoreplyData[i][j];
                        var starttime = new Date(thisAutoReply.taskStart).getTime() - 60*60*1000*8; //time需要轉換成毫秒並減去8小時
                        var endtime = new Date(thisAutoReply.taskEnd).getTime() - 60*60*1000*8; //time需要轉換成毫秒並減去8小時
                        var nowtime = new Date().getTime();
                        if(nowtime >= starttime && nowtime < endtime){
                            replyMsgObj.message = thisAutoReply.taskText;
                            pushAndEmit(replyMsgObj, null, channelId, receiverId, 1);
                            send_to_Line(thisAutoReply.taskText, receiverId, channelId);
                            sent = true;
                        }
                    }
                }
                if(!sent) return -1;
            });
        }
      });
    } // end of bot_on_message
    function bot_on_follow(event){
      let follow_message = [];
      if(addFriendBroadcastMsg === []){
        follow_message.push('感謝您將本帳號設為好友！');
      }else{
        follow_message = [];
        follow_message = addFriendBroadcastMsg;
      }
      event.reply(follow_message);
    } // end of bot_on_follow
    function update_line_bot( chanInfo ) {
      if( chanInfo.hasOwnProperty("line_1") ) {
        bot[0] = linebot(chanInfo.line_1);
        linebotParser[0] = bot[0].parser();
        bot[0].on('message', bot_on_message);
        bot[0].on('follow', bot_on_follow);
        channelIds[0] = chanInfo.line_1.channelId;
      }
      if( chanInfo.hasOwnProperty("line_2") ) {
        bot[1] = linebot(chanInfo.line_2);
        linebotParser[1] = bot[1].parser();
        bot[1].on('message', bot_on_message);
        bot[1].on('follow', bot_on_follow);
        channelIds[1] = chanInfo.line_2.channelId;
      }
      if( chanInfo.hasOwnProperty("fb") ) {
        let fb = chanInfo.fb;
        if( [fb.pageID, fb.appID, fb.appSecret, fb.validationToken, fb.pageToken].every( (ele) => {
          return ele;
        }) ) {
          fb_bot = MessengerPlatform.create(chanInfo.fb);
        }
        channelIds[2] = chanInfo.fb.pageId;
      }
    } // end of update_line_bot
    function send_to_FB(msg, receiver) {
      if (msg.startsWith('/image')) {
        let link = msg.substr(7);
        fb_bot.sendImageMessage(receiver, link, true);
      }
      else if (msg.startsWith('/video')) {
        let link = msg.substr(7);
        fb_bot.sendVideoMessage(receiver, link, true);
      }
      else if (msg.startsWith('/audio')) {
        let link = msg.substr(7);
        fb_bot.sendAudioMessage(receiver, link, true);
      }
      else {
        fb_bot.sendTextMessage(receiver, msg);
      }
    }
    function send_to_Line(msg, receiver, chanId) {
      let message = {};
      if(msg.includes('/image')){
        let link = msg.substr(7);
        message = {
          type: "image",
          originalContentUrl: link,
          previewImageUrl: link
        };
      }
      else if(msg.includes('/audio')){
        let link = msg.substr(7);
        message = {
          type: "audio",
          originalContentUrl: link,
          duration: 240000
        };
      }
      else if(msg.includes('/video')){
        let link = msg.substr(7);
        message = {
          type: "video",
          originalContentUrl: link,
          previewImageUrl: "https://tinichats.com/assets/images/tab.png"
        };
      }
      else if (msg.includes('/sticker')) {
        message = {
          type: "sticker",
          packageId: parseInt(msg.substr(msg.indexOf(' '))),
          stickerId: parseInt(msg.substr(msg.lastIndexOf(' ')))
        };
      }
      else {
        message = {
          type: "text",
          text: msg
        };
      }
      if(chanId === channelIds[0]){
        bot[0].push(receiver, message);
      }
      else if(chanId === channelIds[1]) {
        bot[1].push(receiver, message);
      }
    }
    function emitIO_and_pushDB_internal(obj, roomId, agentNick) {
      send_to_firebase_internal(obj, roomId);
      send_to_frontSocket_internal(obj, roomId, agentNick);
    }
    function send_to_firebase_internal(obj, roomId) {
      agents.get(function(agentChatData){
        for( let prop in agentChatData ) {
          let data = agentChatData[prop];
          if( data.Profile.roomId == roomId ) {
            let length = data.Messages.length;    //訊息總長度
            let updateObj = {};       //建立update物件
            updateObj['/'+prop+'/Messages/'+length] = obj;  //將最新一則的訊息放至訊息陣列的最後
            agents.update(updateObj);
            let updateProfObj = {
              "recentChat": obj.time
            };
            agents.updateProf(prop, updateProfObj);
            break;
          }
        }
      });
    }
    function send_to_frontSocket_internal(obj, roomId, agentNick) {
      let data = JSON.parse(JSON.stringify(obj));
      data.roomId = roomId;
      data.agentNick = agentNick;
      io.sockets.emit('new internal message', {
        sendObj: data,
        roomId: roomId
      });
    }
    function loadFbProfile(obj, psid) {
      fb_bot.webhook('/webhook');
      fb_bot.getProfile(psid).then(function(data) {
        var count_unread_toFront;
        var fb_user_name = data.first_name + ' ' + data.last_name;
        var fb_user_profilePic = data.profile_pic;
        var fb_user_locale = data.locale;
        var fb_user_gender = data.gender;
        utility.fbMsgType(obj.message, (fbMsg) => {
          obj.message = fbMsg;
        });
        chats.get(function(chatData){
          for (let prop in chatData) {
            if ( utility.isSameUser(chatData[prop].Profile, obj.sender.id, 'fb') ) {
              count_unread_toFront = chatData[prop].Profile.unRead;
              count_unread_toFront++;
            }
          } //for let prop in chatData
        });
        obj.id = obj.sender.id;
        obj.owner = obj.recipient.id;
        obj.name = fb_user_name;
        obj.time = obj.timestamp;
        obj.channelId = 'FB';
        obj.pictureUrl = fb_user_profilePic;
        pushAndEmit(obj, fb_user_profilePic, 'FB', obj.sender.id, 1);
      }).catch(function(error) {
        console.log('error: loadFbProfile');
        console.log(error);
      }); //fb_bot
    } //loadFbProfile
    return io;
}

module.exports = init;
