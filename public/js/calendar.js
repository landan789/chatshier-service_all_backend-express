/// <reference path='../../typings/client/_firebase-auth.d.ts' />
/// <reference path='../../typings/client/config.d.ts' />
/// <reference path='../../typings/client/restful_api.d.ts' />

(function() {
    var CalendarEventTypes = (function() {
        var definedType = {
            Calendar: 'C',
            Ticket: 'T'
        };
        Object.freeze(definedType);
        return definedType;
    })();

    var CalendarEventItem = (function() {
        var calendarEventItem = function() {
            // 目前只設定使用到的項目，並無全部都設定
            // 參考: https://fullcalendar.io/docs/event_data/Event_Object/
            this.isAllDay = false;
            this.description = '';
            this.end = null;
            this.id = '';
            this.eventType = CalendarEventTypes.Calendar;
            this.start = null;
            this.title = '';
            this.backgroundColor = '#90b5c7';
            this.borderColor = '#90b5c7';
            this.textColor = '#efefef';
        };

        calendarEventItem.prototype.isAllDay = null;
        calendarEventItem.prototype.description = null;
        calendarEventItem.prototype.end = null;
        calendarEventItem.prototype.id = null;
        calendarEventItem.prototype.eventType = null;
        calendarEventItem.prototype.start = null;
        calendarEventItem.prototype.title = null;

        return calendarEventItem;
    })();

    var TicketEventItem = (function(extendBase) {
        var ticketEventItem = function() {
            extendBase.call(this);
            this.eventType = CalendarEventTypes.Ticket;
            this.backgroundColor = '#c7e6c7';
            this.borderColor = '#c7e6c7';
            this.textColor = '#6e6e6e';
        };
        ticketEventItem.prototype = Object.assign(ticketEventItem.prototype, extendBase.prototype);
        ticketEventItem.prototype.constructor = ticketEventItem;
        return ticketEventItem;
    })(CalendarEventItem);

    var calendarEventMap = {};
    var api = window.restfulAPI;
    var userId = '';

    var $jqDoc = $(document);
    var $calendar = null;

    auth.ready.then(function(currentUser) {
        userId = currentUser.uid; // 儲存全域用變數 userId

        var $addCalendarBtn = $('#add-cal-btn');
        var $saveCalendarBtn = $('#save-cal-btn');
        var $delCalendarBtn = $('#del-cal-btn');

        $jqDoc.on('click', '#allday[type="checkbox"]', showAllday);

        // Initialize fullCalendar.
        calendarEventMap = {};
        $calendar = $('#calendar');
        $calendar.addClass('chsr'); // 加入自訂的 css class 前綴
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

            defaultDate: new Date(), // The initial date displayed when the calendar first loads.
            editable: true, // true allow user to edit events.
            eventLimit: true, // allow "more" link when too many events
            selectable: true, // allows a user to highlight multiple days or timeslots by clicking and dragging.
            selectHelper: true, // whether to draw a "placeholder" event while the user is dragging.
            // events is the main option for calendar.
            events: [],
            // execute after user select timeslots.
            select: function(start, end, jsEvent, view) { // 新增新事件
                // 檢查新增事件時，如果起始日期是當天，則使用當前的時間參數
                var convertStart = (function isToday(dateTime) {
                    var dateNow = new Date();
                    if (dateTime.getFullYear() === dateNow.getFullYear() &&
                        dateTime.getMonth() === dateNow.getMonth() &&
                        dateTime.getDate() === dateNow.getDate()) {
                        return true;
                    }
                    return false;
                })(start._d) ? convertTime(new Date()) : convertTime(start._d);
                var convertEnd = convertTime(end._d);
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

                // 按鈕設定
                $addCalendarBtn.show();

                $addCalendarBtn.off('click').on('click', function() {
                    setCalendar();
                }); // 新增事件
                $saveCalendarBtn.hide();
                $delCalendarBtn.hide();

                $calendar.fullCalendar('unselect');
                $('#calendar-modal').modal('show'); // 顯示新增視窗
            },
            // edit after click.
            eventClick: function(event, jsEvent, view) { // 更改事件
                console.log(event);

                $('#modalTitle').html('檢視事件');
                // 資料的值放進對應的input
                var $titleElem = $('#title');
                $titleElem.val(event.title);
                // 屬於待辦事項的資料 Title 僅顯示用不允許編輯
                CalendarEventTypes.Ticket === event.eventType && $titleElem.prop('disabled', true);

                var start = convertShow(event.start._i); // 轉換成輸出格式
                var end = convertShow(event.end._i);
                $('#startDate').val(start.date);
                $('#startTime').val(start.time);
                $('#endDate').val(end.date);
                $('#endTime').val(end.time);
                $('#description').val(event.description);
                $('#allday').prop('checked', event.allDay).prop('disabled', true);

                // 隱藏錯誤訊息
                $('#cal-error-msg').hide();
                $('#tim-error-msg').hide();

                // 按鈕設定
                $addCalendarBtn.hide();

                $saveCalendarBtn.off('click').on('click', function() {
                    setCalendar(event);
                }); // 更新事件
                $saveCalendarBtn.show();

                $delCalendarBtn.off('click').on('click', function() {
                    deleteCalendar(event);
                }); // 刪除事件
                $delCalendarBtn.show();

                $calendar.fullCalendar('unselect');
                $('#calendar-modal').modal('show'); // 顯示新增視窗
            },
            // execute after user drag and drop an event.
            eventDrop: function(event, delta, revertFunc, jsEvent, ui, view) {
                var timeGap = delta.asMilliseconds();
                var start = Date.parse(event.start._i);
                start = ISODateTimeString(start + timeGap).date + 'T' + ISODateTimeString(start + timeGap).time;
                var end = Date.parse(event.end._i);
                end = ISODateTimeString(end + timeGap).date + 'T' + ISODateTimeString(end + timeGap).time;

                var data = {
                    title: event.title,
                    startTime: start,
                    endTime: end,
                    description: event.description,
                    isAllDay: event.allDay
                };
                return api.calendar.update(event.calendarId, event.id, userId, data);
            },
            eventDurationEditable: true
        });

        return Promise.all([
            api.calendar.getAll(userId), // 取得所有的行事曆事件
            api.ticket.getAll(userId) // 取得所有的待辦事項
        ]);
    }).then(function(respJsons) {
        var allAppEvents = respJsons[0].data;
        var calendarEventList = [];

        for (var calendarId in allAppEvents) {
            for (var eventId in allAppEvents[calendarId].events) {
                var calendarEvent = allAppEvents[calendarId].events[eventId];
                if (calendarEvent.isDeleted) {
                    continue; // 如果此行事曆事件已被刪除，則忽略不處理
                }
                var cEventItem = new CalendarEventItem();
                cEventItem = Object.assign(cEventItem, calendarEvent);
                cEventItem.allDay = calendarEvent.isAllDay;
                cEventItem.description = calendarEvent.description;
                cEventItem.end = new Date(calendarEvent.endTime);
                cEventItem.start = new Date(calendarEvent.startTime);
                cEventItem.title = calendarEvent.title;
                cEventItem.calendarId = calendarId;
                cEventItem.id = eventId;
                calendarEventMap[cEventItem.id] = cEventItem;
                calendarEventList.push(cEventItem);
            }
        }

        var allAppTickets = respJsons[1].data;
        for (var ticketAppId in allAppTickets) {
            for (var ticketId in allAppTickets[ticketAppId].tickets) {
                var ticket = allAppTickets[ticketAppId].tickets[ticketId];
                if (ticket.isDeleted) {
                    continue;
                }

                // 由於待辦事項的資料項目與行事曆元件的數據項目不相同，因此需要進行轉換
                var tEventItem = new TicketEventItem();
                tEventItem = Object.assign(tEventItem, ticket);
                tEventItem.allDay = false; // 待辦事項無視全天項目，都是 false
                tEventItem.description = ticket.description;
                tEventItem.end = new Date(ticket.dueTime);
                tEventItem.start = new Date(ticket.createdTime);
                // 待辦事項的標題以描述的前10個字顯示之
                tEventItem.title = ticket.description.length > 10 ? ticket.description.substring(0, 10) : ticket.description;
                tEventItem.calendarId = ticketAppId;
                tEventItem.id = ticketId;
                calendarEventMap[tEventItem.id] = tEventItem;
                calendarEventList.push(tEventItem);
            }
        }
        calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
    }).catch(function(error) {
        console.error(error);
    });

    /**
     * 確定新增或更改行事曆上的事件
     *
     * @param {*} event - jquery UI 的 fullCalendar 元件的事件物件
     */
    function setCalendar(event) {
        var title = $('#title').val();
        var startDate = $('#startDate').val() + 'T' + $('#startTime').val(); // 把user輸入的日期和時間串起來
        var endDate = $('#endDate').val() + 'T' + $('#endTime').val();

        var description = $('#description').val();
        var isAllDay = $('#allday').prop('checked');

        var isDataOK = true;
        if (!title || !startDate || !endDate) {
            $('#cal-error-msg').show();
            isDataOK = false;
        } else {
            $('#cal-error-msg').hide();
        }

        // start time error
        var currentDate = new Date();

        if (Date.parse(startDate) <= Date.parse(currentDate)) {
            $('#start-time-error-msg').addClass('font-red').show();
            isDataOK = false;
        } else {
            $('#start-time-error-msg').hide();
        }

        // End time earlier than Start time error
        if (Date.parse(endDate) <= Date.parse(startDate)) {
            $('#tim-error-msg').show();
            isDataOK = false;
        } else $('#tim-error-msg').hide();

        if (!isDataOK) {
            return;
        }

        // 若使用者勾選全天項目，把使用者輸入的日期和時間串起來並設定日期時間為全天
        if (isAllDay) {
            startDate = ISODateString($('#startDate').val() + 'T00:00');
            endDate = ISOEndDate($('#endDate').val() + 'T23:59');
        }

        var eventData = {
            title: title,
            startTime: new Date(startDate).getTime(),
            endTime: new Date(endDate).getTime(),
            description: description,
            isAllDay: isAllDay
        };

        if (!event) { // 若沒有輸入事件，代表為新增行事曆事件的處理
            return api.calendar.insert(userId, eventData).then(function(response) {
                clearInputs();
                $('#calendar-modal').modal('hide');

                var calendarEventList = [];
                var allCalendars = response.data;
                for (var calendarId in allCalendars) {
                    for (var eventId in allCalendars[calendarId].events) {
                        var event = allCalendars[calendarId].events[eventId];
                        if (event.isDeleted) {
                            continue;
                        }

                        var eventItem = new CalendarEventItem();
                        eventItem = Object.assign(eventItem, event);
                        eventItem.start = new Date(event.startTime);
                        eventItem.end = new Date(event.endTime);
                        eventItem.calendarId = calendarId;
                        eventItem.id = eventId;
                        calendarEventMap[eventItem.id] = eventItem;
                        calendarEventList.push(eventItem);
                    }
                }
                calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
            }).catch(function(error) {
                console.error(error);
            });
        } else { // 更改事件
            // 根據事件型態來判斷發送不同 API 進行資料更新動作
            switch (event.eventType) {
                case CalendarEventTypes.Ticket:
                    // 將原本的 ticket 的資料原封不動複製一份，只更新建立時間與到期時間
                    let tickerData = {
                        createdTime: eventData.startTime,
                        description: description,
                        dueTime: eventData.endTime,
                        priority: event.priority,
                        messagerId: event.messagerId,
                        status: event.status,
                        updatedTime: new Date().getTime()
                    };

                    return api.ticket.update(event.calendarId, event.id, userId, tickerData).then(function(response) {
                        $calendar.fullCalendar('removeEvents', event.id);
                        clearInputs();
                        $('#calendar-modal').modal('hide');

                        var eventItem = new TicketEventItem();
                        eventItem = Object.assign(eventItem, tickerData);
                        eventItem.allDay = false;
                        eventItem.description = tickerData.description;
                        eventItem.end = new Date(tickerData.dueTime);
                        eventItem.start = new Date(tickerData.createdTime);
                        // 待辦事項的標題以描述的前10個字顯示之
                        eventItem.title = tickerData.description.length > 10 ? tickerData.description.substring(0, 10) : tickerData.description;
                        eventItem.calendarId = event.calendarId;
                        eventItem.id = event.id;
                        calendarEventMap[eventItem.id] = eventItem;
                        $calendar.fullCalendar('renderEvent', eventItem, true);
                    });
                case CalendarEventTypes.Calendar:
                default:
                    return api.calendar.update(event.calendarId, event.id, userId, eventData).then(function(response) {
                        $calendar.fullCalendar('removeEvents', event.id);
                        clearInputs();
                        $('#calendar-modal').modal('hide');

                        // 更新完之後行事曆事件後，將回傳的資訊更新至 UI
                        var calendarEventList = [];
                        var allCalendars = response.data;
                        for (var calendarId in allCalendars) {
                            for (var eventId in allCalendars[calendarId].events) {
                                var updatedEvent = allCalendars[calendarId].events[eventId];
                                if (updatedEvent.isDeleted) {
                                    continue;
                                }

                                var eventItem = new CalendarEventItem();
                                eventItem = Object.assign(eventItem, updatedEvent);
                                eventItem.start = new Date(updatedEvent.startTime);
                                eventItem.end = new Date(updatedEvent.endTime);
                                eventItem.calendarId = calendarId;
                                eventItem.id = eventId;
                                calendarEventMap[eventItem.id] = eventItem;
                                calendarEventList.push(eventItem);
                            }
                        }
                        calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
                    }).catch(function(error) {
                        console.error(error);
                    });
            }
        }
    }; // end on click

    /**
     * 刪除行事曆上的事件
     *
     * @param {*} event - jquery UI 的 fullCalendar 元件的事件物件
     */
    function deleteCalendar(event) { // 確定刪除事件
        console.log(event);
        return Promise.resolve().then(function() {
            switch (event.eventType) {
                case CalendarEventTypes.Ticket:
                    return api.ticket.remove(event.calendarId, event.id, userId);
                case CalendarEventTypes.Calendar:
                default:
                    return api.calendar.remove(event.calendarId, event.id, userId);
            }
        }).then(function() {
            $calendar.fullCalendar('removeEvents', event.id);
            clearInputs();
            $('#calendar-modal').modal('hide');
        }).catch(function(error) {
            console.error(error);
        });
    }

    // function reminder() { //事件開始時提醒
    //     //console.log('Check the reminder...');
    //     var currentDatetime = new Date();
    //     var nowtime = ISODateTimeString(currentDatetime).date + 'T' + ISODateTimeString(currentDatetime).time; //convertTime(currentDatetime)-8hours
    //     //console.log('nowtime= ' + nowtime);
    //     socket.emit('reminder of calendar', { //呼叫www的判斷function
    //         userId: userId,
    //         nowtime: nowtime,
    //         email: auth.currentUser.email
    //     });
    // }
    // socket.on('pop up reminder', function(title) { //接收WWW的訊息 前端pop up提醒視窗
    //     alert('您的事件 "' + title + '" 已經開始, 系統將對您的登入Email寄出通知信');
    // });

    function ISOEndDate(d) {
        d = new Date(d);

        if (0 === d.getHours() && 0 === d.getMinutes()) {
            return ISODateString(d);
        } else {
            return ISODateString(window.moment(d).add('days', 1));
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
        var finalDate = {}; // 分割成日期和時間
        finalDate.date = d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate());
        finalDate.time = pad(d.getHours()) + ':' +
            pad(d.getMinutes());
        return finalDate; // finalDate為物件
    }

    function convertTime(date) {
        var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
        var finalDate = ISODateTimeString(newDate);
        return finalDate;
    }

    function convertShow(dateString) { // 資料轉換成輸出格式
        var newDate = new Date(Date.parse(dateString));
        var finalDate = ISODateTimeString(newDate);
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
