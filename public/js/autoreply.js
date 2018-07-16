/// <reference path='../../typings/client/index.d.ts' />

let PeriodComponent = (function() {
    let isMobile = ('function' === typeof window.isMobileBrowser) && window.isMobileBrowser();
    let datetimePickerInitOpts = {
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

    let timePickerInitOpts = {
        format: 'HH:mm',
        locale: datetimePickerInitOpts.locale,
        icons: datetimePickerInitOpts.icons
    };

    class PeriodComponent {
        /**
         * @param {JQuery<HTMLElement>} $autoreplyModal
         */
        constructor($autoreplyModal) {
            this.DAYS_TEXT = ['日', '一', '二', '三', '四', '五', '六'];

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
                let $periodDays = this.$timeSelectGroup.find('.period-day.active');
                let daysText = [];
                $periodDays.each((i, elem) => daysText.push($(elem).textContent));
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
                $periodDays.each((i, elem) => period.days.push($(elem).attr('day')));

                let startTimePickerData = this.$startTimePicker.data('DateTimePicker');
                let endTimePickerData = this.$endTimePicker.data('DateTimePicker');

                if (startTimePickerData && endTimePickerData) {
                    period.startedTime = this._formatTime(startTimePickerData.date().toDate(), false);
                    period.endedTime = this._formatTime(endTimePickerData.date().toDate(), false);
                } else {
                    period.startedTime = this._formatTime(new Date(this.$startTimeInput.val()), false);
                    period.endedTime = this._formatTime(new Date(this.$endTimeInput.val()), false);
                }
                this.generatePeriodItem(period);
                this.removePeriodSelect();
            });

            let resetDate = new Date();
            if (!isMobile) {
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
                '<div class="my-2 d-flex align-items-center period-item animated fadeIn">' +
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
                                        '<span class="day" day="' + day + '">' + this.DAYS_TEXT[day] + '</span>'
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
                daysText.push(this.DAYS_TEXT[days[i]]);
                $periodDays.find('.period-day[day="' + days[i] + '"]').addClass('active');
            }
            this.$timeSelectGroup.find('#repeatText').text(daysText.length >= 7 ? '全部' : daysText.join(' '));
        }

        retrievePeriods() {
            let periods = [];
            let $periodItems = this.$periodContainer.find('.period-item');
            $periodItems.each(function(i, elem) {
                let $periodItem = $(elem);
                let period = {
                    days: [],
                    startedTime: $periodItem.find('.period-started-time').text(),
                    endedTime: $periodItem.find('.period-ended-time').text()
                };

                $periodItem.find('.day').each(function(i, elem) {
                    period.days.push(parseInt($(elem).attr('day'), 10));
                });
                periods.push(period);
            });
            return periods;
        }

        _formatTo2Digit(n) {
            let s = '' + n;
            return 1 === s.length ? '0' + s : s;
        }

        _formatTime(time, shouldIncludeSec = true) {
            if (!time) {
                return '';
            } else if ('number' === typeof time || 'string' === typeof time) {
                time = new Date(time);
            }
            return this._formatTo2Digit(time.getHours()) +
                ':' + this._formatTo2Digit(time.getMinutes()) +
                (shouldIncludeSec ? ':' + this._formatTo2Digit(time.getSeconds()) : '');
        }
    }
    return PeriodComponent;
})();

(function() {
    /** @type {Chatshier.Models.Apps} */
    let apps = {};
    /** @type {Chatshier.Models.AppsAutoreplies} */
    let appsAutoreplies = {};
    let $jqDoc = $(document);
    let $appDropdown = $('.app-dropdown');

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    let api = window.restfulAPI;
    let nowSelectAppId = '';
    let NO_PERMISSION_CODE = '3.16';
    let MAX_CHATSHIER_UNIX_TIME = 4701945599000;

    let DAYS_TEXT = ['日', '一', '二', '三', '四', '五', '六'];

    let userId;
    try {
        let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    let datetimePickerInitOpts = {
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

    $(document).on('click', '#delete-btn', autoreplyRemove); // 刪除
    $(document).on('change paste keyup', '.search-bar', autoreplySearch);

    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });

    // #region Add modal 的處理全部寫在此閉包中
    (function() {
        let isMobile = ('function' === typeof window.isMobileBrowser) && window.isMobileBrowser();

        let $autoreplyModal = $('#autoreplyModal');
        let $autoreplySdtPicker = $autoreplyModal.find('#startDatetimePicker');
        let $autoreplyEdtPicker = $autoreplyModal.find('#endDatetimePicker');
        let $modalAppSelect = $('#modalAppSelect');

        let periodCmp = new PeriodComponent($autoreplyModal);
        let ReplyMessageSelector = window.ReplyMessageSelector;
        let replyMessageSelect = new ReplyMessageSelector($autoreplyModal.find('#rowOfPeriod').get(0));
        replyMessageSelect.userId = userId;

        replyMessageSelect.onReplyItemChange = (replyType, _selector) => {
            if (!modalAutoreply) {
                return;
            }

            'text' === replyType && modalAutoreply.text && _selector.setMessageText(modalAutoreply.text);
            'image' === replyType && modalAutoreply.src && _selector.setImageSrc(modalAutoreply.src);
            'imagemap' === replyType && modalAutoreply.imagemap_id && _selector.setImageMap(modalAutoreply.imagemap_id);
            'template' === replyType && modalAutoreply.template_id && _selector.setTemplate(modalAutoreply.template_id);
        };

        let $autoreplySdtInput = $autoreplySdtPicker.find('input[name="startDatetime"]');
        let $autoreplyEdtInput = $autoreplyEdtPicker.find('input[name="endDatetime"]');

        let modalAppId;
        let modalAutoreplyId;
        /** @type {Chatshier.Models.Autoreply} */
        let modalAutoreply;
        if (!isMobile) {
            $autoreplySdtPicker.datetimepicker(datetimePickerInitOpts);
            $autoreplyEdtPicker.datetimepicker(datetimePickerInitOpts);
        } else {
            $autoreplySdtInput.attr('type', 'datetime-local');
            $autoreplyEdtInput.attr('type', 'datetime-local');
            $autoreplySdtPicker.on('click', '.input-group-prepend', () => $autoreplySdtInput.focus());
            $autoreplyEdtPicker.on('click', '.input-group-prepend', () => $autoreplyEdtInput.focus());
        }

        $autoreplyModal.on('show.bs.modal', initAutoreplyModal);
        $autoreplyModal.on('click', '#addSubmitBtn', autoreplyInsert);
        $autoreplyModal.on('click', '#updateSubmitBtn', autoreplyUpdate);
        $autoreplyModal.on('click', '#periodAddBtn', showPeriodElem);

        $autoreplyModal.on('hide.bs.modal', function() {
            let modalAppId = $modalAppSelect.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        $modalAppSelect.on('change', function() {
            replyMessageSelect.appId = modalAppId = $modalAppSelect.val();
            replyMessageSelect.reset();

            let shouldShow = 'FACEBOOK' !== apps[modalAppId].type;
            replyMessageSelect.toggleImageMap(shouldShow);
            replyMessageSelect.toggleTemplate(shouldShow);
        });

        function showPeriodElem() {
            periodCmp.generatePeriodSelect();
            periodCmp.setDayActive([0, 1, 2, 3, 4, 5, 6]);
        }

        function initAutoreplyModal(ev) {
            let $relatedBtn = $(ev.relatedTarget);
            let sdtPickerData = $autoreplySdtPicker.data('DateTimePicker');
            let edtPickerData = $autoreplyEdtPicker.data('DateTimePicker');

            if ($relatedBtn.hasClass('inner-add')) {
                $modalAppSelect.empty();
                for (let _appId in apps) {
                    let app = apps[_appId];
                    $modalAppSelect.append('<option value="' + _appId + '">' + app.name + '</option>');
                }

                let resetDate = new Date();
                if (!isMobile) {
                    sdtPickerData.date(resetDate);
                    edtPickerData.clear();
                } else {
                    $autoreplySdtInput.val(toDatetimeLocal(resetDate));
                    $autoreplyEdtInput.val('');
                }
                periodCmp.$periodContainer.empty();

                $autoreplyModal.find('#addSubmitBtn').removeClass('d-none');
                $autoreplyModal.find('#updateSubmitBtn').addClass('d-none');

                modalAppId = nowSelectAppId;
                modalAutoreplyId = modalAutoreply = void 0;
                $modalAppSelect.val(modalAppId);
                $modalAppSelect.parents('.form-group').removeClass('d-none');

                replyMessageSelect.appId = modalAppId;
                replyMessageSelect.reset();
                return;
            }

            let $autoreplyRow = $relatedBtn.parents('tr');
            modalAppId = $autoreplyRow.attr('app-id');
            modalAutoreplyId = $autoreplyRow.attr('autoreply-id');
            modalAutoreply = appsAutoreplies[modalAppId].autoreplies[modalAutoreplyId];
            $modalAppSelect.val(modalAppId);
            $modalAppSelect.parents('.form-group').addClass('d-none');

            $autoreplyModal.find('#addSubmitBtn').addClass('d-none');
            $autoreplyModal.find('#updateSubmitBtn').removeClass('d-none');
            $autoreplyModal.find('#autoreplyTitle').val(modalAutoreply.title); // 標題

            let startedTime = modalAutoreply.startedTime ? new Date(modalAutoreply.startedTime) : new Date();
            let endedTime = modalAutoreply.endedTime ? new Date(modalAutoreply.endedTime) : new Date();
            startedTime = 0 === startedTime.getTime() ? new Date() : startedTime;
            endedTime = 0 === endedTime.getTime() ? new Date() : endedTime;

            if (sdtPickerData && edtPickerData) {
                sdtPickerData.date(startedTime);
                edtPickerData.date(endedTime);
            } else {
                $autoreplySdtInput.val(toDatetimeLocal(startedTime));
                $autoreplyEdtInput.val(toDatetimeLocal(endedTime));
            }

            let periods = modalAutoreply.periods || [];
            periodCmp.$periodContainer.empty();
            for (let i in periods) {
                let period = periods[i];
                periodCmp.generatePeriodItem(period);
            }

            replyMessageSelect.appId = modalAppId;
            replyMessageSelect.reset(modalAutoreply.type);
        }

        function prepareAutoreply() {
            let autoreplyTitle = $autoreplyModal.find('[name="autoreplyTitle"]').val();
            if (!autoreplyTitle) {
                $.notify('請輸入標題', { type: 'warning' });
                return Promise.resolve();
            }

            return replyMessageSelect.getJSON().then((json) => {
                let isDataVaild = (
                    ('text' === json.type && json.text) ||
                    ('image' === json.type && json.src) ||
                    ('imagemap' === json.type && json.imagemap_id) ||
                    ('template' === json.type && json.template_id)
                );

                if (!isDataVaild) {
                    $.notify('請設定回覆內容', { type: 'warning' });
                    return;
                }

                let autoreply = {
                    title: autoreplyTitle,
                    text: json.text,
                    timezoneOffset: new Date().getTimezoneOffset(),
                    periods: periodCmp.retrievePeriods()
                };

                let sdtPickerData = $autoreplySdtPicker.data('DateTimePicker');
                let edtPickerData = $autoreplyEdtPicker.data('DateTimePicker');
                if (sdtPickerData && edtPickerData) {
                    autoreply.startedTime = sdtPickerData.date().toDate().getTime();
                    autoreply.endedTime = edtPickerData.date() ? edtPickerData.date().toDate().getTime() : MAX_CHATSHIER_UNIX_TIME;
                } else {
                    autoreply.startedTime = new Date($autoreplySdtInput.val()).getTime();
                    autoreply.endedTime = $autoreplyEdtInput.val() ? new Date($autoreplyEdtInput.val()).getTime() : MAX_CHATSHIER_UNIX_TIME;
                }
                return Object.assign({}, autoreply, json);
            });
        }

        function autoreplyInsert() {
            let $addSubmitBtn = $autoreplyModal.find('#addSubmitBtn');
            $addSubmitBtn.attr('disabled', true);
            let filePath = '';

            return prepareAutoreply().then((_autoreply) => {
                filePath = _autoreply.originalFilePath;
                delete _autoreply.originalFilePath;

                let appId = modalAppId;
                return api.appsAutoreplies.insert(appId, userId, _autoreply).then((resJson) => {
                    let _appsAutoreplies = resJson.data;
                    if (!_appsAutoreplies[appId]) {
                        _appsAutoreplies[appId] = { autoreplies: {} };
                    }
                    Object.assign(appsAutoreplies[appId].autoreplies, _appsAutoreplies[appId].autoreplies);

                    let autoreplyId = Object.keys(_appsAutoreplies[appId].autoreplies).shift() || '';
                    if (filePath && autoreplyId) {
                        let fileName = filePath.split('/').pop();
                        let toPath = '/apps/' + appId + '/autoreplies/' + autoreplyId + '/src/' + fileName;
                        return api.image.moveFile(userId, filePath, toPath);
                    }
                }).then(() => {
                    $addSubmitBtn.removeAttr('disabled');
                    $autoreplyModal.modal('hide');
                    $.notify('新增成功！', { type: 'success' });
                    return loadAutoreplies(appId);
                }).catch((resJson) => {
                    $addSubmitBtn.removeAttr('disabled');

                    if (NO_PERMISSION_CODE === resJson.code) {
                        $.notify('無此權限', { type: 'danger' });
                    } else {
                        $.notify('失敗', { type: 'danger' });
                    }
                });
            });
        }

        function autoreplyUpdate() {
            let $updateSubmitBtn = $autoreplyModal.find('#updateSubmitBtn');
            $updateSubmitBtn.attr('disabled', true);
            let filePath = '';

            return prepareAutoreply().then((_autoreply) => {
                filePath = _autoreply.originalFilePath;
                delete _autoreply.originalFilePath;

                let appId = modalAppId;
                let autoreplyId = modalAutoreplyId;
                return api.appsAutoreplies.update(appId, autoreplyId, userId, _autoreply).then(function(resJson) {
                    let _appsAutoreplies = resJson.data;
                    Object.assign(appsAutoreplies[appId].autoreplies, _appsAutoreplies[appId].autoreplies);

                    if (filePath && autoreplyId) {
                        let fileName = filePath.split('/').pop();
                        let toPath = '/apps/' + appId + '/autoreplies/' + autoreplyId + '/src/' + fileName;
                        return api.image.moveFile(userId, filePath, toPath);
                    }
                }).then(() => {
                    $updateSubmitBtn.removeAttr('disabled');
                    $autoreplyModal.modal('hide');
                    $.notify('修改成功！', { type: 'success' });

                    let $targetAutoreply = $('tr[app-id="' + appId + '"][autoreply-id="' + autoreplyId + '"]');
                    $targetAutoreply.replaceWith(generateAutoreplyRow(appId, autoreplyId));
                }).catch((resJson) => {
                    $updateSubmitBtn.removeAttr('disabled');
                    $autoreplyModal.modal('hide');

                    if (NO_PERMISSION_CODE === resJson.code) {
                        $.notify('無此權限', { type: 'danger' });
                    } else {
                        $.notify('更新失敗', { type: 'danger' });
                    }
                });
            });
        }
    })();
    // #endregion

    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;
        nowSelectAppId = '';

        let $dropdownMenu = $appDropdown.find('.dropdown-menu');
        for (let appId in apps) {
            let app = apps[appId];
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
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
            return loadAutoreplies(nowSelectAppId, userId);
        }
    });

    function appSourceChanged() {
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadAutoreplies(nowSelectAppId, userId);
    }

    function loadAutoreplies(appId, userId) {
        let $autoreplyTables = $('#autoreply-tables').empty();

        return Promise.resolve().then(() => {
            if (!appsAutoreplies[appId]) {
                return api.appsAutoreplies.findAll(appId, userId).then(function(resJson) {
                    let _appsAutoreplies = resJson.data;
                    appsAutoreplies[appId] = { autoreplies: {} };

                    if (!_appsAutoreplies[appId]) {
                        return appsAutoreplies[appId].autoreplies;
                    }

                    Object.assign(appsAutoreplies[appId].autoreplies, _appsAutoreplies[appId].autoreplies);
                    return appsAutoreplies[appId].autoreplies;
                });
            }
            return appsAutoreplies[appId].autoreplies;
        }).then((autoreplies) => {
            for (let autoreplyId in autoreplies) {
                $autoreplyTables.append(generateAutoreplyRow(appId, autoreplyId));
            }
        });
    }

    function generateAutoreplyRow(appId, autoreplyId) {
        let autoreplies = appsAutoreplies[appId].autoreplies;
        let autoreply = autoreplies[autoreplyId];
        return (
            '<tr class="autoreply-row" app-id="' + appId + '" autoreply-id="' + autoreplyId + '">' +
                '<td class="mb-2 search-source">' + autoreply.title + '</td>' +
                (function() {
                    if (autoreply.periods && autoreply.periods.length > 0) {
                        let startedTimeDays = [];
                        let endedTimeDays = [];
                        let timezoneOffset = parseInt(autoreply.timezoneOffset, 10);

                        autoreply.periods.forEach((period) => {
                            let days = period.days || [];
                            if (0 === days.length) {
                                return;
                            }

                            let activatedDays = period.days.map((day) => DAYS_TEXT[day]);
                            let offsetText = 'GMT ' + (timezoneOffset >= 0 ? '-' : '+') + (-timezoneOffset / 60).toFixed(0);
                            startedTimeDays.push(activatedDays.join(' ') + '\n' + period.startedTime + ' ' + offsetText);
                            endedTimeDays.push(activatedDays.join(' ') + '\n' + period.endedTime + ' ' + offsetText);
                        });

                        return (
                            '<td class="text-pre search-source">' + startedTimeDays.join('\n') + '</td>' +
                            '<td class="text-pre search-source">' + endedTimeDays.join('\n') + '</td>'
                        );
                    }

                    return (
                        '<td>' + new Date(autoreply.startedTime).toLocaleString() + '</td>' +
                        '<td>' + new Date(autoreply.endedTime).toLocaleString() + '</td>'
                    );
                })() +
                (function() {
                    if ('text' === autoreply.type) {
                        return '<td class="text-pre search-source">' + autoreply.text + '</td>';
                    } else if ('image' === autoreply.type) {
                        return (
                            '<td class="text-pre">' +
                                '<label class="search-source">圖像</label>' +
                                '<div class="position-relative image-container" style="width: 6rem; height: 6rem;">' +
                                    '<img class="image-fit" src="' + autoreply.src + '" alt="" />' +
                                '</div>' +
                            '</td>'
                        );
                    } else if ('imagemap' === autoreply.type) {
                        return '<td class="text-pre search-source">圖文訊息</td>';
                    } else if ('template' === autoreply.type) {
                        return '<td class="text-pre search-source">模板訊息</td>';
                    }
                    return '<td class="text-pre search-source"></td>';
                })() +
                '<td>' +
                    '<button type="button" class="mb-1 mr-1 btn btn-border btn-light update" data-toggle="modal" data-target="#autoreplyModal" aria-hidden="true">' +
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
        let $autoreplyRow = $(ev.target).parents('tr');
        let appId = $autoreplyRow.attr('app-id');
        let autoreplyId = $autoreplyRow.attr('autoreply-id');

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

    function autoreplySearch(ev) {
        if (!ev.target.value) {
            $('.autoreply-row').removeClass(['d-none', 'matched']);
            return;
        }

        let code = ev.keyCode || ev.which;
        // 按下 enter 鍵才進行搜尋
        if (13 !== code) {
            return;
        }

        let searchText = ev.target.value.toLocaleLowerCase();
        let $searchSrcs = $('.search-source');
        $searchSrcs.each((i, elem) => {
            let isMatch = elem.textContent.toLocaleLowerCase().includes(searchText);
            let $targetRow = $(elem).parents('tr');

            if (isMatch) {
                $targetRow.removeClass('d-none').addClass('matched');
            } else if (!$targetRow.hasClass('matched')) {
                $targetRow.addClass('d-none');
            }
        });
    }

    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            let isOK = false;
            let $dialogModal = $('#dialog_modal');

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
        let YYYY = date.getFullYear();
        let MM = ten(date.getMonth() + 1);
        let DD = ten(date.getDate());
        let hh = ten(date.getHours());
        let mm = ten(date.getMinutes());
        let ss = ten(date.getSeconds());

        function ten(i) {
            return (i < 10 ? '0' : '') + i;
        }

        return YYYY + '-' + MM + '-' + DD + 'T' +
                hh + ':' + mm + ':' + ss;
    }
})();
