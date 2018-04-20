/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var $autoreplyAddModal = $('#autoreplyAddModal');
    var $autoreplyAddSdtPicker = $autoreplyAddModal.find('#startDatetimePicker');
    var $autoreplyAddEdtPicker = $autoreplyAddModal.find('#endDatetimePicker');
    var $autoreplyAddSdtInput = $autoreplyAddSdtPicker.find('input[name="startDatetime"]');
    var $autoreplyAddEdtInput = $autoreplyAddEdtPicker.find('input[name="endDatetime"]');

    var $autoreplyEditModal = $('#autoreplyEditModal');
    var $autoreplyEditSdtPicker = $autoreplyEditModal.find('#startDatetimePicker');
    var $autoreplyEditEdtPicker = $autoreplyEditModal.find('#endDatetimePicker');
    var $autoreplyEditSdtInput = $autoreplyEditSdtPicker.find('input[name="startDatetime"]');
    var $autoreplyEditEdtInput = $autoreplyEditEdtPicker.find('input[name="endDatetime"]');

    var api = window.restfulAPI;
    var nowSelectAppId = '';

    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }
    $autoreplyAddModal.on('click', '#addSubmitBtn', dataInsert);
    $autoreplyEditModal.on('click', '#editSubmitBtn', dataUpdate);
    $(document).on('click', '#edit-btn', openEdit); // 打開編輯modal
    $(document).on('click', '#delete-btn', dataRemove); // 刪除
    $(document).on('change paste keyup', '.search-bar', dataSearch);

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

        $autoreplyAddModal.on('show.bs.modal', function() {
            $autoreplyAddSdtPicker.data('DateTimePicker').date(new Date());
            $autoreplyAddEdtPicker.data('DateTimePicker').clear();
        });
    } else {
        $autoreplyAddSdtInput.attr('type', 'datetime-local');
        $autoreplyAddEdtInput.attr('type', 'datetime-local');
        $autoreplyEditSdtInput.attr('type', 'datetime-local');
        $autoreplyEditEdtInput.attr('type', 'datetime-local');
        $autoreplyAddSdtPicker.on('click', '.input-group-prepend', function() {
            $autoreplyAddSdtInput.focus();
        });
        $autoreplyAddEdtPicker.on('click', '.input-group-prepend', function() {
            $autoreplyAddEdtInput.focus();
        });
        $autoreplyEditSdtPicker.on('click', '.input-group-prepend', function() {
            $autoreplyEditSdtInput.focus();
        });
        $autoreplyEditEdtPicker.on('click', '.input-group-prepend', function() {
            $autoreplyEditEdtInput.focus();
        });

        $autoreplyAddModal.on('show.bs.modal', function() {
            $autoreplyAddSdtInput.val(toDatetimeLocal(new Date()));
            $autoreplyAddEdtInput.val();
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

    function dataInsert() {
        $('#addSubmitBtn').attr('disabled', true);
        let appId = $appSelector.find('option:selected').val();

        let startedTime;
        let endedTime;
        let startTimePickerData = $autoreplyAddSdtPicker.data('DateTimePicker');
        let endTimePickerData = $autoreplyAddSdtPicker.data('DateTimePicker');
        if (startTimePickerData && endTimePickerData) {
            startedTime = startTimePickerData.date().toDate().getTime();
            endedTime = endTimePickerData.date().toDate().getTime();
        } else {
            startedTime = new Date($autoreplyAddSdtInput.val()).getTime();
            endedTime = new Date($autoreplyAddEdtInput.val()).getTime();
        }

        let name = $('#modal-task-name').val();
        let textInput = $('#enter-text').val();
        let autoreplyData = {
            title: name,
            startedTime: startedTime,
            endedTime: endedTime,
            text: textInput
        };

        return api.appsAutoreplies.insert(appId, userId, autoreplyData).then(function(resJson) {
            // let autoreplies = resJson.data[appId].autoreplies;
            // let autoreplyId = Object.keys(autoreplies);
            // let autoreply = autoreplies[autoreplyId[0]];

            $autoreplyAddModal.modal('hide');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            $appDropdown.find('#' + appId).click();
            $('#addSubmitBtn').removeAttr('disabled');
            $.notify('新增成功！', { type: 'success' });
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $autoreplyAddModal.modal('hide');
                $('#modal-task-name').val('');
                $('#starttime').val('');
                $('#endtime').val('');
                $('#enter-text').val('');
                $('#addSubmitBtn').removeAttr('disabled');
                $.notify('失敗', { type: 'danger' });
                return;
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $autoreplyAddModal.modal('hide');
                $('#modal-task-name').val('');
                $('#starttime').val('');
                $('#endtime').val('');
                $('#enter-text').val('');
                $('#addSubmitBtn').removeAttr('disabled');
                $.notify('無此權限', { type: 'danger' });
                return;
            }

            $autoreplyAddModal.modal('hide');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            $('#addSubmitBtn').removeAttr('disabled');
            $.notify('失敗', { type: 'danger' });
        });
    }

    function loadAutoreplies(appId, userId) {
        $('#autoreply-tables').empty();
        return api.appsAutoreplies.findAll(appId, userId).then(function(resJson) {
            let appsAutoreplies = resJson.data;
            if (appsAutoreplies && appsAutoreplies[appId]) {
                let autoreplies = appsAutoreplies[appId].autoreplies;
                for (let autoreplyId in autoreplies) {
                    let autoreply = autoreplies[autoreplyId];

                    $('#autoreply-tables').append(
                        '<tr id="' + autoreplyId + '" rel="' + appId + '">' +
                            '<th class="mb-2" id="title" data-title="' + autoreply.title + '">' + autoreply.title + '</th>' +
                            '<td id="started-time" rel="' + autoreply.startedTime + '">' + new Date(autoreply.startedTime).toLocaleString() + '</td>' +
                            '<td id="ended-time" rel="' + autoreply.endedTime + '">' + new Date(autoreply.endedTime).toLocaleString() + '</td>' +
                            '<td id="text" data-title="' + autoreply.text + '">' + autoreply.text + '</td>' +
                            '<td>' +
                                '<button type="button" class="btn btn-border btn-light update" id="edit-btn" data-toggle="modal" data-target="#autoreplyEditModal" aria-hidden="true">' +
                                    '<i class="fas fa-edit"></i>' +
                                '</button>' +
                                '<button type="button" class="btn btn-danger remove" id="delete-btn">' +
                                    '<i class="fas fa-trash-alt"></i>' +
                                '</button>' +
                            '</td>' +
                        '</tr>'
                    );
                }
            }
        });
    }

    function dataUpdate() {
        $('#editSubmitBtn').attr('disabled', true);
        let $modalContent = $(this).parents('.modal-content');
        let appId = $modalContent.find('#edit-appid').text();
        let autoreplyId = $modalContent.find('#edit-autoreplyid').text();
        let name = $('#edit-taskTitle').val(); // 標題

        let startedTime;
        let endedTime;
        let startTimePickerData = $autoreplyEditSdtPicker.data('DateTimePicker');
        let endTimePickerData = $autoreplyEditEdtPicker.data('DateTimePicker');
        if (startTimePickerData && endTimePickerData) {
            startedTime = startTimePickerData.date().toDate().getTime();
            endedTime = endTimePickerData.date().toDate().getTime();
        } else {
            startedTime = new Date($autoreplyEditSdtInput.val()).getTime();
            endedTime = new Date($autoreplyEditEdtInput.val()).getTime();
        }

        let textInput = $('#edit-taskContent').val(); // 任務內容
        var autoreply = {
            title: name,
            startedTime: startedTime,
            endedTime: endedTime,
            text: textInput
        };
        return api.appsAutoreplies.update(appId, autoreplyId, userId, autoreply).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];

            var $targetAutoreply = $('#' + autoreplyId);
            $targetAutoreply.find('#title').text(autoreply.title);
            $targetAutoreply.find('#started-time')
                .text(new Date(autoreply.startedTime).toLocaleString())
                .attr('rel', autoreply.startedTime);
            $targetAutoreply.find('#ended-time')
                .text(new Date(autoreply.endedTime).toLocaleString())
                .attr('rel', autoreply.endedTime);
            $targetAutoreply.find('#text').text(autoreply.text);

            // 塞入資料庫並初始化
            $('#edit-appid').text('');
            $('#edit-autoreplyid').text('');
            $('#edit-taskTitle').val('');
            $('#edit-taskStart').val('');
            $('#edit-taskEnd').val('');
            $('#edit-taskContent').val('');

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

    function dataRemove() {
        let $autoreplyRow = $(this).parents('tr');
        let appId = $autoreplyRow.attr('rel');
        let autoreplyId = $autoreplyRow.attr('id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsAutoreplies.remove(appId, autoreplyId, userId).then(function(resJson) {
                $('#' + autoreplyId).remove();
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
        let $autoreplyRow = $(this).parents('tr');
        let appId = $autoreplyRow.attr('rel');
        let autoreplyId = $autoreplyRow.attr('id');
        let title = $autoreplyRow.find('#title').text();
        let startedTime = new Date($autoreplyRow.find('#started-time').attr('rel'));
        let endedTime = new Date($autoreplyRow.find('#ended-time').attr('rel'));

        let text = $autoreplyRow.find('#text').text();

        $('#edit-appid').text(appId);
        $('#edit-autoreplyid').text(autoreplyId);
        $('#edit-taskTitle').val(title); // 標題
        $('#edit-taskContent').val(text); // 任務內容

        let startTimePickerData = $autoreplyEditSdtPicker.data('DateTimePicker');
        let endTimePickerData = $autoreplyEditEdtPicker.data('DateTimePicker');
        if (startTimePickerData && endTimePickerData) {
            startTimePickerData.date(startedTime);
            endTimePickerData.date(endedTime);
        } else {
            $autoreplyEditSdtInput.val(toDatetimeLocal(startedTime));
            $autoreplyEditEdtInput.val(toDatetimeLocal(endedTime));
        }
    } // end open edit

    function dataSearch(ev) {
        let searchText = $(this).val().toLocaleLowerCase();
        if (!searchText) {
            $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().removeAttr('style');
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
})();
