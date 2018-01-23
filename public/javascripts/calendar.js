/**
 * 宣告專門處理 Calendar 相關的 API 類別
 */
var CalendarAPI = (function() {
    let jwt = '';
    let calendarAPI = function(apiJWT) {
        jwt = apiJWT;
    };

    /**
     * 取得使用者所有的 calendar 事件
     *
     * @param {string} userId - 使用者的 firebase id
     */
    calendarAPI.prototype.findAll = function(userId) {
        return new Promise((resolve, reject) => {
            if (!userId) { return reject(new Error('userId is undefined')); }

            $.ajax({
                type: 'GET',
                url: '/api/calendars/users/' + userId,
                headers: {
                    Authorization: jwt
                },
                success: (response) => {
                    if (1 !== response.status) {
                        return reject(new Error(response.status + ' ' + response.msg));
                    }
                    resolve(response);
                },
                error: (error) => reject(error)
            });
        });
    };

    /**
     * 插入一筆 calendar 事件
     *
     * @param {string} userId - 使用者的 firebase ID
     * @param {*} data - 要進行插入的 calendar 事件資料
     */
    calendarAPI.prototype.insert = function(userId, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                url: '/api/calendars-events/users/' + userId,
                data: JSON.stringify(data),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                headers: {
                    Authorization: jwt
                },
                success: (response) => {
                    if (1 !== response.status) {
                        return reject(new Error(response.status + ' ' + response.msg));
                    }
                    resolve(response);
                },
                error: (error) => reject(error)
            });
        });
    };

    /**
     * 更新一筆指定的 calendar 事件
     *
     * @param {string} eventId - calendar 的事件ID
     * @param {*} data - 要進行更新的 calendar 事件資料
     */
    calendarAPI.prototype.update = function(eventId, userId, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'PUT',
                url: '/api/calendars-events/calendars/events/' + eventId + '/users/' + userId,
                data: JSON.stringify(data),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                headers: {
                    Authorization: jwt
                },
                success: (response) => {
                    if (1 !== response.status) {
                        return reject(new Error(response.status + ' ' + response.msg));
                    }
                    resolve(response);
                },
                error: (error) => reject(error)
            });
        });
    };

    /**
     * 移除一筆指定的 calendar 事件
     *
     * @param {string} eventId - calendar 的事件ID
     * @param {string} userId - 要進行更新的 calendar 事件資料
     */
    calendarAPI.prototype.remove = function(eventId, userId) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'DELETE',
                url: '/api/calendars-events/calendars/events/' + eventId + '/users/' + userId,
                headers: {
                    Authorization: jwt
                },
                success: (response) => {
                    if (1 !== response.status) {
                        return reject(new Error(response.status + ' ' + response.msg));
                    }
                    resolve(response);
                },
                error: (error) => reject(error)
            });
        });
    };

    return calendarAPI;
})();

(function() {
    var currentDatetime = new Date();
    var eventList;
    var userId;
    var avoidRemindAgain;
    var socket = io.connect();
    var nowEventId = 'invalid';
    var calendarAPI = null;

    var $jqDoc = $(document);
    var $calendar = null;

    auth.ready.then((currentUser) => {
        calendarAPI = new CalendarAPI(window.localStorage.getItem('jwt'));
        return new Promise((resolve) => {
            $jqDoc.ready(() => {
                resolve(currentUser);
            });
        });
    }).then((currentUser) => {
        userId = currentUser.uid; // 儲存全域用變數 userId

        $jqDoc.on('click', '#add-cal-btn', setCalendar); // 新增事件
        $jqDoc.on('click', '#save-cal-btn', setCalendar); // 更新事件
        $jqDoc.on('click', '#del-cal-btn', deleteCalendar); // 刪除事件
        $jqDoc.on('click', '#allday[type="checkbox"]', showAllday);

        return calendarAPI.findAll(userId);
    }).then((response) => {
        eventList = [];
        let events = response.data;
        for (let e in events) {
            if (events[e].delete) {
                continue; // 如果此行事曆事件已被刪除，則忽略不處理
            }
            eventList.push(events[e]);
        }
    }).catch((error) => {
        console.error(error);
        eventList = [];
        return Promise.reject(error); // 跳脫這個 promise chain 不往下執行 then
    }).then(() => {
        $calendar = $('#calendar');

        // Initialize fullCalendar.
        $calendar.fullCalendar({
            theme: true, // fullcalendar的介面主題，啟用 jQuery-UI
            buttonIcons: {
                prev: 'circle-triangle-w',
                next: 'circle-triangle-e'
            },
            // Defines the buttons and title position which is at the top of the calendar.
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay'
            },

            defaultDate: currentDatetime, // The initial date displayed when the calendar first loads.
            editable: true, // true allow user to edit events.
            eventLimit: true, // allow "more" link when too many events
            selectable: true, // allows a user to highlight multiple days or timeslots by clicking and dragging.
            selectHelper: true, // whether to draw a "placeholder" event while the user is dragging.
            // events is the main option for calendar.
            events: eventList,
            // execute after user select timeslots.
            select: (start, end, jsEvent, view) => { // 新增新事件
                nowEventId = 'invalid';
                // 檢查新增事件時，如果起始日期是當天，則使用當前的時間參數
                let convertStart = (function isToday(dateTime) {
                    let dateNow = new Date();
                    if (dateTime.getFullYear() === dateNow.getFullYear() &&
                        dateTime.getMonth() === dateNow.getMonth() &&
                        dateTime.getDate() === dateNow.getDate()) {
                        return true;
                    }
                    return false;
                })(start._d) ? convertTime(new Date()) : convertTime(start._d);
                let convertEnd = convertTime(end._d);
                $('#modalTitle').html('新增事件');

                $('#keyId').text('').prop('disabled', false);
                $('#title').val('').prop('disabled', false);
                $('#startDate').val(convertStart.date).prop('disabled', false); // 日期input設定
                $('#startTime').val(convertStart.time).prop('disabled', false); // 時間input設定
                $('#endDate').val(convertEnd.date).prop('disabled', false);
                $('#endTime').val(convertEnd.time).prop('disabled', false);
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

                $calendar.fullCalendar('unselect');
            },
            // edit after click.
            eventClick: function(event, jsEvent, view) { // 更改事件
                nowEventId = event._id;

                $('#modalTitle').html('檢視事件');
                // 資料的值放進對應的input
                $('#keyId').text(event.keyId);
                $('#title').val(event.title);
                let start = convertShow(event.start._i); // 轉換成輸出格式
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

                $calendar.fullCalendar('unselect');
            },
            // execute after user drag and drop an event.
            eventDrop: (event, delta, revertFunc, jsEvent, ui, view) => {
                let timeGap = delta.asMilliseconds();
                let start = Date.parse(event.start._i);
                start = ISODateTimeString(start + timeGap).date + 'T' + ISODateTimeString(start + timeGap).time;
                let end = Date.parse(event.end._i);
                end = ISODateTimeString(end + timeGap).date + 'T' + ISODateTimeString(end + timeGap).time;

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
                return calendarAPI.update(keyId, userId, obj);
            },
            eventDurationEditable: true
        });
    });

    /**
     * 確定新增或更改事件
     */
    function setCalendar() {
        let keyId = $('#keyId').text();
        let title = $('#title').val();
        let startDate = $('#startDate').val() + 'T' + $('#startTime').val(); // 把user輸入的日期和時間串起來
        let endDate = $('#endDate').val() + 'T' + $('#endTime').val();

        let description = $('#description').val();
        let allDay = $('#allday').prop('checked');

        let flag = true;
        if (!title || !startDate || !endDate) {
            $('#cal-error-msg').show();
            flag = false;
        } else $('#cal-error-msg').hide();

        // start time error
        let currentDate = new Date();

        if (Date.parse(startDate) <= Date.parse(currentDate)) {
            $('#start-time-error-msg').addClass('font-red').show();
            flag = false;
        } else {
            $('#start-time-error-msg').hide();
        }

        // End time earlier than Start time error
        if (Date.parse(endDate) <= Date.parse(startDate)) {
            $('#tim-error-msg').show();
            flag = false;
        } else $('#tim-error-msg').hide();

        if (!flag) return;

        if (allDay) {
            startDate = ISODateString($('#startDate').val() + 'T00:00'); // 把user輸入的日期和時間串起來
            endDate = ISOEndDate($('#endDate').val() + 'T23:59');
        }

        let obj = {
            title: title,
            start: startDate,
            end: endDate,
            description: description,
            allDay: allDay,
            remind: false
        };

        if (!keyId) { // 新增事件
            return calendarAPI.insert(userId, obj).then((response) => {
                clearInputs();
                $('#calendar-modal').modal('hide');
                $calendar.fullCalendar('renderEvent', response.obj, true);
            }).catch(() => {
                alert('post error');
            });
        } else { // 更改事件
            return calendarAPI.update(keyId, userId, obj).then((response) => {
                $calendar.fullCalendar('renderEvent', response.obj, true); // make the event "stick"
                $calendar.fullCalendar('removeEvents', nowEventId);
                clearInputs();
                $('#calendar-modal').modal('hide');
            }).catch(() => {
                alert('edit error');
            });
        }
    }; // end on click

    function deleteCalendar() { // 確定刪除事件
        let keyId = $('#keyId').text();

        return calendarAPI.remove(keyId, userId).then(() => {
            $calendar.fullCalendar('removeEvents', nowEventId);
            clearInputs();
            $('#calendar-modal').modal('hide');
        }).catch((error) => {
            console.error(error);
        });
    }

    // function reminder() { //事件開始時提醒
    //     //console.log('Check the reminder...');
    //     let currentDatetime = new Date();
    //     let nowtime = ISODateTimeString(currentDatetime).date + 'T' + ISODateTimeString(currentDatetime).time; //convertTime(currentDatetime)-8hours
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

        if (0 === d.getHours() && 0 === d.getMinutes()) {
            return ISODateString(d);
        } else {
            return ISODateString(moment(d).add('days', 1));
        }
    }

    function ISODateString(d) {
        d = new Date(d);

        function pad(n) { return 10 > n ? '0' + n : n; }
        return d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate()) + 'T' +
            '00:00';
    }

    function ISODateTimeString(d) { // 轉換時間
        d = new Date(d);

        function pad(n) {
            return 10 > n ? '0' + n : n;
        }
        let finalDate = {}; // 分割成日期和時間
        finalDate.date = d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate());
        finalDate.time = pad(d.getHours()) + ':' +
            pad(d.getMinutes());
        return finalDate; // finalDate為物件
    }

    function convertTime(date) {
        let newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
        let finalDate = ISODateTimeString(newDate);
        return finalDate;
    }

    function convertShow(dateString) { // 資料轉換成輸出格式
        let newDate = new Date(Date.parse(dateString));
        let finalDate = ISODateTimeString(newDate);
        return finalDate;
    }

    function showAllday() { // 勾選allday時，時間會hide
        if ($('#allday').prop('checked')) {
            $('#startTime').hide();
            $('#endTime').hide();
        } else {
            $('#startTime').show();
            $('#endTime').show();
        }
    }

    $('#calendar-modal').on('shown.bs.modal', function() { // 在show form之後做allday判斷
        showAllday();
    });

    function clearInputs() {
        $('#title').val('');
        $('#startDate').val('');
        $('#startTime').val(''); // 把user輸入的日期和時間串起來
        $('#endDate').val('');
        $('#endTime').val('');
        $('#description').val('');
        $('#allday').attr('checked', false);
    }
})();
