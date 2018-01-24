/**
 * 宣告專門處理 Calendar 相關的 API 類別
 */
var CalendarAPI = (function() {
    let responseChecking = function(response) {
        return Promise.resolve().then(() => {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then((respJson) => {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    let calendarAPI = function(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得使用者所有的 calendar 事件
     *
     * @param {string} userId - 使用者的 firebase id
     */
    calendarAPI.prototype.getAll = function(userId) {
        let destUrl = urlConfig.apiUrl + '/api/calendars-events/users/' + userId;
        let reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 插入一筆 calendar 事件
     *
     * @param {string} calendarId - 識別不同行事曆的 ID
     * @param {string} userId - 使用者的 firebase ID
     * @param {*} data - 要進行插入的 calendar 事件資料
     */
    calendarAPI.prototype.insert = function(userId, data) {
        let destUrl = urlConfig.apiUrl + '/api/calendars-events/users/' + userId;
        let reqInit = {
            method: 'POST',
            headers: this.reqHeaders,
            body: JSON.stringify(data)
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 更新一筆指定的 calendar 事件
     *
     * @param {string} calendarId - 識別不同行事曆的 ID
     * @param {string} eventId - calendar 的事件ID
     * @param {string} userId - 使用者的 firebase ID
     * @param {*} data - 要進行更新的 calendar 事件資料
     */
    calendarAPI.prototype.update = function(calendarId, eventId, userId, data) {
        let destUrl = urlConfig.apiUrl + '/api/calendars-events/calendars/' + calendarId + '/events/' + eventId + '/users/' + userId;
        let reqInit = {
            method: 'PUT',
            headers: this.reqHeaders,
            body: JSON.stringify(data)
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 移除一筆指定的 calendar 事件
     *
     * @param {string} calendarId - 識別不同行事曆的 ID
     * @param {string} eventId - calendar 的事件ID
     * @param {string} userId - 要進行更新的 calendar 事件資料
     */
    calendarAPI.prototype.remove = function(calendarId, eventId, userId) {
        let destUrl = urlConfig.apiUrl + '/api/calendars-events/calendars/' + calendarId + '/events/' + eventId + '/users/' + userId;
        let reqInit = {
            method: 'DELETE',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    return calendarAPI;
})();

/**
 * 宣告專門處理 Ticket 相關的 API 類別
 */
var TicketAPI = (function() {
    let responseChecking = function(response) {
        return Promise.resolve().then(() => {
            if (!response.ok) {
                return Promise.reject(new Error(response.status + ' ' + response.statusText));
            }
            return response.json();
        }).then((respJson) => {
            if (1 !== respJson.status) {
                return Promise.reject(new Error(respJson.status + ' ' + respJson.msg));
            }
            return respJson;
        });
    };

    /**
     * TicketAPI 建構子
     *
     * @param {*} jwt - API 傳輸時必須攜帶的 json web token
     */
    let ticketAPI = function(jwt) {
        this.jwt = jwt || '';
        this.reqHeaders = new Headers();
        this.reqHeaders.set('Content-Type', 'application/json');
    };

    /**
     * 取得使用者所有設定待辦事項
     *
     * @param {string} userId - 使用者的 firebase ID
     */
    ticketAPI.prototype.getAll = function(userId) {
        let destUrl = urlConfig.apiUrl + '/api/apps-tickets/users/' + userId;
        let reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 取得使用者某一個 App 的待辦事項
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} userId - 使用者的 firebase ID
     */
    ticketAPI.prototype.getOne = function(ticketAppId, userId) {
        let destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/users/' + userId;
        let reqInit = {
            method: 'GET',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 新增一筆待辦事項資料
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} userId - 使用者的 firebase ID
     * @param {*} newTicketData - 欲新增的待辦事項資料
     */
    ticketAPI.prototype.insert = function(ticketAppId, userId, newTicketData) {
        let destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/users/' + userId;
        let reqInit = {
            method: 'POST',
            headers: this.reqHeaders,
            body: JSON.stringify(newTicketData)
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 更新目標待辦事項資料
     *
     * @param {*} ticketAppId - 目標待辦事項的 App ID
     * @param {*} ticketId - 目標待辦事項的 ID
     * @param {*} userId - 使用者的 firebase ID
     * @param {*} modifiedTicketData - 已編輯後欲更新的待辦事項資料
     */
    ticketAPI.prototype.update = function(ticketAppId, ticketId, userId, modifiedTicketData) {
        let destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/tickets/' + ticketId + '/users/' + userId;
        let reqInit = {
            method: 'PUT',
            headers: this.reqHeaders,
            body: JSON.stringify(modifiedTicketData)
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    /**
     * 刪除一筆待辦事項資料
     *
     * @param {string} ticketAppId - 目標待辦事項的 App ID
     * @param {string} ticketId - 目標待辦事項的 ID
     * @param {string} userId - 使用者的 firebase ID
     */
    ticketAPI.prototype.remove = function(ticketAppId, ticketId, userId) {
        let destUrl = urlConfig.apiUrl + '/api/apps-tickets/apps/' + ticketAppId + '/tickets/' + ticketId + '/users/' + userId;
        let reqInit = {
            method: 'DELETE',
            headers: this.reqHeaders
        };

        return window.fetch(destUrl, reqInit).then((response) => {
            return responseChecking(response);
        });
    };

    return ticketAPI;
})();

(function() {
    var CalendarEventItem = (function() {
        var calendarEventItem = function() {
            // 目前只設定使用到的項目，並無全部都設定
            // 參考: https://fullcalendar.io/docs/event_data/Event_Object/
            this.isAllDay = false;
            this.description = '';
            this.end = null;
            this.id = '';
            this.eventType = 'C';
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
            this.eventType = 'T';
            this.backgroundColor = '#c7e6c7';
            this.borderColor = '#c7e6c7';
            this.textColor = '#6e6e6e';
        };
        ticketEventItem.prototype = Object.assign(ticketEventItem.prototype, extendBase.prototype);
        ticketEventItem.prototype.constructor = ticketEventItem;
        return ticketEventItem;
    })(CalendarEventItem);

    var calendarEventMap = {};
    var userId;
    // var avoidRemindAgain;
    // var socket = io.connect();
    var calendarAPI = new CalendarAPI(null);
    var ticketAPI = new TicketAPI(null);

    var $jqDoc = $(document);
    var $calendar = null;

    auth.ready.then((currentUser) => {
        calendarAPI.jwt = ticketAPI.jwt = window.localStorage.getItem('jwt');
        calendarAPI.reqHeaders.set('Authorization', calendarAPI.jwt);
        ticketAPI.reqHeaders.set('Authorization', ticketAPI.jwt);

        return new Promise((resolve) => {
            $jqDoc.ready(() => {
                resolve(currentUser);
            });
        });
    }).then((currentUser) => {
        userId = currentUser.uid; // 儲存全域用變數 userId

        let $addCalendarBtn = $('#add-cal-btn');
        let $saveCalendarBtn = $('#save-cal-btn');
        let $delCalendarBtn = $('#del-cal-btn');

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
                let $titleElem = $('#title');
                $titleElem.val(event.title);
                // 屬於待辦事項的資料 Title 僅顯示用不允許編輯
                'T' === event.eventType && $titleElem.prop('disabled', true);

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
                let timeGap = delta.asMilliseconds();
                let start = Date.parse(event.start._i);
                start = ISODateTimeString(start + timeGap).date + 'T' + ISODateTimeString(start + timeGap).time;
                let end = Date.parse(event.end._i);
                end = ISODateTimeString(end + timeGap).date + 'T' + ISODateTimeString(end + timeGap).time;

                let data = {
                    title: event.title,
                    startTime: start,
                    endTime: end,
                    description: event.description,
                    isAllDay: event.allDay
                };
                return calendarAPI.update(event.calendarId, event.id, userId, data);
            },
            eventDurationEditable: true
        });
        return calendarAPI.getAll(userId);
    }).then((response) => {
        let allAppEvents = response.data;
        let calendarEventList = [];

        for (let calendarId in allAppEvents) {
            for (let eventId in allAppEvents[calendarId].events) {
                let calendarEvent = allAppEvents[calendarId].events[eventId];
                if (calendarEvent.isDeleted) {
                    continue; // 如果此行事曆事件已被刪除，則忽略不處理
                }
                let eventItem = new CalendarEventItem();
                eventItem = Object.assign(eventItem, calendarEvent);
                eventItem.allDay = calendarEvent.isAllDay;
                eventItem.description = calendarEvent.description;
                eventItem.end = new Date(calendarEvent.endTime);
                eventItem.start = new Date(calendarEvent.startTime);
                eventItem.title = calendarEvent.title;
                eventItem.calendarId = calendarId;
                eventItem.id = eventId;
                calendarEventMap[eventItem.id] = eventItem;
                calendarEventList.push(eventItem);
            }
        }
        calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
    }).then(() => {
        // 取得所有的待辦事項，將之顯示於行事曆上
        return ticketAPI.getAll(userId);
    }).then((json) => {
        let allAppTickets = json.data;
        let calendarEventList = [];

        for (let ticketAppId in allAppTickets) {
            for (let ticketId in allAppTickets[ticketAppId].tickets) {
                let ticket = allAppTickets[ticketAppId].tickets[ticketId];
                if (ticket.isDeleted) {
                    continue;
                }

                // 由於待辦事項的資料項目與行事曆元件的數據項目不相同，因此需要進行轉換
                let eventItem = new TicketEventItem();
                eventItem = Object.assign(eventItem, ticket);
                eventItem.allDay = false;
                eventItem.description = ticket.description;
                eventItem.end = new Date(ticket.dueBy);
                eventItem.start = new Date(ticket.createdTime);
                // 待辦事項的標題以描述的前10個字顯示之
                eventItem.title = ticket.description.length > 10 ? ticket.description.substring(0, 10) : ticket.description;
                eventItem.calendarId = ticketAppId;
                eventItem.id = ticketId;
                calendarEventMap[eventItem.id] = eventItem;
                calendarEventList.push(eventItem);
            }
        }
        calendarEventList.length > 0 && $calendar.fullCalendar('renderEvents', calendarEventList, true);
    }).catch((error) => {
        console.error(error);
    });

    /**
     * 確定新增或更改行事曆上的事件
     *
     * @param {*} event - jquery UI 的 fullCalendar 元件的事件物件
     */
    function setCalendar(event) {
        let title = $('#title').val();
        let startDate = $('#startDate').val() + 'T' + $('#startTime').val(); // 把user輸入的日期和時間串起來
        let endDate = $('#endDate').val() + 'T' + $('#endTime').val();

        let description = $('#description').val();
        let isAllDay = $('#allday').prop('checked');

        let isDataOK = true;
        if (!title || !startDate || !endDate) {
            $('#cal-error-msg').show();
            isDataOK = false;
        } else {
            $('#cal-error-msg').hide();
        }

        // start time error
        let currentDate = new Date();

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

        let eventData = {
            title: title,
            startTime: new Date(startDate).getTime(),
            endTime: new Date(endDate).getTime(),
            description: description,
            isAllDay: isAllDay
        };

        if (!event) { // 若沒有輸入事件，代表為新增行事曆事件的處理
            return calendarAPI.insert(userId, eventData).then((response) => {
                clearInputs();
                $('#calendar-modal').modal('hide');

                let calendarEventList = [];
                let allCalendars = response.data;
                for (let calendarId in allCalendars) {
                    for (let eventId in allCalendars[calendarId].events) {
                        let event = allCalendars[calendarId].events[eventId];
                        if (event.isDeleted) {
                            continue;
                        }

                        let eventItem = new CalendarEventItem();
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
            }).catch((error) => {
                console.log(error);
                alert('post error');
            });
        } else { // 更改事件
            // 根據事件型態來判斷發送不同 API 進行資料更新動作
            switch (event.eventType) {
                case 'T':
                    // 將原本的 ticket 的資料原封不動複製一份，只更新建立時間與到期時間
                    let tickerData = {
                        ccEmails: event.ccEmails,
                        createdTime: eventData.startTime,
                        description: description,
                        dueBy: eventData.endTime,
                        frDueBy: event.frDueBy,
                        frEscalated: event.frEscalated,
                        fwdEmails: event.fwdEmails,
                        isEscalated: event.isEscalated,
                        priority: event.priority,
                        replyCcEmails: event.replyCcEmails,
                        requester: event.requester,
                        requesterId: event.requesterId,
                        spam: event.spam,
                        status: event.status,
                        subject: event.title,
                        toEmails: event.toEmails,
                        type: event.type,
                        updatedTime: new Date().getTime()
                    };

                    return ticketAPI.update(event.calendarId, event.id, userId, tickerData).then((response) => {
                        $calendar.fullCalendar('removeEvents', event.id);
                        clearInputs();
                        $('#calendar-modal').modal('hide');

                        let eventItem = new TicketEventItem();
                        eventItem = Object.assign(eventItem, tickerData);
                        eventItem.allDay = false;
                        eventItem.description = tickerData.description;
                        eventItem.end = new Date(tickerData.dueBy);
                        eventItem.start = new Date(tickerData.createdTime);
                        // 待辦事項的標題以描述的前10個字顯示之
                        eventItem.title = tickerData.description.length > 10 ? tickerData.description.substring(0, 10) : tickerData.description;
                        eventItem.calendarId = event.calendarId;
                        eventItem.id = event.id;
                        calendarEventMap[eventItem.id] = eventItem;
                        $calendar.fullCalendar('renderEvent', eventItem, true);
                    });
                default:
                    return calendarAPI.update(event.calendarId, event.id, userId, eventData).then((response) => {
                        $calendar.fullCalendar('removeEvents', event.id);
                        clearInputs();
                        $('#calendar-modal').modal('hide');

                        let calendarEventList = [];
                        let allCalendars = response.data;
                        for (let calendarId in allCalendars) {
                            for (let eventId in allCalendars[calendarId].events) {
                                let event = allCalendars[calendarId].events[eventId];
                                if (event.isDeleted) {
                                    continue;
                                }

                                let eventItem = new CalendarEventItem();
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
                    }).catch(() => {
                        alert('edit error');
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
        return Promise.resolve().then(() => {
            switch (event.eventType) {
                case 'T':
                    return ticketAPI.remove(event.calendarId, event.id, userId);
                default:
                    return calendarAPI.remove(event.calendarId, event.id, userId);
            }
        }).then(() => {
            $calendar.fullCalendar('removeEvents', event.id);
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
