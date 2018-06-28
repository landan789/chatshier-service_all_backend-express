/// <reference path='../../typings/client/index.d.ts' />

(function() {
    /** @type {Chatshier.Models.AppsAutoreplies} */
    var appsAutoreplies = {};
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

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

    var timePickerInitOpts = {
        format: 'HH:mm',
        locale: datetimePickerInitOpts.locale,
        icons: datetimePickerInitOpts.icons
    };

    $(document).on('click', '#delete-btn', autoreplyRemove); // 刪除
    $(document).on('change paste keyup', '.search-bar', dataSearch);

    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });

    var PeriodComponent = (function() {
        class PeriodComponent {
            /**
             * @param {JQuery<HTMLElement>} $autoreplyModal
             */
            constructor($autoreplyModal) {
                this.$autoreplyModal = $autoreplyModal;
                this.$startDatetimePicker = $autoreplyModal.find('#startDatetimePicker');
                this.$endDatetimePicker = $autoreplyModal.find('#endDatetimePicker');
                this.$periodContainer = this.$autoreplyModal.find('#periodContainer');

                this.generatePeriodSelect = this.generatePeriodSelect.bind(this);
            }

            removePeriodSelect() {
                if (!this.$timeSelectGroup) {
                    return;
                }

                this.$startTimePicker.off('click');
                this.$endTimePicker.off('click');
                this.$timeSelectGroup.off('click').remove();
                this.$timeSelectGroup = void 0;
            }

            generatePeriodSelect() {
                this.removePeriodSelect();
                this.$timeSelectGroup = $(
                    '<div class="card pt-2 pb-3 px-3 form-group animated fadeIn" id="timeSelectGroup">' +
                        '<label class="d-inline-flex align-items-center col-form-label">' +
                            '<span class="font-weight-bold">時段設定:</span>' +
                            '<i class="ml-auto fas fa-times fa-1p5x cursor-pointer remove-select"></i>' +
                        '</label>' +
                        '<div class="d-flex time-picker-wrapper">' +
                            '<div class="my-2 mr-1 input-group date" id="startTimePicker">' +
                                '<span class="input-group-addon input-group-prepend">' +
                                    '<span class="input-group-text">' +
                                        '<i class="far fa-calendar-alt"></i>' +
                                    '</span>' +
                                '</span>' +
                                '<input type="text" class="form-control" id="startTime" name="startTime" placeholder="請選擇開始時間" />' +
                            '</div>' +

                            '<div class="my-2 ml-1 input-group date" id="endTimePicker">' +
                                '<span class="input-group-addon input-group-prepend">' +
                                    '<span class="input-group-text">' +
                                        '<i class="far fa-calendar-alt"></i>' +
                                    '</span>' +
                                '</span>' +
                                '<input type="text" class="form-control" id="endTime" name="endTime" placeholder="請選擇結束時間" />' +
                            '</div>' +
                        '</div>' +

                        '<label class="col-form-label font-weight-bold">' +
                            '<span>重複週期:</span>' +
                            '<span class="px-1" id="repeatText"></span>' +
                        '</label>' +
                        '<div class="flex-nowrap btn-toolbar" role="toolbar">' +
                            '<div class="btn-group period-days" role="group" >' +
                                '<button type="button" class="btn btn-light period-day" day="0">日</button>' +
                                '<button type="button" class="btn btn-light period-day" day="1">一</button>' +
                                '<button type="button" class="btn btn-light period-day" day="2">二</button>' +
                                '<button type="button" class="btn btn-light period-day" day="3">三</button>' +
                                '<button type="button" class="btn btn-light period-day" day="4">四</button>' +
                                '<button type="button" class="btn btn-light period-day" day="5">五</button>' +
                                '<button type="button" class="btn btn-light period-day" day="6">六</button>' +
                            '</div>' +
                            '<div class="ml-auto btn-group" role="group" >' +
                                '<button type="button" class="btn btn-info period-submit">確認</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
                this.$autoreplyModal.find('#periodContainer').append(this.$timeSelectGroup);

                this.$startTimePicker = this.$timeSelectGroup.find('#startTimePicker');
                this.$endTimePicker = this.$timeSelectGroup.find('#endTimePicker');
                this.$startTimeInput = this.$timeSelectGroup.find('input[name="startTime"]');
                this.$endTimeInput = this.$timeSelectGroup.find('input[name="endTime"]');
                this.$startTimePicker.datetimepicker(timePickerInitOpts);
                this.$endTimePicker.datetimepicker(timePickerInitOpts);

                this.$timeSelectGroup.on('click', '.period-day', (ev) => {
                    $(ev.target).toggleClass('active');
                    var $periodDays = this.$timeSelectGroup.find('.period-day.active');
                    var daysText = [];
                    $periodDays.each((i) => daysText.push($periodDays[i].textContent));
                    this.$timeSelectGroup.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
                });

                this.$timeSelectGroup.on('click', '.remove-select', () => {
                    this.removePeriodSelect();
                });

                this.$timeSelectGroup.on('click', '.period-submit', (ev) => {
                    let $periodDays = this.$timeSelectGroup.find('.period-day.active');
                    let period = {
                        days: []
                    };
                    $periodDays.each((i) => period.days.push($($periodDays[i]).attr('day')));

                    let startTimePickerData = this.$startTimePicker.data('DateTimePicker');
                    let endTimePickerData = this.$endTimePicker.data('DateTimePicker');

                    if (startTimePickerData && endTimePickerData) {
                        period.startedTime = formatTime(startTimePickerData.date().toDate(), false);
                        period.endedTime = formatTime(endTimePickerData.date().toDate(), false);
                    } else {
                        period.startedTime = formatTime(new Date(this.$startTimeInput.val()), false);
                        period.endedTime = formatTime(new Date(this.$endTimeInput.val()), false);
                    }
                    this.generatePeriodItem(period);
                    this.removePeriodSelect();
                });

                var resetDate = new Date();
                if (!window.isMobileBrowser()) {
                    resetDate.setHours(0, 0, 0, 0);
                    this.$startTimePicker.data('DateTimePicker').date(resetDate);
                    resetDate.setHours(23, 59, 59, 999);
                    this.$endTimePicker.data('DateTimePicker').date(resetDate);
                } else {
                    this.$startTimeInput.attr('type', 'time');
                    this.$endTimeInput.attr('type', 'time');
                    this.$startTimePicker.on('click', '.input-group-prepend', () => this.$startTimeInput.focus());
                    this.$endTimePicker.on('click', '.input-group-prepend', () => this.$endTimeInput.focus());
                }
            }

            generatePeriodItem(period) {
                let $periodItem = $(
                    '<div class="my-2 d-flex align-items-center period-item">' +
                        '<div class="mr-2 form-control">' +
                            '<div class="period-text">' +
                                '<span class="mr-2">時段:</span>' +
                                '<span class="period-started-time">' + period.startedTime + '</span>' +
                                '<span class="mx-2">~</span>' +
                                '<span class="period-ended-time">' + period.endedTime + '</span>' +
                            '</div>' +
                            '<div class="repeat-text">' +
                                '<span class="mr-2">重複週期:</span>' +
                                (() => {
                                    return period.days.map((day) => {
                                        return (
                                            '<span class="day" day="' + day + '">' + DAYS_TEXT[day] + '</span>'
                                        );
                                    }).join(' ');
                                })() +
                            '</div>' +
                        '</div>' +
                        '<i class="ml-auto p-2 fas fa-times-circle fa-1p5x cursor-pointer period-remove-btn"></i>' +
                    '</div>'
                );

                this.$periodContainer.append($periodItem);
                $periodItem.on('click', '.period-remove-btn', () => {
                    $periodItem.off('click').remove();
                });
            }

            setDayActive(days) {
                let $periodDays = this.$timeSelectGroup.find('.period-days');
                $periodDays.find('.period-day').removeClass('active');

                let daysText = [];
                for (let i in days) {
                    daysText.push(DAYS_TEXT[days[i]]);
                    $periodDays.find('.period-day[day="' + days[i] + '"]').addClass('active');
                }
                this.$timeSelectGroup.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
            }

            retrievePeriods() {
                let periods = [];
                let $periodItems = this.$periodContainer.find('.period-item');
                $periodItems.each(function() {
                    let $periodItem = $(this);
                    let period = {
                        days: [],
                        startedTime: $periodItem.find('.period-started-time').text(),
                        endedTime: $periodItem.find('.period-ended-time').text()
                    };

                    $periodItem.find('.day').each(function() {
                        period.days.push(parseInt($(this).attr('day'), 10));
                    });
                    periods.push(period);
                });
                return periods;
            }
        }
        return PeriodComponent;
    })();

    // #region Add modal 的處理全部寫在此閉包中
    (function() {
        var $autoreplyAddModal = $('#autoreplyAddModal');
        var $autoreplyAddSdtPicker = $autoreplyAddModal.find('#startDatetimePicker');
        var $autoreplyAddEdtPicker = $autoreplyAddModal.find('#endDatetimePicker');
        var $autoreplyAddSdtInput = $autoreplyAddSdtPicker.find('input[name="startDatetime"]');
        var $autoreplyAddEdtInput = $autoreplyAddEdtPicker.find('input[name="endDatetime"]');
        var periodCmp = new PeriodComponent($autoreplyAddModal);

        if (!window.isMobileBrowser()) {
            $autoreplyAddSdtPicker.datetimepicker(datetimePickerInitOpts);
            $autoreplyAddEdtPicker.datetimepicker(datetimePickerInitOpts);
        } else {
            $autoreplyAddSdtInput.attr('type', 'datetime-local');
            $autoreplyAddEdtInput.attr('type', 'datetime-local');
            $autoreplyAddSdtPicker.on('click', '.input-group-prepend', () => $autoreplyAddSdtInput.focus());
            $autoreplyAddEdtPicker.on('click', '.input-group-prepend', () => $autoreplyAddEdtInput.focus());
        }

        $autoreplyAddModal.on('show.bs.modal', resetAutoreplyAddModal);
        $autoreplyAddModal.on('click', '#addSubmitBtn', autoreplyInsert);
        $autoreplyAddModal.on('click', '#periodAddBtn', showPeriodElem);

        $autoreplyAddModal.on('hidden.bs.modal', function() {
            let modalAppId = $appSelector.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        function showPeriodElem() {
            periodCmp.generatePeriodSelect();
            periodCmp.setDayActive([0, 1, 2, 3, 4, 5, 6]);
        }

        function resetAutoreplyAddModal() {
            var resetDate = new Date();
            if (!window.isMobileBrowser()) {
                $autoreplyAddSdtPicker.data('DateTimePicker').date(resetDate);
                $autoreplyAddEdtPicker.data('DateTimePicker').clear();
            } else {
                $autoreplyAddSdtInput.val(toDatetimeLocal(resetDate));
                $autoreplyAddEdtInput.val('');
            }
            periodCmp.$periodContainer.empty();

            $appSelector.val(nowSelectAppId);
        }

        function autoreplyInsert() {
            var autoreplyTitle = $('#modal-task-name').val();
            var autoreplyText = $('#enter-text').val();

            if (!autoreplyTitle) {
                return $.notify('請輸入標題', { type: 'warning' });
            } else if (!autoreplyText) {
                return $.notify('請輸入內容', { type: 'warning' });
            }

            var autoreply = {
                title: autoreplyTitle,
                text: autoreplyText,
                timezoneOffset: new Date().getTimezoneOffset(),
                periods: periodCmp.retrievePeriods()
            };

            var sdtPickerData = $autoreplyAddSdtPicker.data('DateTimePicker');
            var edtPickerData = $autoreplyAddEdtPicker.data('DateTimePicker');
            if (sdtPickerData && edtPickerData) {
                autoreply.startedTime = sdtPickerData.date().toDate().getTime();
                autoreply.endedTime = edtPickerData.date() ? edtPickerData.date().toDate().getTime() : MAX_CHATSHIER_UNIX_TIME;
            } else {
                autoreply.startedTime = new Date($autoreplyAddSdtInput.val()).getTime();
                autoreply.endedTime = $autoreplyAddEdtInput.val() ? new Date($autoreplyAddEdtInput.val()).getTime() : MAX_CHATSHIER_UNIX_TIME;
            }

            var appId = $appSelector.find('option:selected').val();
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
    })();
    // #endregion

    // #region Edit modal 的處理全部寫在此閉包中
    (function() {
        var $autoreplyEditModal = $('#autoreplyEditModal');
        var $autoreplyEditSdtPicker = $autoreplyEditModal.find('#startDatetimePicker');
        var $autoreplyEditEdtPicker = $autoreplyEditModal.find('#endDatetimePicker');
        var $autoreplyEditSdtInput = $autoreplyEditSdtPicker.find('input[name="startDatetime"]');
        var $autoreplyEditEdtInput = $autoreplyEditEdtPicker.find('input[name="endDatetime"]');
        var periodCmp = new PeriodComponent($autoreplyEditModal);

        var appId;
        var autoreplyId;

        if (!window.isMobileBrowser()) {
            delete datetimePickerInitOpts.defaultDate;
            $autoreplyEditSdtPicker.datetimepicker(datetimePickerInitOpts);
            $autoreplyEditEdtPicker.datetimepicker(datetimePickerInitOpts);
        } else {
            $autoreplyEditSdtInput.attr('type', 'datetime-local');
            $autoreplyEditEdtInput.attr('type', 'datetime-local');
            $autoreplyEditSdtPicker.on('click', '.input-group-prepend', () => $autoreplyEditSdtInput.focus());
            $autoreplyEditEdtPicker.on('click', '.input-group-prepend', () => $autoreplyEditEdtInput.focus());
        }

        $autoreplyEditModal.on('show.bs.modal', initEditAutoreply);
        $autoreplyEditModal.on('click', '#editSubmitBtn', autoreplyUpdate);
        $autoreplyEditModal.on('click', '#periodAddBtn', showPeriodElem);

        function showPeriodElem() {
            periodCmp.generatePeriodSelect();
            periodCmp.setDayActive([0, 1, 2, 3, 4, 5, 6]);
        }

        function initEditAutoreply(ev) {
            var $autoreplyRow = $(ev.relatedTarget).parents('tr');
            appId = $autoreplyRow.attr('app-id');
            autoreplyId = $autoreplyRow.attr('autoreply-id');

            var autoreply = appsAutoreplies[appId].autoreplies[autoreplyId];
            var periods = autoreply.periods || [];

            $autoreplyEditModal.find('#edit-taskTitle').val(autoreply.title); // 標題
            $autoreplyEditModal.find('#editTaskContent').val(autoreply.text); // 任務內容

            var $autoreplyEditSdtInput = $autoreplyEditSdtPicker.find('input[name="startDatetime"]');
            var $autoreplyEditEdtInput = $autoreplyEditEdtPicker.find('input[name="endDatetime"]');

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

            periodCmp.$periodContainer.empty();
            for (let i in periods) {
                let period = periods[i];
                periodCmp.generatePeriodItem(period);
            }
        }

        function autoreplyUpdate() {
            var autoreplyTitle = $('#edit-taskTitle').val();
            var autoreplyText = $('#editTaskContent').val();

            if (!autoreplyTitle) {
                return $.notify('請輸入標題', { type: 'warning' });
            } else if (!autoreplyText) {
                return $.notify('請輸入內容', { type: 'warning' });
            }

            var autoreply = {
                title: autoreplyTitle,
                text: autoreplyText,
                timezoneOffset: new Date().getTimezoneOffset(),
                periods: periodCmp.retrievePeriods()
            };

            var startTimePickerData = $autoreplyEditSdtPicker.data('DateTimePicker');
            var endTimePickerData = $autoreplyEditEdtPicker.data('DateTimePicker');
            if (startTimePickerData && endTimePickerData) {
                autoreply.startedTime = startTimePickerData.date().toDate().getTime();
                autoreply.endedTime = endTimePickerData.date().toDate().getTime();
            } else {
                autoreply.startedTime = new Date($autoreplyEditSdtInput.val()).getTime();
                autoreply.endedTime = new Date($autoreplyEditEdtInput.val()).getTime();
            }

            $('#editSubmitBtn').attr('disabled', true);
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
    })();
    // #endregion

    return api.apps.findAll(userId).then(function(respJson) {
        var apps = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted ||
                app.type === api.apps.TYPES.CHATSHIER) {
                delete apps[appId];
                continue;
            }
            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
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

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
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
                        let startedTimeDays = [];
                        let endedTimeDays = [];
                        let timezoneOffset = parseInt(autoreply.timezoneOffset, 10);

                        autoreply.periods.forEach((period) => {
                            var days = period.days || [];
                            if (0 === days.length) {
                                return;
                            }

                            let activatedDays = period.days.map((day) => DAYS_TEXT[day]);
                            let offsetText = 'GMT ' + (timezoneOffset >= 0 ? '-' : '+') + (-timezoneOffset / 60).toFixed(0);
                            startedTimeDays.push(activatedDays.join(' ') + '\n' + period.startedTime + ' ' + offsetText);
                            endedTimeDays.push(activatedDays.join(' ') + '\n' + period.endedTime + ' ' + offsetText);
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
                '<td class="text-pre" data-title="' + autoreply.text + '">' + autoreply.text + '</td>' +
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
