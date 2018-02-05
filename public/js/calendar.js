/// <reference path='../../typings/client/index.d.ts' />

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

    var $calendar = $('#calendar');
    var $calendarModal = $('.modal.calendar-modal');
    var $calendarSdtPicker = $('#start_datetime_picker');
    var $calendarEdtPicker = $('#end_datetime_picker');
    var $calendarModalTitle = $calendarModal.find('.modal-title');
    var $calendarModalForm = $calendarModal.find('form.calendar-modal-form');
    var $eventTitle = $calendarModalForm.find('input.event-title');
    var $eventContent = $calendarModalForm.find('textarea.event-content');
    var $eventIsAllday = $calendarModalForm.find('input#event_is_allday');
    var sTimePickerData = null;
    var eTimePickerData = null;

    auth.ready.then(function(currentUser) {
        userId = currentUser.uid; // 儲存全域用變數 userId
        calendarEventMap = {};

        var $addCalendarBtn = $('#add-cal-btn');
        var $saveCalendarBtn = $('#save-cal-btn');
        var $delCalendarBtn = $('#del-cal-btn');

        // 初始化 modal 裡的 datetime picker
        // 使用 moment.js 的 locale 設定 i18n 日期格式
        $calendarSdtPicker.datetimepicker({ locale: 'zh-tw' });
        $calendarEdtPicker.datetimepicker({ locale: 'zh-tw' });
        sTimePickerData = $calendarSdtPicker.data('DateTimePicker');
        eTimePickerData = $calendarEdtPicker.data('DateTimePicker');

        // 初始化 fullCalendar 元件
        $calendar.addClass('chsr'); // 加入自訂的 css class 前綴
        $calendar.fullCalendar({
            locale: 'zh-tw',
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
                initDalendarModal(start, start);
                $calendarModalTitle.text('新增事件');
                $eventTitle.removeAttr('disabled');

                // 新增行事曆事件處理，先 off 再 on 避免事件疊加
                $addCalendarBtn.off('click').on('click', function() {
                    var calendarData = {
                        title: $eventTitle.val(),
                        startTime: sTimePickerData.date().toDate().getTime(),
                        endTime: eTimePickerData.date().toDate().getTime(),
                        description: $eventContent.val(),
                        isAllDay: $eventIsAllday.prop('checked') ? 1 : 0
                    };

                    if (!calendarDataIsOK(calendarData)) {
                        return;
                    }
                    insertCalendarEvent(calendarData);
                });

                // 按鈕顯示設定
                $addCalendarBtn.show();
                $saveCalendarBtn.hide();
                $delCalendarBtn.hide();

                $calendar.fullCalendar('unselect');
                $calendarModal.modal('show');
            },
            eventClick: function(calendarEvent, jsEvent, view) { // 更改事件
                initDalendarModal(calendarEvent.start, calendarEvent.end || calendarEvent.endTime);
                $calendarModalTitle.text('檢視事件');

                $eventTitle.val(calendarEvent.title);
                $eventIsAllday.prop('checked', !!calendarEvent.isAllDay);
                if (CalendarEventTypes.Ticket === calendarEvent.eventType) {
                    // 屬於待辦事項的資料 Title 僅顯示用不允許編輯
                    $eventTitle.prop('disabled', true);
                    $eventIsAllday.prop('disabled', true);
                }
                $eventContent.val(calendarEvent.description);

                // 更新事件
                $saveCalendarBtn.off('click').on('click', function() {
                    var calendarData = {
                        title: $eventTitle.val(),
                        startTime: sTimePickerData.date().toDate().getTime(),
                        endTime: eTimePickerData.date().toDate().getTime(),
                        description: $eventContent.val(),
                        isAllDay: $eventIsAllday.prop('checked') ? 1 : 0
                    };
                    updateCalendarEvent(calendarEvent, calendarData);
                });

                // 刪除事件
                $delCalendarBtn.off('click').on('click', function() {
                    deleteCalendarEvent(calendarEvent);
                });

                // 按鈕顯示設定
                $addCalendarBtn.hide();
                $saveCalendarBtn.show();
                $delCalendarBtn.show();

                $calendar.fullCalendar('unselect');
                $calendarModal.modal('show'); // 顯示新增視窗
            },
            // execute after user drag and drop an event.
            eventDrop: function(event, delta, revertFunc, jsEvent, ui, view) {
                var timeGap = delta.asMilliseconds();
                var calendarData = {
                    title: event.title,
                    startTime: event.startTime + timeGap,
                    endTime: event.endTime + timeGap,
                    description: event.description,
                    isAllDay: event.allDay ? 1 : 0
                };
                return api.calendar.update(event.calendarId, event.id, userId, calendarData);
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
                cEventItem.allDay = !!calendarEvent.isAllDay;
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

    function initDalendarModal(start, end) {
        // 檢查新增事件時，如果起始日期是當天，則使用當前的時間參數
        var startDateTime = (function isToday(dateTime) {
            var dateNow = new Date();
            if (dateTime.getFullYear() === dateNow.getFullYear() &&
                dateTime.getMonth() === dateNow.getMonth() &&
                dateTime.getDate() === dateNow.getDate()) {
                return true;
            }
            return false;
        })(start.toDate()) ? new Date() : start.toDate();

        var endDateTime = ('number' === typeof end) ? new Date(end) : end.toDate();
        var startDateTimePrev = new Date(startDateTime);
        var endDateTimePrev = new Date(endDateTime);

        $eventTitle.val('');
        $eventContent.val('');
        $eventIsAllday.off('change').prop('checked', false);
        sTimePickerData.date(startDateTime);
        eTimePickerData.date(endDateTime);

        // 日期選擇器日期變更時，將前一個時間記錄下來，以便取消全天時可以恢復前一個時間
        $calendarSdtPicker.off('dp.change').on('dp.change', function(ev) {
            if (!$eventIsAllday.prop('checked')) {
                startDateTimePrev = ev.date.toDate();
            }
        });

        $calendarEdtPicker.off('dp.change').on('dp.change', function(ev) {
            if (!$eventIsAllday.prop('checked')) {
                endDateTimePrev = ev.date.toDate();
            }
        });

        // 隱藏錯誤訊息
        $('#cal-error-msg').hide();
        $('#tim-error-msg').hide();

        $eventIsAllday.on('change', function(ev) {
            var dayBegin;
            var dayEnd;

            // 若使用者勾選全天項目，將時間調整成全天範圍
            // 取消全天的話恢復成原先的時間
            if (ev.target.checked) {
                dayBegin = new Date(start.toDate());
                dayEnd = new Date(start.toDate());
                dayBegin.setHours(0, 0, 0);
                dayEnd.setHours(23, 59, 59);
            } else {
                dayBegin = startDateTimePrev;
                dayEnd = endDateTimePrev;
            }

            sTimePickerData.date(dayBegin);
            eTimePickerData.date(dayEnd);
        });
    }

    /**
     * 檢查要傳至 server 的行事曆資料是否正確
     *
     * @param {*} calendarData
     */
    function calendarDataIsOK(calendarData) {
        if (!calendarData) {
            return false;
        }

        var $eventErrorMsg = $('#cal-error-msg');
        var $eventTimeErrorMsg = $('#tim-error-msg');
        $eventErrorMsg.hide();
        $eventTimeErrorMsg.hide();

        if (!calendarData.title || !calendarData.startTime || !calendarData.endTime) {
            $eventErrorMsg.show();
            return false;
        }

        // 結束時間不能早於開始時間
        if (calendarData.endTime < calendarData.startTime) {
            $eventTimeErrorMsg.show();
            return false;
        }

        return true;
    }

    /**
     * 確定新增或更改行事曆上的事件
     */
    function insertCalendarEvent(calendarData) {
        return api.calendar.insert(userId, calendarData).then(function(response) {
            $calendarModal.modal('hide');

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
    };

    function updateCalendarEvent(calendarEvent, calendarData) {
        // 根據事件型態來判斷發送不同 API 進行資料更新動作
        switch (calendarEvent.eventType) {
            case CalendarEventTypes.Ticket:
                // 將原本的 ticket 的資料原封不動複製一份，只更新建立時間與到期時間
                let tickerData = {
                    createdTime: calendarData.startTime,
                    description: calendarData.description,
                    dueTime: calendarData.endTime,
                    priority: calendarEvent.priority,
                    messagerId: calendarEvent.messagerId,
                    status: calendarEvent.status,
                    updatedTime: Date.now()
                };

                return api.ticket.update(calendarEvent.calendarId, calendarEvent.id, userId, tickerData).then(function(response) {
                    $calendar.fullCalendar('removeEvents', calendarEvent.id);
                    $calendarModal.modal('hide');

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
                return api.calendar.update(calendarEvent.calendarId, calendarEvent.id, userId, calendarData).then(function(response) {
                    $calendar.fullCalendar('removeEvents', calendarEvent.id);
                    $calendarModal.modal('hide');

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

    /**
     * 刪除行事曆上的事件
     *
     * @param {*} event - jquery UI 的 fullCalendar 元件的事件物件
     */
    function deleteCalendarEvent(event) { // 確定刪除事件
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
            $calendarModal.modal('hide');
        }).catch(function(error) {
            console.error(error);
        });
    }
})();
