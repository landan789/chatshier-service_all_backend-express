var app = require('../app');
var moment = require('moment');
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
var linetemplate = require('../models/linetemplate');
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

      /*===分析start===*/
      socket.on('request message time', () => {
        chats.get( (data) => {
          let msgTimeData = [];
          for(let prop in data) {
            let msg = data[prop].Messages;
            for( let i=0 ;i<msg.length; i++ ) {
              msgTimeData.push({
                "time": msg[i].time,
                "message": msg[i].message
              });
            }
          }
          socket.emit('response message time', msgTimeData);
        });
      });
      /*===分析end===*/

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
          if( autoReply(msgObj.message)!==-1 ) {
            console.log("autoreply bot replyed!");
          }
          if( lineTemplateReply(msgObj.message)!==-1 ) {
            console.log("linebotdemo bot replyed!");
          }
          if( surveyReply(msgObj.message)!==-1 ) {
            console.log("surveyReply bot replyed!");
          }
          if( appointmentReply(msgObj.message)!==-1 ) {
            console.log("appointment bot replyed!");
          }
          // else {
          //   console.log("no auto reply bot work! wait for agent reply");
          // }
        });
        function keywordsReply(msg) {
            replyMsgObj.name = "KeyWords Reply";
            let sent = false;
            keywords.get(function(keywordData){
                for (let i in keywordData) {
                    for( let j in keywordData[i] ) {
                        let thisData = keywordData[i][j];
                        if(thisData.taskCate=="開放") {
                            let keywords = thisData.taskSubK ? JSON.parse(JSON.stringify(thisData.taskSubK)) : [];
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
                console.log(sent);
                if(!sent) return -1;
            });
        }
        function lineTemplateReply( msg ) {
          replyMsgObj.name = "Line Template Demo Reply";
          linetemplate.get( function( templateData ) {
            let data = templateData[msg];
            if( data ) {
              replyMsgObj.message = data.altText;
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 1);
              templateToStr = JSON.stringify(data);
              send_to_Line("/template "+templateToStr, receiverId, channelId);
            }
            else return -1;
          });
        }
        function surveyReply(msg){
          console.log("survey execute");
          replyMsgObj.name = "Survey Reply";

          let voter = receiverId;
          let groupName = "台北TPE"

          function ask_vote(n, categoryName, workerName, groupName) {
            pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
            event.reply({
              "type": "template",
              "altText": "問卷調查",
              "template": {
                "type": 'carousel',
                "columns": [{
                  "title": groupName,
                  "text": categoryName + ':' + workerName,
                  "actions": [{
                    "type": "message",
                    "label": '非常滿意',
                    "text": "S"+n+"-5"
                  }, {
                    "type": "message",
                    "label": '滿意',
                    "text": "S"+n+"-4"
                  }, {
                    "type": "message",
                    "label": '普通',
                    "text": "S"+n+"-3"
                  }]
                }, {
                  "title": groupName,
                  "text": categoryName + ':' + workerName,
                  "actions": [{
                    "type": "message",
                    "label": '不滿意',
                    "text": "S"+n+"-2"
                  }, {
                    "type": "message",
                    "label": '非常不滿意',
                    "text": "S"+n+"-1"
                  }, {
                    "type": "message",
                    "label": '-',
                    "text": "-"
                  }]
                }]
              }
            });
          }

          if(msg.trim() === '滿意度'){
            categoryName = '秘書';
            workerName = '楊靜嫻';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(1, categoryName, workerName, '台北TPE');
          }
          else if(msg.indexOf('S1-')==0){
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "秘書", "楊靜嫻", groupName, score);

            categoryName = '司機';
            workerName = '百俊';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(2, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S2-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "司機", "百俊", groupName, score);

            categoryName = '攝影師';
            workerName = '劉育昇';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(3, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S3-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "攝影師", "劉育昇", groupName, score);

            categoryName = '客服';
            workerName = '客服人員';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(4, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S4-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "客服", "客服人員", groupName, score);

            categoryName = '導遊';
            workerName = '魏清水';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(5, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S5-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "導遊", "魏清水", groupName, score);

            categoryName = '導遊';
            workerName = '陳仕賢';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(6, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S6-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "導遊", "陳仕賢", groupName, score);

            categoryName = '餐廳';
            workerName = '魔菇部落';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(7, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S7-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "餐廳", "魔菇部落", groupName, score);

            categoryName = '餐廳';
            workerName = '黑公雞風味餐廳';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(8, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S8-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "餐廳", "黑公雞風味餐廳", groupName, score);

            categoryName = '餐廳';
            workerName = '宏銘的廚房';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(9, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S9-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "餐廳", "宏銘的廚房", groupName, score);

            categoryName = '餐廳';
            workerName = '喆娟夢田';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(10, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S10-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "餐廳", "喆娟夢田", groupName, score);

            categoryName = '伴手禮';
            workerName = '卦山燒';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(11, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S11-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "伴手禮", "卦山燒", groupName, score);

            categoryName = '飯店';
            workerName = '彰化福泰飯店';
            replyMsgObj.message = categoryName + ": " + workerName;
            ask_vote(12, categoryName, workerName, '台北TPE');
          }
          else if (msg.indexOf('S12-')==0) {
            let score = parseInt( msg.substr(3) );
            vote_to_mysql(voter, nowTime, "飯店", "彰化福泰飯店", groupName, score);

            replyMsgObj.message = '感謝您的回饋！';
            pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
            event.reply({
              type: 'text',
              text: '感謝您的回饋！'
            });
          }
          else if (msg.trim() === '行程相關問題') {
            ask_info(0);
          }
          else if( msg.indexOf('P1-')==0 ) {
            ask_info(1);
          }
          else if( msg.indexOf('P2-')==0 ) {
            ask_info(2);
          }
          else if( msg.indexOf('P3-')==0 ) {
            ask_info(3);
          }
          else if( msg.indexOf('P4-')==0 ) {
            ask_info(4);
          }
          else {
            return -1;
          }
          function ask_info(n) {
            let title = [
              "您如何得知此次旅遊行程", "您第幾次參加本公司行程",
              "您再次參加本公司行程原因","您此次旅遊行程幾人同行"
            ];
            let option = [
              ["網站", "FB", "親友介紹", "從雙月刊", "員旅", "其他"],
              ["第一次", "第二次", "第三次", "第四次", "五次以上", "-"],
              ["服務品質好", '行程地點優', '其他', "-", "-", "-"],
              ["1人", "2人", "3人", "4人", "5人以上", "-"]
            ];
            if( n==0 ) {
              //第一次問問題
              replyMsgObj.message = '行程相關列表已發送';
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
            }
            else {
              //非第一次問問題，須把上次答案push進資料庫
              let updateInfo = {};
              _title = title[n-1];
              _answer = msg;
              updateInfo[ _title ] = _answer;
              // for (let i in chatData) {
              //   if ( isSameUser(chatData[i].Profile, receiverId, channelId) ) {
              //     newDBRef.child(i).child("Profile").update(updateInfo);
              //     break;
              //   }
              // }
              replyMsgObj.message = '客戶點選' + msg;
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
            }
            if( n<4 ) {
              //非最後一次問問題，需問下一道問題
              replyMsgObj.message = title[n];
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);

              let actions_1 = [], actions_2 = [];
              for( let i=0; i<3; i++ ) {
                actions_1.push({
                  "type": "message",
                  "label": option[n][i],
                  "text": "P"+(n+1)+"-"+option[n][i]
                });
              }
              for( let i=3; i<6; i++ ) {
                actions_2.push({
                  "type": "message",
                  "label": option[n][i],
                  "text": "P"+(n+1)+"-"+option[n][i]
                });
              }
              event.reply({
                "type": "template",
                "altText": "問卷調查",
                "template": {
                  type: 'carousel',
                  "columns": [
                    {
                      "title": title[n],
                      "text": '--------------------------------------------------',
                      "actions": actions_1
                    },
                    {
                      "title": title[n],
                      "text": '--------------------------------------------------',
                      "actions": actions_2
                    }
                  ]
                }
              });
            }
            else if( n==4 ) {
              replyMsgObj.message = '感謝您的回饋！';
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
              event.reply({
                type: 'text',
                text: '感謝您的回饋！'
              });
            }
          }
        } // end of survey
        function vote_to_mysql(voter, time, categoryName, workerName, groupName, score) {
          // TODO:
        }
        function appointmentReply(msg) {
          if (msg.trim() === '預約功能') {
            replyMsgObj.message = '已接收顯示預約日期';
            pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);

            let columns = [];
            for( let i=0; i<3; i++ ) {
              let _col = {
                "title": '預約日期',
                "text": moment().add(i*3+1,'days').format('MM[/]DD[ ]dddd')+"~"+moment().add(i*3+3,'days').format('MM[/]DD[ ]dddd'),
                "actions": []
              };
              for( let j=1; j<=3; j++ ) {
                _col.actions.push({
                  "type": "message",
                  "label": moment().add(i*3+j,'days').format('YYYY[/]MM[/]DD[ ]dddd'),
                  "text": "預約DEMO-步驟二 "+moment().add(i*3+j,'days').format('YYYY[/]MM[/]DD'),
                });
              }
              columns.push(_col);
            }

            event.reply({
              "type": "template",
              "altText": "預約DEMO",
              "template": {
                type: 'carousel',
                "columns": columns
              }
            });
          }
          else if( msg.startsWith('預約DEMO-步驟二' ) ) {
            date = moment(msg.substr(11), "YYYY[/]MM[/]DD");
            let diff = date.diff(moment(), 'days')+1; //+1 means include today
            if( diff>9 ) {
              replyMsgObj.message = '只能選擇10天以內的日期';
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
              event.reply({
                type: 'text',
                text: replyMsgObj.message
              });
            }
            else {
              let weekday = date.format('d');
              if( weekday == 6 || weekday == 0 ) {
                replyMsgObj.message = '假日不得預約，請重新選擇';
                pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
                event.reply({
                  type: 'text',
                  text: replyMsgObj.message
                });
              }
              else {
                replyMsgObj.message = '已接收顯示' + date.format('YYYY[/]MM[/]DD[ ]dddd');
                pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
                event.reply({
                  "type": "template",
                  "altText": "預約DEMO",
                  "template": {
                    "type": 'carousel',
                    "columns": [
                      {
                        "title": "面試日期: " + date.format('YYYY[/]MM[/]DD dddd'),
                        "text": "上午時段\n注意:預約日期，假日一概不受理。",
                        "actions": [
                          {
                            "type": "message",
                            "label": '10:00-11:00',
                            "text": "預約DEMO-步驟三 "+date.format('YYYY[/]MM[/]DD dddd')+" 10:00-11:00"
                          },
                          {
                            "type": "message",
                            "label": '11:00-12:00',
                            "text": "預約DEMO-步驟三 "+date.format('YYYY[/]MM[/]DD dddd')+" 11:00-12:00"
                          }
                        ]
                      },
                      {
                        "title": "面試日期: " + date.format('YYYY[/]MM[/]DD dddd'),
                        "text": "下午時段\n注意:預約日期，假日一概不受理。",
                        "actions": [
                          {
                            "type": "message",
                            "label": '15:00-16:00',
                            "text": "預約DEMO-步驟三 "+date.format('YYYY[/]MM[/]DD dddd')+" 15:00-16:00"
                          },
                          {
                            "type": "message",
                            "label": '16:00-17:00',
                            "text": "預約DEMO-步驟三 "+date.format('YYYY[/]MM[/]DD dddd')+" 16:00-17:00"
                          }
                        ]
                      }
                    ]
                  }
                });
              }
            }
          }
          else if( msg.startsWith('預約DEMO-步驟三' ) ) {
            let reserv = msg.substr(11);
            function check_reservation(msg) {
              if( nowTime%2 ) return true;
              else return false;
            }
            if( !check_reservation(msg) ) {
              replyMsgObj.message = '此時段已預約滿';
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
              event.reply({
                type: 'text',
                text: replyMsgObj.message
              });
            }
            else {
              replyMsgObj.message = '預約成功';
              pushAndEmit(replyMsgObj, null, channelId, receiverId, 0);
              event.reply({
                type: 'text',
                text: replyMsgObj.message
              });
            }
          }
          else return -1;
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
      if(msg.startsWith('/image')){
        let link = msg.substr(7);
        message = {
          type: "image",
          originalContentUrl: link,
          previewImageUrl: link
        };
      }
      else if(msg.startsWith('/audio')){
        let link = msg.substr(7);
        message = {
          type: "audio",
          originalContentUrl: link,
          duration: 240000
        };
      }
      else if(msg.startsWith('/video')){
        let link = msg.substr(7);
        message = {
          type: "video",
          originalContentUrl: link,
          previewImageUrl: "https://tinichats.com/assets/images/tab.png"
        };
      }
      else if (msg.startsWith('/sticker')) {
        message = {
          type: "sticker",
          packageId: parseInt(msg.substr(msg.indexOf(' '))),
          stickerId: parseInt(msg.substr(msg.lastIndexOf(' ')))
        };
      }
      else if( msg.startsWith('/template') ) {
        let obj = msg.substr( msg.indexOf(' ')+1 );
        message = JSON.parse(obj);
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
