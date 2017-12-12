var ticketInfo = {};
var contactInfo = {};
var agentInfo = {};
var socket = io.connect();
var yourdomain = 'fongyu';
var api_key = 'UMHU5oqRvapqkIWuOdT8';
var ticket_content = $('.ticket-content');
$(document).ready(function() {
  if(window.location.pathname === '/ticket') {
    setTimeout(loadTable, 1000)
  }
  $(document).on('click', '#form-submit', submitAdd) //新增ticket
  $(document).on('click', '#form-goback', function() {
    location.href = '/ticket'
  }) //返回ticket
  $(document).on('click', '.ticket-content', moreInfo);
  $(document).on('click', "#ticketInfo-submit", updateStatus);
  $(document).on('click', '.edit', showInput);
  $(document).on('click', '.inner', function(event) {
    event.stopPropagation();
  });
  $(document).on('focusout', '.inner', hideInput);
  $(document).on('keypress', '.inner', function(e) {
    if(e.which == 13) $(this).blur();
  });
  $("#exampleInputAmount").keyup(searchBar);
  $('#ticketInfo-delete').click(function() {
    if(confirm("確認刪除表單？")) {
      var ticket_id = $(this).parent().siblings().children().find('#ID-num').text();
      $.ajax({
        url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets/" + ticket_id,
        type: 'DELETE',
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
          "Authorization": "Basic " + btoa(api_key + ":x")
        },
        success: function(data, textStatus, jqXHR) {
          alert("表單已刪除");
          setTimeout(() => {
            location.reload();
          }, 500)
        },
        error: function(jqXHR, tranStatus) {
          alert("表單刪除失敗，請重試");
          console.log(jqXHR)
        }
      });
    }
  })
});

function loadTable() {
  $.ajax({
    url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets?include=requester",
    type: 'GET',
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    headers: {
      "Authorization": "Basic " + btoa(api_key + ":x")
    },
    success: function(data, textStatus, jqXHR) {
      for(let i = 0; i < data.length; i++) {
        ticketInfo = data;
        ticket_content.append('<tr id="' + i + '" class="ticket-content" data-toggle="modal" data-target="#ticketInfoModal">' + '<td style="border-left: 5px solid ' + priorityColor(data[i].priority) + '">' + data[i].id + '</td>' + '<td>' + data[i].requester.name + '</td>' + '<td>' + data[i].description.substring(0, 10) + '</td>' + '<td class="status">' + statusNumberToText(data[i].status) + '</td>' + '<td class="priority">' + priorityNumberToText(data[i].priority) + '</td>' + '<td>' + displayDate(data[i].due_by) + '</td>' + '<td>' + dueDate(data[i].due_by) + '</td>' + '</tr>')
      }
    },
    error: function(jqXHR, tranStatus) {
      console.log('error');
    }
  });
}

function showInput() {
  let prop = $(this).parent().children("th").text();
  let original = $(this).text();
  if(prop.indexOf('due date') != -1) {
    let day = new Date(original);
    day = Date.parse(day) + 8 * 60 * 60 * 1000;
    day = new Date(day);
    // console.log(day);
    $(this).html("<input type='datetime-local' class='inner' value='" + day.toJSON().substring(0, 23) + "'></input>");
  } else if(prop == 'description') {
    $(this).html("<textarea  class='inner' rows=4' cols='50'>" + original + "</textarea>");
  } else {
    $(this).html("<input type='text' class='inner' value='" + original + "' autofocus>");
  }
}

function hideInput() {
  let change = $(this).val();
  if($(this).attr('type') == 'datetime-local') {
    $(this).parent().html(displayDate(change));
  }
  $(this).parent().html(change);
}

function updateStatus() {
  let select = $(".select"),
    editable = $(".edit"),
    input = $("input");
  let name, value, json = '{';
  let obj = {};
  let id = $(this).attr("val");
  let clientName, clientId, clientOwner, clientPriority, clientStatus, clientDescription, clientDue;
  input.each(function() {
    $(this).blur();
  });
  for(let i = 0; i < editable.length; i++) {
    name = editable.eq(i).parent().children("th").text().split(" ");
    value = editable.eq(i).text();
    json += '"' + name[0] + '":"' + value + '",';
  }
  for(let i = 0; i < select.length; i++) {
    name = select.eq(i).parent().parent().children("th").text();
    value = select.eq(i).val();
    json += '"' + name + '":' + value + ','
  }
  json += '"id":"' + id + '"}';
  obj = JSON.parse(json);
  clientName = obj.subject;
  clientId = obj.clientId;
  clientOwner = obj.clientOwner;
  clientPriority = parseInt(obj.clientPriority);
  clientStatus = parseInt(obj.clientStatus);
  clientDescription = obj.clientDescription;
  console.log(obj.到期時間過期);
  if(obj.到期時間過期 !== undefined) clientDue = obj.到期時間過期;
  else clientDue = obj.到期時間即期;
  var time_list = clientDue.split("/");
  var new_time = [];
  var new_time2 = [];
  time_list.map(function(i) {
    if(i.length == 1 || i.length > 5 && !i.startsWith(0)) i = '0' + i;
    new_time.push(i);
  });
  new_time = new_time.join("-").split(" ");
  if(new_time[1].length < 8) {
    new_time[1].split(":").map(function(x) {
      if(x.length == 1) new_time[1] = new_time[1].replace(x, '0' + x);
    });
  };
  new_time = new_time.join("T") + "Z";
  obj = '{"name": "' + clientName + '", "subject": "' + clientId + '", "status": ' + clientStatus + ', "priority": ' + clientPriority + ', "description": "' + clientDescription + '", "due_by": "' + new_time + '"}';
  console.log(obj);
  if(confirm("確定變更表單？")) {
    var ticket_id = $(this).parent().siblings().children().find('#ID-num').text();
    $.ajax({
      url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets/" + ticket_id,
      type: 'PUT',
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      headers: {
        "Authorization": "Basic " + btoa(api_key + ":x")
      },
      data: obj,
      success: function(data, textStatus, jqXHR) {
        alert("表單已更新");
        setTimeout(() => {
          location.reload();
        }, 500)
      },
      error: function(jqXHR, tranStatus) {
        alert("表單更新失敗，請重試");
        console.log(jqXHR.responseText)
      }
    });
  }
}

function showSelect(prop, n) {
  // let prop = $(this).parent().children("th").text() ;
  // alert(prop) ;
  let html = "<select class='select form-control'>";
  if(prop == 'priority') {
    html += "<option value=" + n + ">" + priorityNumberToText(n) + "</option>";
    for(let i = 1; i < 5; i++) {
      if(i == n) continue;
      html += "<option value=" + i + ">" + priorityNumberToText(i) + "</option>";
    }
  } else if(prop == 'status') {
    html += "<option value=" + n + ">" + statusNumberToText(n) + "</option>";
    for(let i = 2; i < 6; i++) {
      if(i == n) continue;
      html += "<option value=" + i + ">" + statusNumberToText(i) + "</option>";
    }
  } else if(prop == 'responder') {
    html += "<option value=" + n + ">" + responderName(n) + "</option>";
    for(let i in agentInfo) {
      let id = agentInfo[i].id;
      if(id == n) continue;
      html += "<option value=" + id + ">" + responderName(id) + "</option>";
    }
  }
  html += "</select>";
  return html;
  // $(this).html(html);
}

function moreInfo() {
  let display;
  let i = $(this).attr('id');
  let Tinfo = ticketInfo[i];
  let Cinfo;
  let Ainfo;
  $("#ID-num").text(Tinfo.id);
  $("#ID-num").css("background-color", priorityColor(Tinfo.priority));
  display = '<tr>' + '<th>clientId</th>' + '<td class="edit">' + Tinfo.subject + '</td>' + '</tr><tr>' + '<th>clientOwner</th>' + '<td>' + showSelect('responder', Tinfo.responder_id) + '</td>' + '</tr><tr>' + '<th>clientPriority</th>' + '<td>' + showSelect('priority', Tinfo.priority) + '</td>' + '</tr><tr>' + '<th>clientStatus</th>' + '<td>' + showSelect('status', Tinfo.status) + '</td>' + '</tr><tr>' + '<th>clientDescription</th>' + '<td class="edit">' + Tinfo.description + '</td>' + '</tr><tr>' + '<th>clientDue' + dueDate(Tinfo.due_by) + '</th>' + '<td class="edit">' + displayDate(Tinfo.due_by) + '</td>' + '</tr><tr>' + '<th>建立時間</th>' + '<td>' + displayDate(Tinfo.created_at) + '</td>' + '</tr><tr>' + '<th>最後更新</th>' + '<td>' + displayDate(Tinfo.updated_at) + '</td>' + '</tr>';
  for(let j in contactInfo) {
    if(contactInfo[j].id == Tinfo.requester_id) {
      Cinfo = contactInfo[j];
      display += '<tr>' + '<th>requester</th>' + '<td>' + Cinfo.name + '</td>' + '</tr><tr>' + '<th>requester email</th>' + '<td>' + Cinfo.email + '</td>' + '</tr><tr>' + '<th>requester phone</th>' + '<td>' + Cinfo.phone + '</td>' + '</tr>'
      break;
    }
  }
  for(let j in agentInfo) {
    if(agentInfo[j].id == Tinfo.requester_id) {
      Ainfo = agentInfo[j];
      display += '<tr>' + '<th>requester(<span style="color:red">agent</span>)</th>' + '<td>' + Ainfo.contact.name + '</td>' + '</tr><tr>' + '<th>requester email</th>' + '<td>' + Ainfo.contact.email + '</td>' + '</tr><tr>' + '<th>requester phone</th>' + '<td>' + Ainfo.contact.phone + '</td>' + '</tr>'
      break;
    }
  }
  $(".info-input-table").html('');
  $(".modal-header").css("border-bottom", "3px solid " + priorityColor(Tinfo.priority));
  $(".modal-title").text(Tinfo.requester.name);
  $("#ticketInfo-submit").attr("val", Tinfo.id);
  $(".info-input-table").append(display);
}

function displayDate(date) {
  let origin = new Date(date);
  origin = origin.getTime();
  let gmt8 = new Date(origin);
  let yy = gmt8.getFullYear(),
    mm = gmt8.getMonth() + 1,
    dd = gmt8.getDate(),
    hr = gmt8.getHours(),
    min = gmt8.getMinutes(),
    sec = gmt8.getSeconds();
  return yy + "/" + mm + "/" + dd + " " + hr + ":" + min + ":" + sec;
}

function dueDate(day) {
  let html = '';
  let nowTime = new Date().getTime();
  let dueday = Date.parse(displayDate(day));
  let hr = dueday - nowTime;
  hr /= 1000 * 60 * 60;
  // hr = Math.round(hr) ;
  // return hr ;
  if(hr < 0) {
    html = '<span class="overdue">過期</span>';
  } else {
    html = '<span class="non overdue">即期</span>';
  }
  return html;
} // end of dueDate
function responderName(id) {
  for(let i in agentInfo) {
    if(agentInfo[i].id == id) return agentInfo[i].contact.name;
  }
  return "unassigned";
}

function addZero(n) {
  n = Number()
}

function submitAdd() {
  let name = $('#form-name').val();
  let uid = $('#form-uid').val(); //因為沒有相關可用的string，暫時先儲存在to_emails這個功能下面
  let email = $('#form-email').val();
  let phone = $('#form-phone').val();
  let status = $('#form-status option:selected').text();
  let priority = $('#form-priority option:selected').text();
  let description = $('#form-description').val();
  ticket_data = '{ "description": "' + description + '", "name" : "' + name + '",  "subject": "' + uid + '", "email": "' + email + '", "phone": "' + phone + '", "priority": ' + priorityTextToMark(priority) + ', "status": ' + statusTextToMark(status) + '}';
  console.log(ticket_data);
  // 驗證
  let email_reg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+[^<>()\.,;:\s@\"]{2,})$/;
  let phone_reg = /\b[0-9]+\b/;
  if(!email_reg.test(email)) {
    $('#error').append('請輸入正確的email格式');
    $('#form-email').css('border', '1px solid red');
    setTimeout(() => {
      $('#error').empty();
      $('#form-email').css('border', '1px solid #ccc');
    }, 3000);
  } else if(!phone_reg.test(phone)) {
    $('#error').append('請輸入正確的電話格式');
    $('#form-phone').css('border', '1px solid red');
    setTimeout(() => {
      $('#error').empty();
      $('#form-phone').css('border', '1px solid #ccc');
    }, 3000);
  } else if($('#form-uid').val().trim() === '') {
    $('#error').append('請輸入clientId');
    $('#form-subject').css('border', '1px solid red');
    setTimeout(() => {
      $('#error').empty();
      $('#form-subject').css('border', '1px solid #ccc');
    }, 3000);
  } else if($('#form-description').val().trim() === '') {
    $('#error').append('請輸入內容');
    $('#form-description').css('border', '1px solid red');
    setTimeout(() => {
      $('#error').empty();
      $('#form-description').css('border', '1px solid #ccc');
    }, 3000);
  } else if($('#form-name').val().trim() === '') {
    $('#error').append('請輸入客戶姓名');
    $('#form-name').css('border', '1px solid red');
    setTimeout(() => {
      $('#error').empty();
      $('#form-description').css('border', '1px solid #ccc');
    }, 3000);
  } else {
    let nowTime = new Date().getTime();
    let dueDate = nowTime + 86400000 * 3;
    let start = ISODateTimeString(nowTime);
    let end = ISODateTimeString(dueDate)
    let userId = auth.currentUser.uid;
    $.ajax({
      url: "https://" + yourdomain + ".freshdesk.com/api/v2/tickets",
      type: 'POST',
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      headers: {
        "Authorization": "Basic " + btoa(api_key + ":x")
      },
      data: ticket_data,
      success: function(data, textStatus, jqXHR) {
        console.log('tickt created');
        //把事件儲存到calendar database，到期時間和ticket一樣設定三天
        database.ref('cal-events/' + userId).push({
          title: name + ": " + description.substring(0, 10) + "...",
          start: start,
          end: end,
          description: description,
          allDay: false
        });
      },
      error: function(jqXHR, tranStatus) {
        x_request_id = jqXHR.getResponseHeader('X-Request-Id');
        response_text = jqXHR.responseText;
        console.log(response_text)
      }
    });
    $('#form-name').val('');
    $('#form-uid').val('');
    $('#form-subject').val('');
    $('#form-email').val('');
    $('#form-phone').val('');
    $('#form-description').val('');
  }
}

function ISODateTimeString(d) {
  d = new Date(d);

  function pad(n) {
    return n < 10 ? '0' + n : n
  }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function priorityTextToMark(priority) {
  switch(priority) {
    case 'Urgent':
      return 4;
      break;
    case 'High':
      return 3;
      break;
    case 'Medium':
      return 2;
      break;
    default:
      return 1;
  }
}

function statusTextToMark(status) {
  switch(status) {
    case 'Closed':
      return 5;
      break;
    case 'Resolved':
      return 4;
      break;
    case 'Pending':
      return 3;
      break;
    default:
      return 2;
  }
}

function priorityColor(priority) {
  switch(priority) {
    case 4:
      return 'rgb(230, 100, 100)';
      break;
    case 3:
      return 'rgb(233, 198, 13)';
      break;
    case 2:
      return 'rgb(113, 180, 209)';
      break;
    case 1:
      return 'rgb(126, 215, 170)';
      break;
    default:
      return 'N/A';
  }
}

function statusNumberToText(status) {
  switch(status) {
    case 5:
      return 'Closed';
      break;
    case 4:
      return 'Resolved';
      break;
    case 3:
      return 'Pending';
      break;
    default:
      return 'Open';
  }
}

function priorityNumberToText(priority) {
  switch(priority) {
    case 4:
      return 'Urgent';
      break;
    case 3:
      return 'High';
      break;
    case 2:
      return 'Medium';
      break;
    default:
      return 'Low';
  }
} // end of priorityNumberToText
function searchBar() {
  let content = $('.ticket-content tr');
  let val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
  content.show().filter(function() {
    var text1 = $(this).text().replace(/\s+/g, ' ').toLowerCase();
    return !~text1.indexOf(val);
  }).hide();
}
//=========[SORT CLOSE]=========
function sortCloseTable(n) {
  var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  table = $(".ticket-content");
  switching = true;
  //Set the sorting direction to ascending:
  dir = "asc";
  /*Make a loop that will continue until
  no switching has been done:*/
  while(switching) {
    //start by saying: no switching is done:
    switching = false;
    rows = table.find('tr');
    /*Loop through all table rows (except the
    first, which contains table headers):*/
    for(i = 0; i < (rows.length - 1); i++) {
      //start by saying there should be no switching:
      shouldSwitch = false;
      /*Get the two elements you want to compare,
      one from current row and one from the next:*/
      x = rows[i].childNodes[n];
      y = rows[i + 1].childNodes[n];
      /*check if the two rows should switch place,
      based on the direction, asc or desc:*/
      if(dir == "asc") {
        if(x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      } else if(dir == "desc") {
        if(x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
    }
    if(shouldSwitch) {
      /*If a switch has been marked, make the switch
      and mark that a switch has been done:*/
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      //Each time a switch is done, increase this count by 1:
      switchcount++;
    } else {
      /*If no switching has been done AND the direction is "asc",
      set the direction to "desc" and run the while loop again.*/
      if(switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}
