var current_datetime = new Date();
var event_list;
var userId;
var avoidremindagain;
var socket = io.connect();
var calendar = $('#calendar');
var nowEventId = "invalid";

// jQuery
$(document).ready(function() {});

$(document).on('click', '#add-cal-btn', set_cal); //新增事件
$(document).on('click', '#save-cal-btn', set_cal); //更新事件
$(document).on('click', '#del-cal-btn', del_cal); //刪除事件

var getAuth = setInterval(function() {
    if (auth.currentUser) {
        clearInterval(getAuth);
        let userId = auth.currentUser.uid

        findAll(userId);
    }
}, 200);

var loadCalTable = setInterval(function() { //loop until loading is done
    if (!event_list) return; //check event_list
    clearInterval(loadCalTable); //end loop

    //Initialize fullCalendar.
    calendar.fullCalendar({
        theme: true, //fullcalendar的介面主題，啟用jQuery-UI
        buttonIcons: {
            prev: 'circle-triangle-w',
            next: 'circle-triangle-e'
        },
        //Defines the buttons and title position which is at the top of the calendar.
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },

        defaultDate: current_datetime, //The initial date displayed when the calendar first loads.
        editable: true, //true allow user to edit events.
        eventLimit: true, // allow "more" link when too many events
        selectable: true, //allows a user to highlight multiple days or timeslots by clicking and dragging.
        selectHelper: true, //whether to draw a "placeholder" event while the user is dragging.
        //events is the main option for calendar.
        events: event_list,
        //execute after user select timeslots.
        select: (start, end, jsEvent, view) => { //新增新事件
            nowEventId = "invalid";
            let convert_start = convertTime(start._d);
            let convert_end = convertTime(end._d);
            $('#modalTitle').html('新增事件');

            $('#keyId').text('').prop('disabled', false);
            $('#title').val('').prop('disabled', false);
            $('#startDate').val(convert_start.date).prop('disabled', false); // 日期input設定
            $('#startTime').val(convert_start.time).prop('disabled', false); // 時間input設定
            $('#endDate').val(convert_end.date).prop('disabled', false);
            $('#endTime').val(convert_end.time).prop('disabled', false);
            $('#description').val('').prop('disabled', false);
            $('#allday').prop('checked', false).prop('disabled', false);

            // 隱藏錯誤訊息
            $('#start-time-error-msg').hide();
            $('#cal-error-msg').hide();
            $('#tim-error-msg').hide();
            // 新增視窗
            $('#calendar-modal').modal('show');
            // 按鈕設定
            $('#add-cal-btn').show();
            $('#save-cal-btn').hide();
            $('#del-cal-btn').hide();

            calendar.fullCalendar('unselect');
        },

        // edit after click.
        eventClick: function(event, jsEvent, view) { //更改事件
            nowEventId = event._id;

            $('#modalTitle').html('檢視事件');
            // 資料的值放進對應的input
            $('#keyId').text(event.keyId);
            $('#title').val(event.title);
            let start = convertShow(event.start._i); //轉換成輸出格式
            let end = convertShow(event.end._i);
            $('#startDate').val(start.date);
            $('#startTime').val(start.time);
            $('#endDate').val(end.date);
            $('#endTime').val(end.time);
            $('#description').val(event.description);
            $('#allday').prop('checked', event.allDay).prop('disabled', true);

            // 隱藏錯誤訊息
            $('#cal-error-msg').hide();
            $('#tim-error-msg').hide();
            // 新增視窗
            $('#calendar-modal').modal('show');
            // 按鈕設定
            $('#add-cal-btn').hide();
            $('#save-cal-btn').show();
            $('#del-cal-btn').show();

            calendar.fullCalendar('unselect');
        },

        //execute after user drag and drop an event.
        eventDrop: (event, delta, revertFunc, jsEvent, ui, view) => {
            let time_gap = delta.asMilliseconds();
            let start = Date.parse(event.start._i);
            start = ISODateTimeString(start + time_gap).date + 'T' + ISODateTimeString(start + time_gap).time;
            let end = Date.parse(event.end._i);
            end = ISODateTimeString(end + time_gap).date + 'T' + ISODateTimeString(end + time_gap).time;

            let keyId = event.keyId;
            let obj = {
                title: event.title,
                start: start,
                end: end,
                description: event.description,
                allDay: event.allDay,
                remind: false,
                keyId: keyId
            };
            update(keyId, obj);
        },

        eventDurationEditable: true
    });

}, 200);

function set_cal() { //確定新增或更改事件
    let keyId = $('#keyId').text();
    let title = $('#title').val();
    let start_date = $('#startDate').val() + "T" + $('#startTime').val(); //把user輸入的日期和時間串起來
    let end_date = $('#endDate').val() + "T" + $('#endTime').val();

    let description = $('#description').val();
    let allDay = $('#allday').prop('checked');

    let flag = true;
    if (!title || !start_date || !end_date) {
        $('#cal-error-msg').show();
        flag = false;
    } else $('#cal-error-msg').hide();

    // start time error
    let current_date = new Date();
    if (Date.parse(start_date) < Date.parse(current_date)) {
        $('#start-time-error-msg').addClass('font-red').show();
        flag = false;
    } else {
        $('#start-time-error-msg').hide();
    }

    // End time earlier than Start time error
    if (Date.parse(end_date) <= Date.parse(start_date)) {
        $('#tim-error-msg').show();
        flag = false;
    } else $('#tim-error-msg').hide();

    if (!flag) return;

    if (allDay) {
        start_date = $('#startDate').val() + "T00:00"; //把user輸入的日期和時間串起來
        end_date = $('#endDate').val() + "T23:59";
        start_date = ISODateString(start_date);
        end_date = ISOEndDate(end_date);
        // console.log(start_date);
        // console.log(end_date);
    }
    let obj = {
        title: title,
        start: start_date,
        end: end_date,
        description: description,
        allDay: allDay,
        remind: false
    };
    if (!keyId) { //新增事件
        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                insert(obj, () => {
                    resolve();
                });
            });
        }).then(() => {
            clearInputs();
            $('#calendar-modal').modal('hide');
        }).catch(() => {
            alert('post error');
        });
    } else { //更改事件
        let proceed = Promise.resolve();
        proceed.then(() => {
            return new Promise((resolve, reject) => {
                update(keyId, obj, () => {
                    resolve();
                });
            });
        }).then(() => {
            calendar.fullCalendar('removeEvents', nowEventId);
            clearInputs();
            $('#calendar-modal').modal('hide');
        }).catch(() => {
            alert('edit error');
        });
    }
}; //end on click

function del_cal() { //確定刪除事件
    let keyId = $('#keyId').text();
    let proceed = Promise.resolve();
    proceed.then(() => {
        remove(keyId, () => {
            calendar.fullCalendar('removeEvents', nowEventId);
            clearInputs();
            $('#calendar-modal').modal('hide');
        });
    });
}

function insert(data, callback) {
    var jwt = localStorage.getItem("jwt");
    let userId = auth.currentUser.uid;
    $.ajax({
        type: 'POST',
        url: '/api/calendars-events/users/' + userId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let obj = data.obj;
            calendar.fullCalendar('renderEvent', obj, true); // make the event "stick"
            callback();
        },
        error: (error) => {
          console.log(error);
        }
    });
}

function findAll(userId) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'GET',
        url:  '/api/calendars/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            event_list = [];
            let events = data.data;
            for (let e in events) {
                if (events[e].delete === 0) {
                    event_list.push(events[e]);
                }
            }
        },
        error: (error) => {
            console.log(error);
            event_list = [];
        }
    });
}

function update(eventId, data, callback) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'PUT',
        url: '/api/calendars-events/calendars/events/' + eventId + '/users/' + userId,
        data: JSON.stringify(data),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": jwt
        },
        success: (data) => {
            let obj = data.obj;
            calendar.fullCalendar('renderEvent', obj, true); // make the event "stick"
            callback();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

function remove(eventId, callback) {
    var jwt = localStorage.getItem("jwt");
    var userId = auth.currentUser.uid;
    $.ajax({
        type: 'DELETE',
        url: '/api/calendars-events/calendars/events/' + eventId + '/users/' + userId,
        headers: {
            "Authorization": jwt
        },
        success: () => {
            callback();
        },
        error: (error) => {
            console.log(error);
        }
    });
}

// function reminder() { //事件開始時提醒
//     //console.log('Check the reminder...');
//     let current_datetime = new Date();
//     let nowtime = ISODateTimeString(current_datetime).date + 'T' + ISODateTimeString(current_datetime).time; //convertTime(current_datetime)-8hours
//     //console.log('nowtime= ' + nowtime);
//     socket.emit('reminder of calendar', { //呼叫www的判斷function
//         userId: userId,
//         nowtime: nowtime,
//         email: auth.currentUser.email
//     });
// }
// socket.on('pop up reminder', (title) => { //接收WWW的訊息 前端pop up提醒視窗
//     alert('您的事件 "' + title + '" 已經開始, 系統將對您的登入Email寄出通知信');
// });

function ISOEndDate(d) {
    d = new Date(d);

    if (d.getHours() == 0 && d.getMinutes() == 0) {
        return ISODateString(d);
    } else {
        return ISODateString(moment(d).add('days', 1));
    }
}

function ISODateString(d) {
    d = new Date(d);

    function pad(n) { return n < 10 ? '0' + n : n }
    return d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        '00:00';
}

function ISODateTimeString(d) { //轉換時間
    d = new Date(d);

    function pad(n) {
        return n < 10 ? '0' + n : n
    }
    let finalDate = new Object(); //分割成日期和時間
    finalDate.date = d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate());
    finalDate.time = pad(d.getHours()) + ':' +
        pad(d.getMinutes());
    return finalDate; //finalDate為物件
}

function convertTime(date) {
    let newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
    let finalDate = ISODateTimeString(newDate);
    return finalDate;
}

function convertShow(dateString) { //資料轉換成輸出格式
    let newDate = new Date(Date.parse(dateString));
    finalDate = ISODateTimeString(newDate);
    return finalDate;
}

function show_allday() { //勾選allday時，時間會hide
    if ($('#allday').prop('checked')) {
        $('#startTime').hide();
        $('#endTime').hide();
    } else {
        $('#startTime').show();
        $('#endTime').show();
    }
}

$("#calendar-modal").on("shown.bs.modal", function() { //在show form之後做allday判斷
    show_allday();
});

function clearInputs() {
  $('#title').val('');
  $('#startDate').val('');
  $('#startTime').val(''); //把user輸入的日期和時間串起來
  $('#endDate').val('')
  $('#endTime').val('');
  $('#description').val('');
  $('#allday').attr('checked', false);
}
