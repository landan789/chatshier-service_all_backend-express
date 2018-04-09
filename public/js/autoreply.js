/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var date = Date.now();
    var $autoreplyAddSdtPicker = $('.autoreply-add.modal #start_datetime_picker');
    var $autoreplyAddEdtPicker = $('.autoreply-add.modal #end_datetime_picker');
    var $autoreplyEditSdtPicker = $('#editModal #start_datetime_picker');
    var $autoreplyEditEdtPicker = $('#editModal #end_datetime_picker');

    var datetimePickerInitOpts = {
        sideBySide: true,
        locale: 'zh-tw',
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

    datetimePickerInitOpts.defaultDate = date;
    $autoreplyEditSdtPicker.datetimepicker(datetimePickerInitOpts);
    $autoreplyEditEdtPicker.datetimepicker(datetimePickerInitOpts);

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
    $(document).on('click', '#modal-submit', dataInsert); // 新增
    $(document).on('click', '#edit-btn', openEdit); // 打開編輯modal
    $(document).on('click', '#edit-submit', dataUpdate);
    $(document).on('click', '#delete-btn', dataRemove); // 刪除
    $(document).on('change paste keyup', '.search-bar', dataSearch);

    return api.apps.findAll(userId).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }

            $dropdownMenu.append('<li><a id="' + appId + '">' + appsData[appId].name + '</a></li>');
            $appSelector.append('<option id="' + appId + '">' + appsData[appId].name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadAutoreplies(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadAutoreplies(nowSelectAppId, userId);
    }

    function dataInsert() {
        $('#modal-submit').attr('disabled', 'disabled');
        let appId = $('#app-select option:selected').attr('id');
        let startedTime = $autoreplyAddSdtPicker.data('DateTimePicker').date().toDate().getTime();
        let endedTime = $autoreplyAddEdtPicker.data('DateTimePicker').date().toDate().getTime();

        let name = $('#modal-task-name').val();
        let textInput = $('#enter-text').val();
        let autoreplyData = {
            title: name,
            startedTime: startedTime,
            endedTime: endedTime,
            text: textInput
        };

        return api.appsAutoreplies.insert(appId, userId, autoreplyData).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];

            $('#autoreply-tables').append(
                '<tr id="' + autoreplyId + '" rel="' + appId + '">' +
                    '<th id="title">' + autoreply.title + '</th>' +
                    '<td id="started-time" rel="' + autoreply.startedTime + '">' + new Date(autoreply.startedTime).toLocaleString() + '</td>' +
                    '<td id="ended-time" rel="' + autoreply.endedTime + '">' + new Date(autoreply.endedTime).toLocaleString() + '</td>' +
                    '<td id="text">' + autoreply.text + '</td>' +
                    '<td>' +
                        '<button type="button" class="btn btn-grey fa fa-pencil" id="edit-btn" data-toggle="modal" data-target="#editModal" aria-hidden="true"></button>' +
                        '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                    '</td>' +
                '</tr>'
            );
            $('#quickAdd').modal('hide');
            $('#modal-task-name').val('');
            $('#starttime').val('');
            $('#endtime').val('');
            $('#enter-text').val('');
            $appDropdown.find('#' + appId).click();
            $.notify('新增成功！', { type: 'success' });
            $('#modal-submit').removeAttr('disabled');
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $('#quickAdd').modal('hide');
                $('#modal-task-name').val('');
                $('#starttime').val('');
                $('#endtime').val('');
                $('#enter-text').val('');
                $.notify('失敗', { type: 'danger' });
                $('#modal-submit').removeAttr('disabled');
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $('#quickAdd').modal('hide');
                $('#modal-task-name').val('');
                $('#starttime').val('');
                $('#endtime').val('');
                $('#enter-text').val('');
                $.notify('無此權限', { type: 'danger' });
                $('#modal-submit').removeAttr('disabled');
            }
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
                            '<th id="title" data-title="' + autoreply.title + '">' + autoreply.title + '</th>' +
                            '<td id="started-time" rel="' + autoreply.startedTime + '">' + new Date(autoreply.startedTime).toLocaleString() + '</td>' +
                            '<td id="ended-time" rel="' + autoreply.endedTime + '">' + new Date(autoreply.endedTime).toLocaleString() + '</td>' +
                            '<td id="text">' + autoreply.text + '</td>' +
                            '<td>' +
                                '<button type="button" class="btn btn-grey fa fa-pencil" id="edit-btn" data-toggle="modal" data-target="#editModal" aria-hidden="true"></button>' +
                                '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                            '</td>' +
                        '</tr>'
                    );
                }
            }
        });
    }

    function dataUpdate() {
        $('#edit-submit').attr('disabled', 'disabled');
        let appId = $(this).parent().parent().find('#edit-appid').text();
        let autoreplyId = $(this).parent().parent().find('#edit-autoreplyid').text();
        let name = $('#edit-taskTitle').val(); // 標題
        let starttime = $autoreplyEditSdtPicker.data('DateTimePicker').date(); // 開始時間
        let endtime = $autoreplyEditEdtPicker.data('DateTimePicker').date(); // 結束時間
        let textInput = $('#edit-taskContent').val(); // 任務內容
        var data = {
            title: name,
            startedTime: starttime,
            endedTime: endtime,
            text: textInput
        };
        return api.appsAutoreplies.update(appId, autoreplyId, userId, data).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];

            $('#' + autoreplyId).empty();
            $('#' + autoreplyId).append(
                '<th id="title">' + autoreply.title + '</th>' +
                '<td id="started-time" rel="' + autoreply.startedTime + '">' + new Date(autoreply.startedTime).toLocaleString() + '</td>' +
                '<td id="ended-time" rel="' + autoreply.endedTime + '">' + new Date(autoreply.endedTime).toLocaleString() + '</td>' +
                '<td id="text">' + autoreply.text + '</td>' +
                '<td>' +
                    '<button type="button" class="btn btn-grey fa fa-pencil" id="edit-btn" data-toggle="modal" data-target="#editModal" aria-hidden="true"></button>' +
                    '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                '</td>'
            );

            // 塞入資料庫並初始化
            $('#editModal').modal('hide');
            $('#edit-appid').text('');
            $('#edit-autoreplyid').text('');
            $('#edit-taskTitle').val('');
            $('#edit-taskStart').val('');
            $('#edit-taskEnd').val('');
            $('#edit-taskContent').val('');
            $.notify('修改成功！', { type: 'success' });
            $('#edit-submit').removeAttr('disabled');
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $('#editModal').modal('hide');
                $.notify('失敗', { type: 'danger' });
                $('#edit-submit').removeAttr('disabled');
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $('#editModal').modal('hide');
                $.notify('無此權限', { type: 'danger' });
                $('#edit-submit').removeAttr('disabled');
            }
        });
    }

    function dataRemove() {
        var userId;
        try {
            var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
            userId = payload.uid;
        } catch (ex) {
            userId = '';
        }        
        let appId = $(this).parent().parent().attr('rel');
        let autoreplyId = $(this).parent().parent().attr('id');
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
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                }
            });
        });
    }

    function openEdit() {
        let appId = $(this).parent().parent().attr('rel');
        let autoreplyId = $(this).parent().parent().attr('id');
        let title = $(this).parent().parent().find('#title').text();
        let startedTime = new Date($(this).parent().parent().find('#started-time').attr('rel')).toLocaleString();
        startedTime = startedTime.split('.')[0];
        let endedTime = new Date($(this).parent().parent().find('#ended-time').attr('rel')).toLocaleString();
        endedTime = endedTime.split('.')[0];
        let text = $(this).parent().parent().find('#text').text();
        // Initialize
        $('#edit-appid').text(appId);
        $('#edit-autoreplyid').text(autoreplyId);
        $('#edit-taskTitle').val(title); // 標題
        $('#edit-taskStart').val(startedTime); // 開始時間
        $('#edit-taskEnd').val(endedTime); // 結束時間
        $('#edit-taskContent').val(text); // 任務內容
    } // end open edit

    function dataSearch() {
        let searchText = $(this).val().toLocaleLowerCase();
        if (!searchText) {
            $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().removeAttr('style');
            return;
        }
        $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().css('display', 'none');
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
})();