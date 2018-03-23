/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var CalendarEventTypes = (function() {
        var definedType = {
            Calendar: 'C',
            Ticket: 'T',
            Google: 'G'
        };
        Object.freeze(definedType);
        return definedType;
    })();

    var CalendarEventTitles = (function() {
        var definedTitle = {
            CREATECALENDAR: '新增事件',
            UPDATECALENDAR: '檢視事件',
            UPDATETICKET: '檢視待辦事項'
        };
        Object.freeze(definedTitle);
        return definedTitle;
    })();

    var CalendarEventLabels = (function() {
        var definedLabel = {
            CALENDARSTARTEDTIME: '開始時間',
            CALENDARENDEDTIME: '結束時間',
            TICKETCREATEDTIME: '建立時間',
            TICKETENDEDTIME: '到期時間'
        };
        Object.freeze(definedLabel);
        return definedLabel;
    })();

    var CalendarEventItem = (function() {
        function CalendarEventItem(options) {
            options = options || {};
            // 目前只設定使用到的項目，並無全部都設定
            // 參考: https://fullcalendar.io/docs/event_data/Event_Object/
            this.calendarId = options.calendarId || '';
            this.id = options.id || '';
            this.eventType = CalendarEventTypes.Calendar;
            this.title = options.title || '';
            this.description = options.description || '';
            this.isAllDay = !!options.isAllDay;
            this.start = options.start || null;
            this.end = options.end || null;
            this.backup = options.backup || {};

            this.backgroundColor = '#90b5c7';
            this.borderColor = '#90b5c7';
            this.textColor = '#efefef';
        };

        return CalendarEventItem;
    })();

    var TicketEventItem = (function(extendBase) {
        function TicketEventItem(options) {
            options = options || {};
            extendBase.call(this, options);
            this.eventType = CalendarEventTypes.Ticket;
            this.backgroundColor = '#c7e6c7';
            this.borderColor = '#c7e6c7';
            this.textColor = '#6e6e6e';
        };
        TicketEventItem.prototype = Object.assign(TicketEventItem.prototype, extendBase.prototype);
        TicketEventItem.prototype.constructor = TicketEventItem;
        return TicketEventItem;
    })(CalendarEventItem);

    var GoogleEventItem = (function(extendBase) {
        function GoogleEventItem(options) {
            options = options || {};
            extendBase.call(this, options);
            this.eventType = CalendarEventTypes.Google;
            this.backgroundColor = '#468af5';
            this.borderColor = '#468af5';
            this.textColor = '#efeff0';
        };
        GoogleEventItem.prototype = Object.assign(GoogleEventItem.prototype, extendBase.prototype);
        GoogleEventItem.prototype.constructor = GoogleEventItem;
        return GoogleEventItem;
    })(CalendarEventItem);

    var calendarEventMap = {};
    var api = window.restfulAPI;
    var userId = '';

    var $calendar = $('#calendar');
    var $calendarModal = $('.modal.calendar-modal');
    var $calendarSdtPicker = $('#start_datetime_picker');
    var $calendarEdtPicker = $('#end_datetime_picker');
    var $calendarModalTitle = $calendarModal.find('.modal-title');
    var $calendarModalForm = $calendarModal.find('.input-wrapper');
    var $eventTitle = $calendarModalForm.find('input.event-title');
    var $eventContent = $calendarModalForm.find('textarea.event-content');
    var $eventIsAllday = $calendarModalForm.find('input#event_is_allday');
    var sTimePickerData = null;
    var eTimePickerData = null;

    var gCalendarPromise = window.googleClientHelper.loadAPI().then(function() {
        var url = window.googleCalendarHelper.configJsonUrl;
        return window.googleClientHelper.init(url);
    }).then(function(isSignedIn) {
        if (!isSignedIn) {
            return { items: [] };
        }
        return window.googleCalendarHelper.findEvents();
    });

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid; // 儲存全域用變數 userId
        calendarEventMap = {};

        var $addCalendarBtn = $('#add-cal-btn');
        var $saveCalendarBtn = $('#save-cal-btn');
        var $delCalendarBtn = $('#del-cal-btn');
        var $formCheckLabel = $('.form-check-label');
        var $startDatetime = $('[for="start_datetime"]');
        var $endDatetime = $('[for="end_datetime"]');
        var $startDatetimePicker = $('[name="start_datetime"]');
        var $endDatetimePicker = $('[name="end_datetime"]');
        var $eventContent = $('.event-content');

        // 初始化 modal 裡的 datetime picker
        // 使用 moment.js 的 locale 設定 i18n 日期格式
        var datetimePickerInitOpts = {
            sideBySide: true,
            locale: 'zh-tw'
        };
        $calendarSdtPicker.datetimepicker(datetimePickerInitOpts);
        $calendarEdtPicker.datetimepicker(datetimePickerInitOpts);
        sTimePickerData = $calendarSdtPicker.data('DateTimePicker');
        eTimePickerData = $calendarEdtPicker.data('DateTimePicker');

        // 初始化 fullCalendar 元件
        $calendar.addClass('chsr'); // 加入自訂的 css class 前綴
        $calendar.fullCalendar({
            locale: 'zh-tw',
            timezone: 'local',
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
            allDaySlot: false,
            // events is the main option for calendar.
            events: [],
            // execute after user select timeslots.
            select: function(start, end, jsEvent, view) { // 新增新事件
                var beginDate = start.toDate();
                beginDate.setHours(0, 0, 0, 0);
                var endDate = new Date(beginDate);
                endDate.setDate(endDate.getDate() + 1);
                updateCalendarModal(beginDate, endDate);

                $calendarModalTitle.text(CalendarEventTitles.CREATECALENDAR);
                $endDatetimePicker.parent().parent().show();
                $eventTitle.removeAttr('disabled');
                $formCheckLabel.attr('style', 'display: block');
                $startDatetimePicker.removeAttr('disabled');
                $endDatetimePicker.removeAttr('disabled');
                $eventIsAllday.removeAttr('disabled');
                $eventContent.removeAttr('disabled');

                // 新增行事曆事件處理，先 off 再 on 避免事件疊加
                $addCalendarBtn.off('click').on('click', function() {
                    var calendarData = {
                        title: $eventTitle.val(),
                        startedTime: sTimePickerData.date().toDate().getTime(),
                        endedTime: eTimePickerData.date().toDate().getTime(),
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
            eventClick: function(event) { // 更改事件
                var startDate = event.start.toDate();
                var endDate = event.end ? event.end.toDate() : startDate;
                updateCalendarModal(startDate, endDate);

                $eventTitle.val(event.title);
                $eventIsAllday.prop('checked', !!event.isAllDay);
                $eventContent.val(event.description);

                switch (event.eventType) {
                    case CalendarEventTypes.Ticket:
                        $calendarModalTitle.text(CalendarEventTitles.UPDATETICKET);
                        $delCalendarBtn.attr('style', 'display: none');
                        $formCheckLabel.hide();
                        $startDatetime.text(CalendarEventLabels.TICKETENDEDTIME);
                        $endDatetimePicker.parent().parent().hide();
                        $eventTitle.attr('disabled', true);
                        $startDatetimePicker.attr('disabled', true);
                        $endDatetimePicker.attr('disabled', true);
                        $eventIsAllday.attr('disabled', true);
                        $eventContent.attr('disabled', true);
                        break;
                    case CalendarEventTypes.Calendar:
                    default:
                        $calendarModalTitle.text(CalendarEventTitles.UPDATECALENDAR);
                        $delCalendarBtn.attr('style', '');
                        $formCheckLabel.attr('style', 'display: block');
                        $startDatetime.text(CalendarEventLabels.CALENDARSTARTEDTIME);
                        $endDatetime.text(CalendarEventLabels.CALENDARENDEDTIME);
                        $endDatetimePicker.parent().parent().show();
                        $eventTitle.removeAttr('disabled');
                        $startDatetimePicker.removeAttr('disabled');
                        $endDatetimePicker.removeAttr('disabled');
                        $eventIsAllday.removeAttr('disabled');
                        $eventContent.removeAttr('disabled');
                        break;
                }
                // 更新事件
                $saveCalendarBtn.off('click').on('click', function() {
                    var calendar = {
                        title: $eventTitle.val(),
                        startedTime: sTimePickerData.date().toDate().getTime(),
                        endedTime: eTimePickerData.date().toDate().getTime(),
                        description: $eventContent.val(),
                        isAllDay: $eventIsAllday.prop('checked') ? 1 : 0
                    };
                    updateCalendarEvent(event, calendar);
                });

                // 刪除事件
                $delCalendarBtn.off('click').on('click', function() {
                    deleteCalendarEvent(event);
                });

                // 按鈕顯示設定
                $addCalendarBtn.hide();
                $saveCalendarBtn.show();

                $calendar.fullCalendar('unselect');
                $calendarModal.modal('show'); // 顯示新增視窗
            },
            // execute after user drag and drop an event.
            eventDrop: function(event, delta, revertFunc) {
                var startDate = event.start.toDate();
                var endDate = event.end.toDate();

                var calendar = {
                    title: event.title,
                    description: event.description,
                    startedTime: startDate.getTime(),
                    endedTime: endDate.getTime(),
                    isAllDay: event.isAllDay ? 1 : 0
                };
                return updateCalendarEvent(event, calendar, false).catch(function() {
                    revertFunc();
                });
            },
            eventDurationEditable: true
        });

        return Promise.all([
            api.calendarsEvents.findAll(userId), // 取得所有的行事曆事件
            api.appsTickets.findAll('', userId), // 取得所有的待辦事項
            gCalendarPromise
        ]);
    }).then(function(resJsons) {
        var calendars = resJsons.shift().data;
        var calendarEventList = [];

        for (var calendarId in calendars) {
            var calendarEvents = calendars[calendarId].events;
            for (var eventId in calendarEvents) {
                var calendarEvent = calendarEvents[eventId];
                if (calendarEvent.isDeleted) {
                    continue; // 如果此行事曆事件已被刪除，則忽略不處理
                }

                var cEventItem = new CalendarEventItem({
                    calendarId: calendarId,
                    id: eventId,
                    title: calendarEvent.title,
                    description: calendarEvent.description,
                    isAllDay: calendarEvent.isAllDay,
                    start: new Date(calendarEvent.startedTime),
                    end: new Date(calendarEvent.endedTime),
                    backup: calendarEvent
                });
                calendarEventMap[cEventItem.id] = cEventItem;
                calendarEventList.push(cEventItem);
            }
        }

        var appTickets = resJsons.shift().data;
        for (var ticketAppId in appTickets) {
            var tickets = appTickets[ticketAppId].tickets;

            for (var ticketId in tickets) {
                var ticket = tickets[ticketId];
                if (ticket.isDeleted) {
                    continue;
                }

                // 由於待辦事項的資料項目與行事曆元件的數據項目不相同，因此需要進行轉換
                var tEventItem = new TicketEventItem({
                    calendarId: ticketAppId,
                    id: ticketId,
                    // 待辦事項的標題以描述的前10個字顯示之
                    title: ticket.description.length > 10 ? ticket.description.substring(0, 10) : ticket.description,
                    description: ticket.description,
                    isAllDay: false,
                    start: new Date(ticket.dueTime),
                    end: new Date(ticket.dueTime),
                    backup: ticket
                });
                calendarEventMap[tEventItem.id] = tEventItem;
                calendarEventList.push(tEventItem);
            }
        }

        var gCalendar = resJsons.shift();
        for (var gEventIdx in gCalendar.items) {
            var googleEvent = gCalendar.items[gEventIdx];
            var isAllDay = !!(googleEvent.start.date && googleEvent.end.date);
            var startDate = isAllDay ? new Date(googleEvent.start.date) : new Date(googleEvent.start.dateTime);
            isAllDay && startDate.setHours(0, 0, 0, 0);
            var endDate = isAllDay ? new Date(googleEvent.end.date) : new Date(googleEvent.end.dateTime);
            isAllDay && endDate.setHours(0, 0, 0, 0);

            var gEventItem = new GoogleEventItem({
                // calendarId: googleEvent.iCalUID,
                calendarId: 'primary',
                id: googleEvent.id,
                title: googleEvent.summary,
                description: googleEvent.description,
                isAllDay: isAllDay,
                start: startDate,
                end: endDate,
                backup: googleEvent
            });
            calendarEventMap[gEventItem.id] = gEventItem;
            calendarEventList.push(gEventItem);
        }

        calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
    }).catch(function(error) {
        console.trace(error);
    });

    function updateCalendarModal(start, end) {
        var preventPickerChange = false;
        var startDateTimePrev = new Date(start);

        $eventTitle.val('');
        $eventContent.val('');
        $eventIsAllday.off('change').prop('checked', false);
        sTimePickerData.date(start);

        // 日期選擇器日期變更時，將前一個時間記錄下來，以便取消全天時可以恢復前一個時間
        $calendarSdtPicker.off('dp.change').on('dp.change', function(ev) {
            if (preventPickerChange) {
                return;
            }

            if (!$eventIsAllday.prop('checked')) {
                startDateTimePrev = ev.date.toDate();
            }
            $eventIsAllday.prop('checked', false);
        });

        if (end) {
            var endDateTimePrev = new Date(end);
            eTimePickerData.date(end);
            $calendarEdtPicker.off('dp.change').on('dp.change', function(ev) {
                if (preventPickerChange) {
                    return;
                }

                if (!$eventIsAllday.prop('checked')) {
                    endDateTimePrev = ev.date.toDate();
                }
                $eventIsAllday.prop('checked', false);
            });
        }

        // 隱藏錯誤訊息
        $('#cal-error-msg').hide();
        $('#tim-error-msg').hide();

        $eventIsAllday.on('change', function(ev) {
            var dayBegin;
            var dayEnd;

            // 若使用者勾選全天項目，將時間調整成全天範圍
            // 取消全天的話恢復成原先的時間
            if (ev.target.checked) {
                dayBegin = new Date(start);
                dayBegin.setHours(0, 0, 0, 0);
                dayEnd = new Date(dayBegin);
                dayEnd.setDate(dayEnd.getDate() + 1);
            } else {
                dayBegin = startDateTimePrev;
                dayEnd = endDateTimePrev;
            }

            preventPickerChange = true;
            sTimePickerData.date(dayBegin);
            eTimePickerData.date(dayEnd);
            preventPickerChange = false;
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

        if (!calendarData.title || !calendarData.startedTime || !calendarData.endedTime) {
            $eventErrorMsg.show();
            return false;
        }

        // 開始時間需早於結束時間
        if (calendarData.startedTime > calendarData.endedTime) {
            $eventTimeErrorMsg.show();
            return false;
        }

        return true;
    }

    /**
     * 確定新增或更改行事曆上的事件
     */
    function insertCalendarEvent(calendarData) {
        return api.calendarsEvents.insert(userId, calendarData).then(function(response) {
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
                    eventItem.start = new Date(event.startedTime);
                    eventItem.end = new Date(event.endedTime);
                    eventItem.calendarId = calendarId;
                    eventItem.id = eventId;
                    calendarEventMap[eventItem.id] = eventItem;
                    calendarEventList.push(eventItem);
                }
            }
            calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
        }).catch(function(error) {
            console.trace(error);
        });
    };

    function updateCalendarEvent(event, calendar, shouldReRender) {
        if (calendar.startedTime > calendar.endedTime) {
            $.notify('開始時間需早於結束時間', { type: 'warning' });
            return;
        }

        if (undefined === shouldReRender) {
            shouldReRender = true;
        }
        shouldReRender = !!shouldReRender;

        var calendarId = event.calendarId;
        var eventId = event.id;

        // 根據事件型態來判斷發送不同 API 進行資料更新動作
        switch (event.eventType) {
            case CalendarEventTypes.Calendar:
                return api.calendarsEvents.update(calendarId, eventId, userId, calendar).then(function(res) {
                    $calendarModal.modal('hide');
                    if (!shouldReRender) {
                        return;
                    }
                    $calendar.fullCalendar('removeEvents', eventId);

                    // 更新完之後行事曆事件後，將回傳的資訊更新至 UI
                    var calendars = res.data;
                    var calendar = calendars[calendarId];
                    var updatedEvent = calendar.events[eventId];

                    var eventItem = new CalendarEventItem({
                        calendarId: calendarId,
                        id: eventId,
                        title: updatedEvent.title,
                        description: updatedEvent.description,
                        start: new Date(updatedEvent.startedTime),
                        end: new Date(updatedEvent.endedTime),
                        backup: updatedEvent
                    });
                    calendarEventMap[eventItem.id] = eventItem;
                    $calendar.fullCalendar('renderEvent', eventItem, true);
                });
            case CalendarEventTypes.Ticket:
                // 將原本的 ticket 的資料原封不動複製一份，只更新建立時間與到期時間
                var ticket = {
                    description: calendar.description,
                    dueTime: calendar.endedTime
                };

                return api.appsTickets.update(calendarId, eventId, userId, ticket).then(function(res) {
                    $calendarModal.modal('hide');
                    if (!shouldReRender) {
                        return;
                    }
                    $calendar.fullCalendar('removeEvents', eventId);
                    var appsTickets = res.data[calendarId];
                    var updatedTicket = appsTickets.tickets[eventId];

                    var eventItem = new TicketEventItem({
                        calendarId: calendarId,
                        id: eventId,
                        // 待辦事項的標題以描述的前10個字顯示之
                        title: updatedTicket.description.length > 10 ? updatedTicket.description.substring(0, 10) : updatedTicket.description,
                        description: updatedTicket.description,
                        start: new Date(updatedTicket.dueTime),
                        end: new Date(updatedTicket.dueTime),
                        backup: updatedTicket
                    });
                    calendarEventMap[eventItem.id] = eventItem;
                    $calendar.fullCalendar('renderEvent', eventItem, true);
                });
            case CalendarEventTypes.Google:
                var dateFormatOpts = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                };

                var gEvent = {
                    summary: calendar.title,
                    description: calendar.description,
                    start: {
                        date: calendar.isAllDay ? new Date(calendar.startedTime).toLocaleDateString('zh', dateFormatOpts).replace(/\//g, '-') : void 0,
                        dateTime: !calendar.isAllDay ? new Date(calendar.startedTime).toJSON() : void 0
                    },
                    end: {
                        date: calendar.isAllDay ? new Date(calendar.endedTime).toLocaleDateString('zh', dateFormatOpts).replace(/\//g, '-') : void 0,
                        dateTime: !calendar.isAllDay ? new Date(calendar.endedTime).toJSON() : void 0
                    }
                };

                return window.googleCalendarHelper.updateEvent('primary', eventId, gEvent).then(function(res) {
                    $calendarModal.modal('hide');
                    if (!shouldReRender) {
                        return;
                    }
                    $calendar.fullCalendar('removeEvents', eventId);

                    var googleEvent = res;
                    var isAllDay = !!(googleEvent.start.date && googleEvent.end.date);
                    var startDate = isAllDay ? new Date(googleEvent.start.date) : new Date(googleEvent.start.dateTime);
                    isAllDay && startDate.setHours(0, 0, 0, 0);
                    var endDate = isAllDay ? new Date(googleEvent.end.date) : new Date(googleEvent.end.dateTime);
                    isAllDay && endDate.setHours(0, 0, 0, 0);

                    var eventItem = new GoogleEventItem({
                        calendarId: googleEvent.iCalUID,
                        id: eventId,
                        title: googleEvent.summary,
                        description: googleEvent.description,
                        start: startDate,
                        end: endDate,
                        backup: googleEvent
                    });
                    calendarEventMap[eventItem.id] = eventItem;
                    $calendar.fullCalendar('renderEvent', eventItem, true);
                });
            default:
                return Promise.reject(new Error('UNKNOWN_EVENT_TYPE'));
        }
    }

    /**
     * 刪除行事曆上的事件
     */
    function deleteCalendarEvent(event) { // 確定刪除事件
        var calendarId = event.calendarId;
        var eventId = event.id;

        return Promise.resolve().then(function() {
            switch (event.eventType) {
                case CalendarEventTypes.Calendar:
                    return api.calendarsEvents.remove(calendarId, eventId, userId);
                case CalendarEventTypes.Ticket:
                    return api.appsTickets.remove(calendarId, eventId, userId);
                case CalendarEventTypes.Google:
                    return window.googleCalendarHelper.deleteEvent(calendarId, eventId);
                default:
                    return Promise.reject(new Error('UNKNOWN_EVENT_TYPE'));
            }
        }).then(function() {
            $calendar.fullCalendar('removeEvents', eventId);
            $calendarModal.modal('hide');
        }).catch(function(error) {
            console.trace(error);
        });
    }
})();
