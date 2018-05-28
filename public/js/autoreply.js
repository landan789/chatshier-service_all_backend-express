/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var appsAutoreplies = {};
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var $autoreplyAddModal = $('#autoreplyAddModal');
    var $autoreplyAddSdtPicker = $autoreplyAddModal.find('#startDatetimePicker');
    var $autoreplyAddEdtPicker = $autoreplyAddModal.find('#endDatetimePicker');
    var $autoreplyAddStPicker = $autoreplyAddModal.find('#startTimePicker');
    var $autoreplyAddEtPicker = $autoreplyAddModal.find('#endTimePicker');

    var $autoreplyEditModal = $('#autoreplyEditModal');
    var $autoreplyEditSdtPicker = $autoreplyEditModal.find('#startDatetimePicker');
    var $autoreplyEditEdtPicker = $autoreplyEditModal.find('#endDatetimePicker');
    var $autoreplyEditStPicker = $autoreplyEditModal.find('#startTimePicker');
    var $autoreplyEditEtPicker = $autoreplyEditModal.find('#endTimePicker');

    var api = window.restfulAPI;
    var nowSelectAppId = '';

    var NO_PERMISSION_CODE = '3.16';
    var MAX_CHATSHIER_UNIX_TIME = 4701945599000;

    var DAYS_TEXT = ['日', '一', '二', '三', '四', '五', '六'];

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }
    $autoreplyAddModal.on('click', '#addSubmitBtn', autoreplyInsert);
    $autoreplyEditModal.on('click', '#editSubmitBtn', autoreplyUpdate);
    $(document).on('click', '#edit-btn', openEdit); // 打開編輯modal
    $(document).on('click', '#delete-btn', autoreplyRemove); // 刪除
    $(document).on('change paste keyup', '.search-bar', dataSearch);

    $autoreplyAddModal.find('.form-check-input[name="dateType"]').on('change', function(ev) {
        var checkInputVal = ev.target.value;

        switch (checkInputVal) {
            case 'PERIODS':
                $autoreplyAddModal.find('#timeSelectGroup').removeClass('d-none');
                $autoreplyAddModal.find('#dateSelectGroup').addClass('d-none');
                break;
            case 'RANGE_DATE':
            default:
                $autoreplyAddModal.find('#timeSelectGroup').addClass('d-none');
                $autoreplyAddModal.find('#dateSelectGroup').removeClass('d-none');
                break;
        }
    });

    $autoreplyEditModal.find('.form-check-input[name="dateType"]').on('change', function(ev) {
        var checkInputVal = ev.target.value;

        switch (checkInputVal) {
            case 'PERIODS':
                $autoreplyEditModal.find('#timeSelectGroup').removeClass('d-none');
                $autoreplyEditModal.find('#dateSelectGroup').addClass('d-none');
                break;
            case 'RANGE_DATE':
            default:
                $autoreplyEditModal.find('#timeSelectGroup').addClass('d-none');
                $autoreplyEditModal.find('#dateSelectGroup').removeClass('d-none');
                break;
        }
    });

    if (!window.isMobileBrowser()) {
        var datetimePickerInitOpts = {
            sideBySide: true,
            locale: 'zh-tw',
            defaultDate: Date.now(),
            icons: {
                time: 'far fa-clock',
                date: 'far fa-calendar-alt',
                up: 'fas fa-chevron-up',
                down: 'fas fa-chevron-down',
                previous: 'fas fa-chevron-left',
                next: 'fas fa-chevron-right',
                today: 'fas fa-sun',
                clear: 'far fa-trash-alt',
                close: 'fas fa-times'
            }
        };
        $autoreplyAddSdtPicker.datetimepicker(datetimePickerInitOpts);
        $autoreplyAddEdtPicker.datetimepicker(datetimePickerInitOpts);

        delete datetimePickerInitOpts.defaultDate;
        $autoreplyEditSdtPicker.datetimepicker(datetimePickerInitOpts);
        $autoreplyEditEdtPicker.datetimepicker(datetimePickerInitOpts);

        var timePickerInitOpts = {
            format: 'HH:mm',
            locale: datetimePickerInitOpts.locale,
            icons: datetimePickerInitOpts.icons
        };
        $autoreplyAddStPicker.datetimepicker(timePickerInitOpts);
        $autoreplyAddEtPicker.datetimepicker(timePickerInitOpts);
        $autoreplyEditStPicker.datetimepicker(timePickerInitOpts);
        $autoreplyEditEtPicker.datetimepicker(timePickerInitOpts);

        $autoreplyAddModal.on('show.bs.modal', function() {
            var resetDate = new Date();
            var timezoneOffset = resetDate.getTimezoneOffset();

            $autoreplyAddSdtPicker.data('DateTimePicker').date(resetDate);
            $autoreplyAddEdtPicker.data('DateTimePicker').clear();

            resetDate.setHours(0, 0, 0, 0);
            $autoreplyAddStPicker.data('DateTimePicker').date(resetDate);
            $autoreplyAddEtPicker.data('DateTimePicker').date(resetDate);

            $autoreplyAddModal.find('.schedule-day').addClass('active');
            $autoreplyAddModal.find('#repeatText').text('全部');
            $autoreplyAddModal.find('select[name="timezoneOffset"]').val(timezoneOffset);
            $autoreplyAddModal.find('.form-check-input[name="dateType"][value="RANGE_DATE"]').trigger('click');
        });

        $autoreplyAddModal.on('click', '.schedule-day', function(ev) {
            $(ev.target).toggleClass('active');
            var $scheduleDays = $autoreplyAddModal.find('.schedule-day.active');
            var daysText = [];
            $scheduleDays.each((i) => daysText.push($scheduleDays[i].textContent));
            $autoreplyAddModal.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
        });

        $autoreplyEditModal.on('click', '.schedule-day', function(ev) {
            $(ev.target).toggleClass('active');
            var $scheduleDays = $autoreplyEditModal.find('.schedule-day.active');
            var daysText = [];
            $scheduleDays.each((i) => daysText.push($scheduleDays[i].textContent));
            $autoreplyEditModal.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
        });
    } else {
        var $autoreplyAddSdtInput = $autoreplyAddSdtPicker.find('input[name="startDatetime"]');
        var $autoreplyAddEdtInput = $autoreplyAddEdtPicker.find('input[name="endDatetime"]');
        var $autoreplyAddStInput = $autoreplyAddStPicker.find('input[name="startTime"]');
        var $autoreplyAddEtInput = $autoreplyAddEtPicker.find('input[name="endTime"]');
        var $autoreplyEditSdtInput = $autoreplyEditSdtPicker.find('input[name="startDatetime"]');
        var $autoreplyEditEdtInput = $autoreplyEditEdtPicker.find('input[name="endDatetime"]');
        var $autoreplyEditStInput = $autoreplyEditStPicker.find('input[name="startTime"]');
        var $autoreplyEditEtInput = $autoreplyEditEtPicker.find('input[name="endTime"]');

        $autoreplyAddSdtInput.attr('type', 'datetime-local');
        $autoreplyAddEdtInput.attr('type', 'datetime-local');
        $autoreplyAddStInput.attr('type', 'time');
        $autoreplyAddEtInput.attr('type', 'time');
        $autoreplyEditSdtInput.attr('type', 'datetime-local');
        $autoreplyEditEdtInput.attr('type', 'datetime-local');
        $autoreplyEditStInput.attr('type', 'time');
        $autoreplyEditEtInput.attr('type', 'time');

        $autoreplyAddSdtPicker.on('click', '.input-group-prepend', () => $autoreplyAddSdtInput.focus());
        $autoreplyAddEdtPicker.on('click', '.input-group-prepend', () => $autoreplyAddEdtInput.focus());
        $autoreplyAddStPicker.on('click', '.input-group-prepend', () => $autoreplyAddStInput.focus());
        $autoreplyAddEtPicker.on('click', '.input-group-prepend', () => $autoreplyAddEtInput.focus());
        $autoreplyEditSdtPicker.on('click', '.input-group-prepend', () => $autoreplyEditSdtInput.focus());
        $autoreplyEditEdtPicker.on('click', '.input-group-prepend', () => $autoreplyEditEdtInput.focus());

        $autoreplyAddModal.on('show.bs.modal', function() {
            var resetDate = new Date();
            var timezoneOffset = resetDate.getTimezoneOffset();

            $autoreplyAddSdtInput.val(toDatetimeLocal(resetDate));
            $autoreplyAddEdtInput.val('');

            resetDate.setHours(0, 0, 0, 0);
            $autoreplyAddStInput.val(formatTime(resetDate, false));
            $autoreplyAddEtInput.val(formatTime(resetDate, false));

            $autoreplyAddModal.find('.schedule-day').addClass('active');
            $autoreplyAddModal.find('#repeatText').text('全部');
            $autoreplyAddModal.find('select[name="timezoneOffset"]').val(timezoneOffset);
            $autoreplyAddModal.find('.form-check-input[name="dateType"][value="RANGE_DATE"]').trigger('click');
        });
    }

    return api.apps.findAll(userId).then(function(respJson) {
        var apps = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete apps[appId];
                continue;
            }
            $dropdownMenu.append('<a class="dropdown-item" id="' + appId + '">' + app.name + '</a>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');

            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            loadAutoreplies(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadAutoreplies(nowSelectAppId, userId);
    }

    function loadAutoreplies(appId, userId) {
        $('#autoreply-tables').empty();
        return api.appsAutoreplies.findAll(appId, userId).then(function(resJson) {
            appsAutoreplies = resJson.data;
            if (!(appsAutoreplies && appsAutoreplies[appId])) {
                return;
            }

            var autoreplies = appsAutoreplies[appId].autoreplies;
            for (var autoreplyId in autoreplies) {
                $('#autoreply-tables').append(generateAutoreplyRow(appId, autoreplyId));
            }
        });
    }

    function generateAutoreplyRow(appId, autoreplyId) {
        var autoreplies = appsAutoreplies[appId].autoreplies;
        var autoreply = autoreplies[autoreplyId];
        return (
            '<tr app-id="' + appId + '" autoreply-id="' + autoreplyId + '">' +
                '<td class="mb-2" data-title="' + autoreply.title + '">' + autoreply.title + '</td>' +
                (function() {
                    if (autoreply.periods && autoreply.periods.length > 0) {
                        var startedTimeDays = [];
                        var endedTimeDays = [];

                        autoreply.periods.forEach((period) => {
                            var days = period.days || [];
                            if (0 === days.length) {
                                return;
                            }

                            var activatedDays = [];
                            for (let i in days) {
                                activatedDays.push(DAYS_TEXT[days[i].day]);
                            }

                            let timezoneOffset = parseInt(period.timezoneOffset, 10);
                            let offsetText = 'GMT ' + (timezoneOffset >= 0 ? '-' : '+') + (-period.timezoneOffset / 60).toFixed(0);
                            startedTimeDays.push(activatedDays.join(' ') + '\n' + days[0].startedTime + ' ' + offsetText);
                            endedTimeDays.push(activatedDays.join(' ') + '\n' + days[0].endedTime + ' ' + offsetText);
                        });

                        return (
                            '<td class="text-pre">' + startedTimeDays.join('\n') + '</td>' +
                            '<td class="text-pre">' + endedTimeDays.join('\n') + '</td>'
                        );
                    }

                    return (
                        '<td>' + new Date(autoreply.startedTime).toLocaleString() + '</td>' +
                        '<td>' + new Date(autoreply.endedTime).toLocaleString() + '</td>'
                    );
                })() +
                '<td data-title="' + autoreply.text + '">' + autoreply.text + '</td>' +
                '<td>' +
                    '<button type="button" class="mb-1 mr-1 btn btn-border btn-light update" id="edit-btn" data-toggle="modal" data-target="#autoreplyEditModal" aria-hidden="true">' +
                        '<i class="fas fa-edit"></i>' +
                    '</button>' +
                    '<button type="button" class="mb-1 mr-1 btn btn-danger remove" id="delete-btn">' +
                        '<i class="fas fa-trash-alt"></i>' +
                    '</button>' +
                '</td>' +
            '</tr>'
        );
    }

    function autoreplyInsert() {
        var appId = $appSelector.find('option:selected').val();

        var autoreply = {
            title: $('#modal-task-name').val(),
            text: $('#enter-text').val()
        };

        if (!autoreply.title) {
            return $.notify('請輸入標題', { type: 'warning' });
        } else if (!autoreply.text) {
            return $.notify('請輸入內容', { type: 'warning' });
        }

        var checkedDateType = $autoreplyAddModal.find('.form-check-input[name="dateType"]:checked').val();
        var $autoreplyAddStInput = $autoreplyAddStPicker.find('input[name="startTime"]');
        var $autoreplyAddEtInput = $autoreplyAddEtPicker.find('input[name="endTime"]');

        switch (checkedDateType) {
            case 'PERIODS':
                autoreply.startedTime = autoreply.endedTime = 0;
                autoreply.periods = [];

                var $scheduleDays = $autoreplyAddModal.find('.schedule-day.active');
                var stPickerData = $autoreplyAddStPicker.data('DateTimePicker');
                var etPickerData = $autoreplyAddEtPicker.data('DateTimePicker');
                var timezoneOffset = parseInt($autoreplyAddModal.find('select[name="timezoneOffset"]').val(), 10);

                var period = {
                    timezoneOffset: timezoneOffset,
                    days: []
                };

                $scheduleDays.each(function() {
                    var day = {
                        day: parseInt($(this).attr('day'), 10)
                    };

                    if (stPickerData && etPickerData) {
                        var stDate = stPickerData.date().toDate();
                        var etDate = etPickerData.date().toDate();
                        day.startedTime = formatTime(stDate, false);
                        day.endedTime = formatTime(etDate, false);
                    } else {
                        day.startedTime = $autoreplyAddStInput.val();
                        day.endedTime = $autoreplyAddEtInput.val();
                    }
                    period.days.push(day);
                });
                autoreply.periods.push(period);
                break;
            case 'RANGE_DATE':
            default:
                var sdtPickerData = $autoreplyAddSdtPicker.data('DateTimePicker');
                var edtPickerData = $autoreplyAddEdtPicker.data('DateTimePicker');

                if (sdtPickerData && edtPickerData) {
                    autoreply.startedTime = sdtPickerData.date().toDate().getTime();
                    autoreply.endedTime = edtPickerData.date() ? edtPickerData.date().toDate().getTime() : MAX_CHATSHIER_UNIX_TIME;
                } else {
                    autoreply.startedTime = new Date($autoreplyAddStInput.val()).getTime();
                    autoreply.endedTime = $autoreplyAddEtInput.val() ? new Date($autoreplyAddEtInput.val()).getTime() : MAX_CHATSHIER_UNIX_TIME;
                }
                break;
        }

        $('#addSubmitBtn').attr('disabled', true);
        return api.appsAutoreplies.insert(appId, userId, autoreply).then((resJson) => {
            $autoreplyAddModal.modal('hide');
            $('#addSubmitBtn').removeAttr('disabled');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            $appDropdown.find('#' + appId).click();
            $.notify('新增成功！', { type: 'success' });
        }).catch((resJson) => {
            $autoreplyAddModal.modal('hide');
            $('#addSubmitBtn').removeAttr('disabled');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');

            if (undefined === resJson.status) {
                $.notify('失敗', { type: 'danger' });
                return;
            }

            if (NO_PERMISSION_CODE === resJson.code) {
                $.notify('無此權限', { type: 'danger' });
                return;
            }

            $.notify('失敗', { type: 'danger' });
        });
    }

    function autoreplyUpdate() {
        var autoreply = {
            title: $('#edit-taskTitle').val(),
            text: $('#editTaskContent').val(),
            periods: []
        };

        var checkedDateType = $autoreplyEditModal.find('.form-check-input[name="dateType"]:checked').val();
        switch (checkedDateType) {
            case 'PERIODS':
                var $scheduleDays = $autoreplyEditModal.find('.schedule-day.active');
                var stPickerData = $autoreplyEditStPicker.data('DateTimePicker');
                var etPickerData = $autoreplyEditEtPicker.data('DateTimePicker');
                var timezoneOffset = parseInt($autoreplyEditModal.find('select[name="timezoneOffset"]').val(), 10);

                var period = {
                    timezoneOffset: timezoneOffset,
                    days: []
                };

                $scheduleDays.each(function() {
                    var day = {
                        day: parseInt($(this).attr('day'), 10)
                    };

                    if (stPickerData && etPickerData) {
                        var stDate = stPickerData.date().toDate();
                        var etDate = etPickerData.date().toDate();
                        day.startedTime = formatTime(stDate, false);
                        day.endedTime = formatTime(etDate, false);
                    } else {
                        day.startedTime = $autoreplyEditStInput.val();
                        day.endedTime = $autoreplyEditEtInput.val();
                    }
                    period.days.push(day);
                });
                autoreply.periods.push(period);
                break;
            case 'RANGE_DATE':
            default:
                var $autoreplyEditSdtInput = $autoreplyEditSdtPicker.find('input[name="startDatetime"]');
                var $autoreplyEditEdtInput = $autoreplyEditEdtPicker.find('input[name="endDatetime"]');
                var startTimePickerData = $autoreplyEditSdtPicker.data('DateTimePicker');
                var endTimePickerData = $autoreplyEditEdtPicker.data('DateTimePicker');

                if (startTimePickerData && endTimePickerData) {
                    autoreply.startedTime = startTimePickerData.date().toDate().getTime();
                    autoreply.endedTime = endTimePickerData.date().toDate().getTime();
                } else {
                    autoreply.startedTime = new Date($autoreplyEditSdtInput.val()).getTime();
                    autoreply.endedTime = new Date($autoreplyEditEdtInput.val()).getTime();
                }
                break;
        }

        $('#editSubmitBtn').attr('disabled', true);
        var $modalContent = $(this).parents('.modal-content');
        var appId = $modalContent.find('#edit-appid').text();
        var autoreplyId = $modalContent.find('#edit-autoreplyid').text();

        return api.appsAutoreplies.update(appId, autoreplyId, userId, autoreply).then(function(resJson) {
            var autoreplies = resJson.data[appId].autoreplies;
            appsAutoreplies[appId].autoreplies[autoreplyId] = autoreplies[autoreplyId];

            var $targetAutoreply = $('tr[app-id="' + appId + '"][autoreply-id="' + autoreplyId + '"]');
            $targetAutoreply.replaceWith(generateAutoreplyRow(appId, autoreplyId));

            $autoreplyEditModal.modal('hide');
            $.notify('修改成功！', { type: 'success' });
            $('#editSubmitBtn').removeAttr('disabled');
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $('#autoreplyEditModal').modal('hide');
                $('#editSubmitBtn').removeAttr('disabled');
                $.notify('失敗', { type: 'danger' });
                return;
            }

            if (NO_PERMISSION_CODE === resJson.code) {
                $autoreplyEditModal.modal('hide');
                $('#editSubmitBtn').removeAttr('disabled');
                $.notify('無此權限', { type: 'danger' });
                return;
            }

            if (NO_PERMISSION_CODE === resJson.code) {
                $autoreplyEditModal.modal('hide');
                $('#editSubmitBtn').removeAttr('disabled');
                $.notify('無此權限', { type: 'danger' });
                return;
            }

            $autoreplyEditModal.modal('hide');
            $('#editSubmitBtn').removeAttr('disabled');
            $.notify('失敗', { type: 'danger' });
        });
    }

    function autoreplyRemove(ev) {
        var $autoreplyRow = $(ev.target).parents('tr');
        var appId = $autoreplyRow.attr('app-id');
        var autoreplyId = $autoreplyRow.attr('autoreply-id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }

            return api.appsAutoreplies.remove(appId, autoreplyId, userId).then(function(resJson) {
                delete appsAutoreplies[appId].autoreplies[autoreplyId];
                $('tr[app-id="' + appId + '"][autoreply-id="' + autoreplyId + '"]').remove();
                $.notify('刪除成功！', { type: 'success' });
            }).catch((resJson) => {
                if (undefined === resJson.status) {
                    $.notify('失敗', { type: 'danger' });
                    return;
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                    return;
                }

                $.notify('失敗', { type: 'danger' });
            });
        });
    }

    function openEdit(ev) {
        var $autoreplyRow = $(ev.target).parents('tr');
        var appId = $autoreplyRow.attr('app-id');
        var autoreplyId = $autoreplyRow.attr('autoreply-id');
        var autoreply = appsAutoreplies[appId].autoreplies[autoreplyId];
        var periods = autoreply.periods || [];

        $autoreplyEditModal.find('#edit-appid').text(appId);
        $autoreplyEditModal.find('#edit-autoreplyid').text(autoreplyId);
        $autoreplyEditModal.find('#edit-taskTitle').val(autoreply.title); // 標題
        $autoreplyEditModal.find('#editTaskContent').val(autoreply.text); // 任務內容

        var $autoreplyEditSdtInput = $autoreplyEditSdtPicker.find('input[name="startDatetime"]');
        var $autoreplyEditEdtInput = $autoreplyEditEdtPicker.find('input[name="endDatetime"]');
        var $autoreplyEditStInput = $autoreplyEditStPicker.find('input[name="startTime"]');
        var $autoreplyEditEtInput = $autoreplyEditEtPicker.find('input[name="endTime"]');

        var sdtPickerData = $autoreplyEditSdtPicker.data('DateTimePicker');
        var edtPickerData = $autoreplyEditEdtPicker.data('DateTimePicker');

        var startedTime = autoreply.startedTime ? new Date(autoreply.startedTime) : new Date();
        var endedTime = autoreply.endedTime ? new Date(autoreply.endedTime) : new Date();
        startedTime = 0 === startedTime.getTime() ? new Date() : startedTime;
        endedTime = 0 === endedTime.getTime() ? new Date() : endedTime;

        if (sdtPickerData && edtPickerData) {
            sdtPickerData.date(startedTime);
            edtPickerData.date(endedTime);
        } else {
            $autoreplyEditSdtInput.val(toDatetimeLocal(startedTime));
            $autoreplyEditEdtInput.val(toDatetimeLocal(endedTime));
        }

        var stPickerData = $autoreplyEditStPicker.data('DateTimePicker');
        var etPickerData = $autoreplyEditEtPicker.data('DateTimePicker');

        var stDate = new Date();
        stDate.setHours(0, 0, 0, 0);
        var stTime = periods && periods.length > 0 ? periods[0].days[0].startedTime : '00:00';
        var stTimeSplits = stTime.split(':');
        var stTimeHour = parseInt(stTimeSplits.shift());
        var stTimeMinute = parseInt(stTimeSplits.pop());
        stDate.setHours(stTimeHour, stTimeMinute, 0, 0);

        var etDate = new Date();
        etDate.setHours(0, 0, 0, 0);
        var etTime = periods && periods.length > 0 ? periods[0].days[0].endedTime : '00:00';
        var etTimeSplits = etTime.split(':');
        var etTimeHour = parseInt(etTimeSplits.shift());
        var etTimeMinute = parseInt(etTimeSplits.pop());
        etDate.setHours(etTimeHour, etTimeMinute, 0, 0);

        if (stPickerData && etPickerData) {
            stPickerData.date(stDate);
            etPickerData.date(etDate);
        } else {
            $autoreplyEditStInput.val(stTime);
            $autoreplyEditEtInput.val(etTime);
        }

        var checkedDateType = periods && periods.length > 0 ? 'PERIODS' : 'RANGE_DATE';
        switch (checkedDateType) {
            case 'PERIODS':
                $autoreplyEditModal.find('.form-check-input[value="RANGE_DATE"]').removeAttr('checked');
                $autoreplyEditModal.find('.form-check-input[value="PERIODS"]').attr('checked', true);
                $autoreplyEditModal.find('#dateSelectGroup').addClass('d-none');
                $autoreplyEditModal.find('#timeSelectGroup').removeClass('d-none');

                let daysText = [];
                periods.forEach((period) => {
                    let days = period.days || [];
                    $autoreplyEditModal.find('.schedule-day').removeClass('active');
                    for (let i in days) {
                        $autoreplyEditModal.find('.schedule-day[day="' + days[i].day + '"]').addClass('active');
                        daysText.push(DAYS_TEXT[days[i].day]);
                    }
                    $autoreplyEditModal.find('select[name="timezoneOffset"]').val(period.timezoneOffset);
                });
                $autoreplyEditModal.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
                break;
            case 'RANGE_DATE':
            default:
                $autoreplyEditModal.find('.form-check-input[value="RANGE_DATE"]').attr('checked', true);
                $autoreplyEditModal.find('.form-check-input[value="PERIODS"]').removeAttr('checked');
                $autoreplyEditModal.find('#dateSelectGroup').removeClass('d-none');
                $autoreplyEditModal.find('#timeSelectGroup').addClass('d-none');
                break;
        }
    }

    function dataSearch(ev) {
        var searchText = $(this).val().toLocaleLowerCase();
        if (!searchText) {
            $('tbody > tr').removeAttr('style');
            return;
        }
        var code = ev.keyCode || ev.which;
        if (13 === code) {
            // enter鍵
            var target = $('tbody > tr > [data-title*="' + searchText + '"]').parent();
            if (0 === target.length) {
                $('tbody > tr > :not([data-title*="' + searchText + '"])').parent().hide();
            } else {
                target.siblings().hide();
                target.show();
            }
        }
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            var isOK = false;
            var $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.find('.btn-secondary').on('click', function() {
                resolve(isOK);
                $dialogModal.modal('hide');
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }

    /**
     * @param {Date} date
     */
    function toDatetimeLocal(date) {
        var YYYY = date.getFullYear();
        var MM = ten(date.getMonth() + 1);
        var DD = ten(date.getDate());
        var hh = ten(date.getHours());
        var mm = ten(date.getMinutes());
        var ss = ten(date.getSeconds());

        function ten(i) {
            return (i < 10 ? '0' : '') + i;
        }

        return YYYY + '-' + MM + '-' + DD + 'T' +
                hh + ':' + mm + ':' + ss;
    }

    function formatTo2Digit(n) {
        let s = '' + n;
        return 1 === s.length ? '0' + s : s;
    }

    function formatTime(time, shouldIncludeSec = true) {
        if (!time) {
            return '';
        } else if ('number' === typeof time || 'string' === typeof time) {
            time = new Date(time);
        }
        return formatTo2Digit(time.getHours()) +
            ':' + formatTo2Digit(time.getMinutes()) +
            (shouldIncludeSec ? ':' + formatTo2Digit(time.getSeconds()) : '');
    }
})();
