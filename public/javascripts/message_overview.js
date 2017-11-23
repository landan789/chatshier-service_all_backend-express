// jQuery
$(document).ready(function() {
  var socket = io.connect(); //socket

  $(document).on('click', '#signout-btn', logout); //登出
  // $(document).on('click', '#search-btn', filterChart);
  $(document).on('click', '.tablinks' , clickMsg);  //三個canvas
  $(document).on('click', '#btn-text', btnText);
  $(document).on('click', '.create-message', modalSubmit); //新增待發送訊息或新增草稿
  $(document).on('click', '#viewBtn', loadView);
  $(document).on('click', '#editBtn', openEdit); //打開編輯modal
  $(document).on('click', '#edit-submit', modalEdit);
  $(document).on('click', '#deleBtn', deleteRow); //刪除
  $(document).on('click', '.tablinks_sort' , clickSortingLink);
  $(document).on('mouseover', '#nav-message', subMessage);//Message 導覽標籤 subtags
  $(document).on('click', '#upImg', upImg);
  $(document).on('click', '#upVid', upVid);
  $(document).on('click', '#upAud', upAud);
  $(document).on('click', '.removeInput', removeInput);//移除input
  $(document).on('click', '#clean-screen-tags', cleanScreenTags);

  var MAX_INPUT_COUNT = 3;//計算訊息的數量
  var SENDING_TIME = 3*60*1000; //3 min
  var channelInfo = [];

  if(window.location.pathname === '/message_overview'){
    initialFilter();
    auth.onAuthStateChanged(user=> {
      loadChannelInfo(user.uid);
    })
  }

  //no use function start
  function upImg() {
    var imgAtt = '/image ' + $('#attImgFill').val();
    $('#message').val('<img src="' + imgAtt);
    socket.emit('send message', sendObj);

  } // end of upImg
  function upVid() {
    var vidAtt = $('#attVidFill').val();
    $('#message').val('<video controls><source src="' + vidAtt);
  } // end of upVid
  function upAud() {
    var audAtt = $('#attAudFill').val();
    $('#message').val('<audio controls><source src="' + audAtt);
  } // upAud
  $('.onclick_show').on('click', function(e){
    // console.log('onclick_show exe');
    var target = $(this).attr('rel');
    e.preventDefault();
    if ($("#"+target).is(":visible")){
      $("#"+target).fadeOut();
      $(".uploadArea").css('top',0);
      $(this).attr('active','false');
    }
    else{
      $("#"+target).css('display','flex').siblings().hide();
      $(".uploadArea").css('top',-60);
      $(this).attr('active','true').siblings().attr('active','false');;
    }
  });//onclick_show
  //no use function end

  //UI event start
  function subMessage(){
    // if ($('.sub-tag').is(':visible')){
    //   $('.sub-tag').fadeOut(1000, "swing");
    // }else{
    //   $('.sub-tag').fadeIn(1000, "swing");
    // }
  }
  function clickMsg(){
    var target = $(this).attr('rel');
    $("#"+target).show().siblings().hide();
    $(this).addClass("table_select");
    $(this).siblings().removeClass("table_select");
  }
  //UI event end

  function loadChannelInfo(userId) {
    socket.emit('request channels', userId);
  }
  socket.on('response channel', (data) => {
    console.log(data);
    if( data.name1 && data.chanId_1 ) {
      channelInfo.push({
        name: data.name1,
        id: data.chanId_1
      });
      $('#select-channel').append('<option value="'+data.chanId_1+'">'+data.name1+'</option>');
      $('#edit-channel').append('<option value="'+data.chanId_1+'">'+data.name1+'</option>');
    }
    if( data.name2 && data.chanId_2 ) {
      channelInfo.push({
        name: data.name2,
        id: data.chanId_2
      });
      $('#select-channel').append('<option value="'+data.chanId_2+'">'+data.name2+'</option>');
      $('#edi-channel').append('<option value="'+data.chanId_2+'">'+data.name2+'</option>');
    }
    loadOverReply();
  });

  function loadOverReply(){
    $('#data-appointment').empty();
    $('#data-draft').empty();
    $('#data-history').empty();
    let userId = auth.currentUser.uid;
    database.ref('message-overview/' + userId).on('value', snap => {
      let testVal = snap.val();
      if( !testVal ) return;
      let myIds = Object.keys(testVal);

      for( let i=0;i < myIds.length;i++ ){
        let new_taskTags = [];
        let data = testVal[myIds[i]];

        let channelName = channelIdToName(data.taskChannel);

        let content = "";
        let type = "";
        if( data.taskContent ) {
          for( let i=0; i<data.taskContent.length; i++ ) {
            let tmp = data.taskContent[i];
            if( tmp.type=="text" ) {
              content += tmp.content+"\n";
              type += "文字\n";
            }
            else if( tmp.type=="image" ) {
              content += "傳送圖片\n";
              type += "圖片\n";
            }
            else if( tmp.type=="video" ) {
              content += "傳送影片\n";
              type += "影片\n";
            }
          }
        }
        let tagsFilter = data.taskTags ? data.taskTags : "不指定";
        let vipFilter = data.taskVIP ? data.taskVIP : "不指定";

        let time = ISODateTimeString(new Date( data.taskTime ));
        let $canvas;
        if (data.taskStatus=='草稿'){
          $canvas = $('#data-draft');
        }
        else if (data.taskStatus == '已傳送'){
          $canvas = $('#data-history');
        }
        else {  //保留
          let now = Date.now();
          if( now < data.taskTime ) {   //還沒到發送時間
            $canvas = $('#data-appointment');
          }
          else if( now-data.taskTime < SENDING_TIME ) {   //超過taskTime一小段時間
            $canvas = $('#data-appointment');
            data.taskStatus = "發送中，請稍後重整頁面";
          }
          else {      //超過taskTime很久
            $canvas = $('#data-history');
            data.taskStatus = "發送失敗";
          }
        }
        $canvas.append(
          '<tr class = "msgToSend">' +
          '<td id="' + myIds[i] + '" hidden>' + myIds[i] + '</td>' +
          '<td class="msgDetail td-short" >' + (i+1) + '</td>' +
          '<td class="msgDetail" >' + channelName + '</td>' +
          '<td class="msgDetail" >' + content + '</td>' +
          '<td class="msgDetail td-short" >' + type + '</td>' +
          '<td class="msgDetail" >' + "tags: " + tagsFilter + "\nVIP: " + vipFilter + '</td>' +
          '<td class="msgDetail td-short" >' + data.taskStatus + '</td>'+
          '<td class="msgDetail" >' + time + '</td>' +
          '<td>' +
          '<a href="#" id="editBtn" data-toggle="modal" data-target="#editModal" style="color:black"><b>編輯  </b></a>' +
          '<a href="#" id="viewBtn" data-toggle="modal" data-target="#viewModal" style="color:black"><b>檢視  </b></a>' +
          '<a href="#" id="deleBtn" style="color:black"><b>刪除</b></a>' +
          '</td>' +
          '</tr>'
        );
      }
    });
  }
  function initialFilter() {
    database.ref('tags/Data').on('value', snap=>{
      let testVal = snap.val();
      for (let i in testVal){
        if (testVal[i].name == '標籤'){
          testVal[i].set.map(function(x){
            $('#screen-tags').append('<option value="'+x+'">'+x+'</option>');
            $('#edit-tags').append('<option value="'+x+'">'+x+'</option>');
          });
        }
        else if (testVal[i].name == 'VIP等級'){
          testVal[i].set.map(function(x){
            $('#vip-level').append('<option value="'+x+'">'+x+'</option>');
            $('#edit-vip').append('<option value="'+x+'">'+x+'</option>');
          });
        }
      }
    });
  }

  function btnText(){
    if ( $('.input-area').length >= MAX_INPUT_COUNT ){
      $('.error_msg').show().delay(2000).fadeOut();
      console.log('超過三則訊息');
    }
    else {
      $('#inputText').append(
        '<div style="margin:2%">'+
        '<span style="float:right" class="removeInput">X</span>'+
        '<tr>'+
        '<th style="padding:1.5%; background-color: #ddd">輸入文字:</th>'+
        '</tr>'+
        '<tr>'+
        '<td style="background-color: #ddd">'+
        '<form style="padding:1%">'+
        '<input class="input-area" rel="text" style="width:100%;height:100px" />'+
        '</form>'+
        '</td>'+
        '</tr>'+
        '</div>'
      );
    }
  }
  function removeInput(){
    $(this).parent().remove();
  }
  function cleanScreenTags() {
    $('#screen-tags').val('');
  }
  function modalSubmit() {
    // let d = Date.now();
    let channelId = $("#select-channel").val();
    let taskContent = [];
    let $inputs = $('.input-area');
    for( let i=0; i<$inputs.length; i++ ) {
      let $input = $inputs.eq(i);
      let type = $input.attr('rel');
      let content = $input.val();
      if( type && content ) { //若兩個都有，才代表此筆content有效
        taskContent.push({
          type: type,
          content: content
        });
      }
    }

    let statusId = $(this).attr('id');
    let status = statusId=="submit" ? "保存" : "草稿";

    let send_time;
    if( $('#send-now').prop('checked')) send_time = Date.now();
    else send_time = new Date($('#sendTime').val()).getTime();

    let screenTags = "";
    let vipLevel = "";
    if( $('#limituser').is(':visible') ) {
      let tagsFilter = $('#screen-tags').val();
      if( tagsFilter && tagsFilter.indexOf("none")==-1 ) screenTags = tagsFilter.join(',');

      let vipFilter = $('#vip-level').val();
      if( vipFilter && vipFilter!="none" ) vipLevel = vipFilter;
    }
    else {
      screenTags = vipLevel = "";
    }

    writeUserData(auth.currentUser.uid, channelId, taskContent, screenTags, vipLevel, status, send_time);

    // 塞入資料庫並重整
    $('#quickAdd').modal('hide');
    alert('變更已儲存!');
    loadOverReply();
  }

  function writeUserData(userId, channelId, taskContent, screenTags, vipLevel, status, send_time) {
    database.ref('message-overview/' + userId).push({
      taskChannel: channelId,
      taskContent: taskContent,
      taskTags: screenTags,
      taskVIP: vipLevel,
      taskTime: send_time,
      taskStatus: status,
    });
  }

  function loadView() {

    $('.taskContent').remove();//任務內容canvas

    let key = $(this).parent().parent().find('td:first').text();
    let userId = auth.currentUser.uid;

    database.ref('message-overview/' + userId + '/' + (key)).on('value', snap => {
      let testVal = snap.val();
      $('#view-channel').val(testVal.taskChannel);
      $('#view-tags').val(testVal.taskTags ? testVal.taskTags : "不指定");//標籤
      $('#view-vip').val(testVal.taskVIP ? testVal.taskVIP : "不指定");//標籤
      $('#view-stat').val(testVal.taskStatus); //狀態
      $('#view-time').val(ISODateTimeString(new Date(testVal.taskTime)));
      // $('#view-owne').val(testVal.owner); //負責人
      // $('#view-desc').val(testVal.description); //說明
      // $('#view-inir').val(testVal.initiator); //建立人
      // $('#view-inid').val(testVal.initDate); //建立日期
      // $('#view-modr').val(testVal.modifier); //修改人
      // $('#view-modd').val(testVal.modiDate); //修改日期
      for( let i=0; i<testVal.taskContent.length; i++ ) {
        let data = testVal.taskContent[i];
        let content;
        if( data.type=="text" ) content = data.content;
        else if( data.type=="image" ) content = '<img scr ="'+data.content+'" alt="傳送圖片">';
        else if( data.type=="video" ) content = '<a href="'+data.content+'">傳送影片</a>';
        $('#view-content').append(
          '<input disabled="disabled" style="margin:1% 0;" class="form-control taskContent" id="view-textinput" value="'+content+'">'
        );//任務內容1
      }
    });
  }

  function openEdit() {
    $('#edit-owner').val(''); //負責人
    $('.taskContent').remove();//任務內容canvas

    let key = $(this).parent().parent().find('td:first').text();
    let userId = auth.currentUser.uid;

    database.ref('message-overview/' + userId + '/' + key).on('value', snap => {
      let testVal = snap.val();
      // console.log(testVal);
      $('#edit-id').text(key);
      $('#edit-channel').val(testVal.taskChannel);
      $('#edit-tags').val(testVal.taskTags.split(','));//標籤
      $('#edit-vip').val(testVal.taskVIP);//標籤
      $('#edit-status').val(testVal.taskStatus); //狀態
      $('#edit-time').val(ISODateTimeString(new Date(testVal.taskTime)));
      // $('#edit-owner').val(testVal.owner); //負責人
      for( let i=0; i<testVal.taskContent.length; i++ ) {
        let data = testVal.taskContent[i];
        let type = data.type;
        let content;
        if( type=="text" ) content = data.content;
        else if( type=="image" ) content = '<img scr ="'+data.content+'" alt="傳送圖片">';
        else if( type=="video" ) content = '<a href="'+data.content+'">傳送影片</a>';
        $('#edit-content').append(
          '<input style="margin:1% 0;" class="form-control taskContent" id="view-textinput" value="'+content+'" rel="'+type+'">'
        );//任務內容1
      }
      // console.log(sublist);
    });
  }

  function modalEdit() {
    let key = $('#edit-id').text();
    let userId = auth.currentUser.uid;
    let channelId = $('#edit-channel').val();
    let tags = $('#edit-tags').val();//標籤
    let vip = $('#edit-vip').val();//標籤
    let stat = $('#edit-status').val(); //狀態
    let time;
    if ($('#edit-sendNow').prop('checked')) time = Date.now();
    else time = new Date($('#edit-time').val()).getTime();//時間

    let taskContent = [];
    let $inputs = $('#edit-content .taskContent'); //任務內容
    for( let i=0; i<$inputs.length; i++ ) {
      let $input = $inputs.eq(i);
      let type = $input.attr('rel');
      let content = $input.val();
      console.log(type);
      console.log(content);
      if( type && content ) { //若兩個都有，才代表此筆content有效
        taskContent.push({
          type: type,
          content: content
        });
      }
    }
    saveUserData(key, userId, channelId, taskContent, tags, vip, stat, time, taskContent);

    loadOverReply();
    $('#editModal').modal('hide');
  }

  function saveUserData(key, userId, channelId, taskContent, tags, vip, stat, time) {
    database.ref('message-overview/' + userId + '/' + key).update({
      taskChannel: channelId,
      taskContent: taskContent,
      taskTags: tags,
      taskVIP: vip,
      taskStatus: stat,
      taskTime: time
    });
  }

  function deleteRow() {
    let key = $(this).parent().parent().find('td:first').text();
    let userId = auth.currentUser.uid;
    // console.log(userId, key);

    database.ref('message-overview/' + userId + '/' + key).remove();

    loadOverReply();
  }

  //=========[SEARCH by TEXT]=========
  $("#exampleInputAmount").keyup(function() {
    var dataAppoinment = $('#data-appointment tr');
    var dataDraft = $('#data-draft tr');
    var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();

    dataAppoinment.show().filter(function() {
      var text1 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
      return !~text1.indexOf(val);
    }).hide();

    dataDraft.show().filter(function() {
      var text2 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
      return !~text2.indexOf(val);
    }).hide();
  });

  // SORTING ADDED BY COLMAN


  var sortWays = ["No.", "內容", "分類", "標籤(optional)", "狀態", "預約"];
  var sortBool = [true, true, true, true, true, true ];

  function clickSortingLink() {
    let wayId = sortWays.indexOf( $(this).text() ); //get which way to sort (line 322)
    let wayBool = sortBool[wayId];
    for( let i in sortBool ) sortBool[i] = true;  //reset other sort ways up_down
    sortBool[wayId] = !wayBool;   //if this time sort up, next time sort down

    let panel_to_push;    //check which tabcontent to sort
    if( $('#Appointment').css("display") ==  "block" ) panel_to_push = '#data-appointment';
    else if( $('#Draft').css("display") ==  "block" ) panel_to_push = '#data-draft';
    else if( $('#History').css("display") ==  "block" ) panel_to_push = '#open-ticket-list';

    let msgsArr = $( panel_to_push + ' .msgToSend' ); //get all msg in tabcontent
    for( let i=0; i<msgsArr.length-1; i++ ) {   //bubble sort
      for( let j=i+1; j<msgsArr.length; j++ ) {
        let a = msgsArr.eq(i).children(".msgDetail").eq(wayId).text();
        let b = msgsArr.eq(j).children(".msgDetail").eq(wayId).text();
        // console.log("a, b = " + a + ", " + b);
        if( wayBool == (a<b)  ) {             //sort up or down && need sort?
          // console.log("swap!");
          let tmp = msgsArr[i];   msgsArr[i] = msgsArr[j];    msgsArr[j] = tmp;
        }
      }
    }
    $(panel_to_push).append(msgsArr); //push to tabcontent

  }

  function channelIdToName(id) {
    for( let i=0; i<channelInfo.length; i++ ) {
      if( channelInfo[i].id == id ) return channelInfo[i].name;
    }
    return "";
  }

  function ISODateString(d) {
    function pad(n) {return n<10 ? '0'+n : n}
    return d.getFullYear()+'-'
    + pad(d.getMonth()+1)+'-'
    + pad(d.getDate())+'T'
    + '00:00'
  }

  function ISODateTimeString(d) {
    function pad(n) {return n<10 ? '0'+n : n}
    return d.getFullYear()+'-'
    + pad(d.getMonth()+1)+'-'
    + pad(d.getDate())+'T'
    + pad(d.getHours())+':'
    + pad(d.getMinutes())
  }


  function logout(){
    auth.signOut()
    .then(response => {
      window.location.assign("/login");
    })
  }

});//document ready
