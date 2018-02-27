/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');

    var $autoreplyAddSdtPicker = $('.autoreply-add.modal #start_datetime_picker');
    var $autoreplyAddEdtPicker = $('.autoreply-add.modal #end_datetime_picker');

    var api = window.restfulAPI;
    var userId = '';
    var nowSelectAppId = '';

    const NO_PERMISSION_CODE = '3.16';

    window.auth.ready.then((currentUser) => {
        userId = currentUser.uid;

        var currentDate = new Date();
        var datetimePickerInitOpts = {
            sideBySide: true,
            minDate: currentDate,
            defaultDate: currentDate,
            locale: 'zh-tw'
        };

        $autoreplyAddSdtPicker.datetimepicker(datetimePickerInitOpts);
        $autoreplyAddEdtPicker.datetimepicker(datetimePickerInitOpts);

        $(document).on('click', '#modal-submit', dataInsert); // 新增
        $(document).on('click', '#edit-btn', openEdit); // 打開編輯modal
        $(document).on('click', '#edit-submit', dataUpdate);
        $(document).on('click', '#delete-btn', dataRemove); // 刪除
        $(document).on('change paste keyup', '.search-bar', dataSearch);

        return api.app.getAll(userId);
    }).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.app.enums.type.CHATSHIER) {
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
            findOne(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        findOne(nowSelectAppId, userId);
    }

    var TableObj = function() {
        this.tr = $('<tr>');
        this.th = $('<th>').attr('id', 'title');
        this.td1 = $('<td>').attr('id', 'started-time');
        this.td2 = $('<td>').attr('id', 'ended-time');
        this.td3 = $('<td>').attr('id', 'text');
        this.td4 = $('<td>');
        this.UpdateBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-default fa fa-pencil')
            .attr('id', 'edit-btn')
            .attr('data-toggle', 'modal')
            .attr('data-target', '#editModal')
            .attr('aria-hidden', 'true');
        this.DeleteBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-danger fa fa-trash-o')
            .attr('id', 'delete-btn');
    };

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

        return api.autoreply.insert(appId, userId, autoreplyData).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];

            var list = new TableObj();
            var title = list.th.text(autoreply.title);
            var startedTime = list.td1.attr('rel', autoreply.startedTime).text(ToLocalTimeString(autoreply.startedTime));
            var endedTime = list.td2.attr('rel', autoreply.endedTime).text(ToLocalTimeString(autoreply.endedTime));
            var text = list.td3.text(autoreply.text);
            var btns = list.td4.append(list.UpdateBtn, list.DeleteBtn);
            var trGrop = list.tr.attr('id', autoreplyId).attr('rel', appId).append(title, startedTime, endedTime, text, btns);

            $('#autoreply-tables').append(trGrop);
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

    function findOne(appId, userId) {
        $('#autoreply-tables').empty();
        return api.autoreply.getAll(appId, userId).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            for (let autoreplyId in autoreplies) {
                let autoreply = autoreplies[autoreplyId];

                var list = new TableObj();
                var title = list.th.attr('data-title', autoreply.title).text(autoreply.title);
                var startedTime = list.td1.attr('rel', autoreply.startedTime).text(ToLocalTimeString(autoreply.startedTime));
                var endedTime = list.td2.attr('rel', autoreply.endedTime).text(ToLocalTimeString(autoreply.endedTime));
                var text = list.td3.text(autoreply.text);
                var btns = list.td4.append(list.UpdateBtn, list.DeleteBtn);
                var trGrop = list.tr.attr('id', autoreplyId).attr('rel', appId).append(title, startedTime, endedTime, text, btns);
                $('#autoreply-tables').append(trGrop);
            }
        });
    }

    function dataUpdate() {
        $('#edit-submit').attr('disabled', 'disabled');
        let appId = $(this).parent().parent().find('#edit-appid').text();
        let autoreplyId = $(this).parent().parent().find('#edit-autoreplyid').text();
        let userId = auth.currentUser.uid;
        let name = $('#edit-taskTitle').val(); // 標題
        let starttime = Date.parse($('#edit-taskStart').val()); // 開始時間
        let endtime = Date.parse($('#edit-taskEnd').val()); // 結束時間
        let textInput = $('#edit-taskContent').val(); // 任務內容
        var data = {
            title: name,
            startedTime: starttime,
            endedTime: endtime,
            text: textInput
        };
        return api.autoreply.update(appId, userId, autoreplyId, data).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            let autoreplyId = Object.keys(autoreplies);
            let autoreply = autoreplies[autoreplyId[0]];

            $('#' + autoreplyId).empty();
            var list = new TableObj();
            var title = list.th.text(autoreply.title);
            var startedTime = list.td1.attr('rel', autoreply.startedTime).text(ToLocalTimeString(autoreply.startedTime));
            var endedTime = list.td2.attr('rel', autoreply.endedTime).text(ToLocalTimeString(autoreply.endedTime));
            var text = list.td3.text(autoreply.text);
            var btns = list.td4.append(list.UpdateBtn, list.DeleteBtn);
            $('#' + autoreplyId).append(title, startedTime, endedTime, text, btns);

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
        let userId = auth.currentUser.uid;
        let appId = $(this).parent().parent().attr('rel');
        let autoreplyId = $(this).parent().parent().attr('id');
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.autoreply.remove(appId, userId, autoreplyId).then(function(resJson) {
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
        let startedTimeMilli = parseInt($(this).parent().parent().find('#started-time').attr('rel'));
        let startedTime = ISODateTimeString(startedTimeMilli);
        let endedTimeMilli = parseInt($(this).parent().parent().find('#ended-time').attr('rel'));
        let endedTime = ISODateTimeString(endedTimeMilli);
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

    function ISODateTimeString(d) {
        d = new Date(d);

        function pad(n) { return n < 10 ? '0' + n : n; }
        return d.getFullYear() + '-' +
            pad(d.getMonth() + 1) + '-' +
            pad(d.getDate()) + 'T' +
            pad(d.getHours()) + ':' +
            pad(d.getMinutes());
    }

    function ToLocalTimeString(millisecond) {
        var date = new Date(millisecond);
        var localDate = date.toLocaleDateString();
        var localTime = date.toLocaleTimeString();
        var localTimeString = localDate + localTime;
        return localTimeString;
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