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

    var week = {
        0: '日',
        1: '一',
        2: '二',
        3: '三',
        4: '四',
        5: '五',
        6: '六'
    };

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
            case 'RANGE_SCHEDULE':
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
            case 'RANGE_SCHEDULE':
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
            $autoreplyAddSdtPicker.data('DateTimePicker').date(resetDate);
            $autoreplyAddEdtPicker.data('DateTimePicker').clear();

            resetDate.setHours(0, 0, 0, 0);
            $autoreplyAddStPicker.data('DateTimePicker').date(resetDate);
            $autoreplyAddEtPicker.data('DateTimePicker').date(resetDate);

            $autoreplyAddModal.find('.schedule-day').addClass('active');
            $autoreplyAddModal.find('#repeatText').text('全部');
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
            $autoreplyAddSdtInput.val(toDatetimeLocal(resetDate));
            $autoreplyAddEdtInput.val('');

            resetDate.setHours(0, 0, 0, 0);
            $autoreplyAddStInput.val(formatTime(resetDate, false));
            $autoreplyAddEtInput.val(formatTime(resetDate, false));
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
                    if (autoreply.schedule && autoreply.schedule.length > 0) {
                        var startedTimeDays = [];
                        var endedTimeDays = [];

                        autoreply.schedule.forEach((plan, i) => {
                            startedTimeDays.push(week[plan.day]);
                            endedTimeDays.push(week[plan.day]);
                        });

                        return (
                            '<td class="text-pre">' + startedTimeDays.join(' ') + '\n' + autoreply.schedule[0].startedTime + '</td>' +
                            '<td class="text-pre">' + endedTimeDays.join(' ') + '\n' + autoreply.schedule[0].endedTime + '</td>'
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
            case 'RANGE_SCHEDULE':
                autoreply.startedTime = autoreply.endedTime = 0;
                autoreply.schedule = [];
                var $scheduleDays = $autoreplyAddModal.find('.schedule-day.active');
                var stPickerData = $autoreplyAddStPicker.data('DateTimePicker');
                var etPickerData = $autoreplyAddEtPicker.data('DateTimePicker');

                $scheduleDays.each((i) => {
                    var scheduleTime = {
                        day: parseInt($($scheduleDays[i]).attr('day'), 10)
                    };

                    if (stPickerData && etPickerData) {
                        var stDate = stPickerData.date().toDate();
                        var etDate = etPickerData.date().toDate();
                        scheduleTime.startedTime = formatTime(stDate, false);
                        scheduleTime.endedTime = formatTime(etDate, false);
                    } else {
                        var stDateMobile = new Date($autoreplyAddStInput.val());
                        var etDateMobile = new Date($autoreplyAddEtInput.val());
                        scheduleTime.startedTime = formatTime(stDateMobile, false);
                        scheduleTime.endedTime = formatTime(etDateMobile, false);
                    }
                    autoreply.schedule.push(scheduleTime);
                });
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
            schedule: []
        };

        var checkedDateType = $autoreplyEditModal.find('.form-check-input[name="dateType"]:checked').val();
        switch (checkedDateType) {
            case 'RANGE_SCHEDULE':
                var $scheduleDays = $autoreplyEditModal.find('.schedule-day.active');
                var stPickerData = $autoreplyEditStPicker.data('DateTimePicker');
                var etPickerData = $autoreplyEditEtPicker.data('DateTimePicker');

                $scheduleDays.each((i) => {
                    var scheduleTime = {
                        day: parseInt($($scheduleDays[i]).attr('day'), 10)
                    };

                    if (stPickerData && etPickerData) {
                        var stDate = stPickerData.date().toDate();
                        var etDate = etPickerData.date().toDate();
                        scheduleTime.startedTime = formatTime(stDate, false);
                        scheduleTime.endedTime = formatTime(etDate, false);
                    } else {
                        var stDateMobile = new Date($autoreplyEditStInput.val());
                        var etDateMobile = new Date($autoreplyEditEtInput.val());
                        scheduleTime.startedTime = formatTime(stDateMobile, false);
                        scheduleTime.endedTime = formatTime(etDateMobile, false);
                    }
                    autoreply.schedule.push(scheduleTime);
                });
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

    function autoreplyRemove() {
        var $autoreplyRow = $(this).parents('tr');
        var appId = $autoreplyRow.attr('rel');
        var autoreplyId = $autoreplyRow.attr('id');

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

    function openEdit() {
        var $autoreplyRow = $(this).parents('tr');
        var appId = $autoreplyRow.attr('app-id');
        var autoreplyId = $autoreplyRow.attr('autoreply-id');
        var autoreply = appsAutoreplies[appId].autoreplies[autoreplyId];
        var schedule = autoreply.schedule || [];

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
        var stTime = schedule && schedule.length > 0 ? schedule[0].startedTime : '00:00';
        var stTimeHour = parseInt(stTime.split(':').shift());
        var stTimeMinute = parseInt(stTime.split(':').pop());
        stDate.setHours(stTimeHour, stTimeMinute, 0, 0);

        var etDate = new Date();
        etDate.setHours(0, 0, 0, 0);
        var etTime = schedule && schedule.length > 0 ? schedule[0].endedTime : '00:00';
        var etTimeHour = parseInt(etTime.split(':').shift());
        var etTimeMinute = parseInt(etTime.split(':').pop());
        etDate.setHours(etTimeHour, etTimeMinute, 0, 0);

        if (stPickerData && etPickerData) {
            stPickerData.date(stDate);
            etPickerData.date(etDate);
        } else {
            $autoreplyEditStInput.val(formatTime(stDate, false));
            $autoreplyEditEtInput.val(formatTime(etDate, false));
        }

        var checkedDateType = schedule && schedule.length > 0 ? 'RANGE_SCHEDULE' : 'RANGE_DATE';

        switch (checkedDateType) {
            case 'RANGE_SCHEDULE':
                $autoreplyEditModal.find('.form-check-input[value="RANGE_DATE"]').removeAttr('checked');
                $autoreplyEditModal.find('.form-check-input[value="RANGE_SCHEDULE"]').attr('checked', true);
                $autoreplyEditModal.find('#dateSelectGroup').addClass('d-none');
                $autoreplyEditModal.find('#timeSelectGroup').removeClass('d-none');

                let daysText = [];
                schedule.forEach((plan) => {
                    $autoreplyEditModal.find('.schedule-day[day="' + plan.day + '"]').addClass('active');
                    daysText.push(week[plan.day]);
                });
                $autoreplyEditModal.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
                break;
            case 'RANGE_DATE':
            default:
                $autoreplyEditModal.find('.form-check-input[value="RANGE_DATE"]').attr('checked', true);
                $autoreplyEditModal.find('.form-check-input[value="RANGE_SCHEDULE"]').removeAttr('checked');
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
