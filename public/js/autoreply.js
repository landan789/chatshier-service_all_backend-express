/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var $dropdownMenu = $appDropdown.find('.dropdown-menu');
    var api = window.restfulAPI;
    var userId = '';
    var nowSelectAppId = '';
    window.auth.ready.then((currentUser) => {
        userId = currentUser.uid;
        // 設定 bootstrap notify 的預設值
        // 1. 設定為顯示後2秒自動消失
        // 2. 預設位置為螢幕中間上方
        // 3. 進場與結束使用淡入淡出
        $.notifyDefaults({
            delay: 2000,
            placement: {
                from: 'top',
                align: 'center'
            },
            animate: {
                enter: 'animated fadeInDown',
                exit: 'animated fadeOutUp'
            }
        });

        $(document).on('click', '#modal-submit', dataInsert); // 新增
        $(document).on('click', '#edit-btn', openEdit); // 打開編輯modal
        $(document).on('click', '#edit-submit', dataUpdate);
        $(document).on('click', '#delete-btn', dataRemove); // 刪除

        return api.app.getAll(userId);
    }).then(function(respJson) {
        var appsData = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        for (var appId in appsData) {
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
            .addClass('btn btn-default fa fa-trash-o')
            .attr('id', 'delete-btn');
    };

    function dataInsert() {
        $('#modal-submit').attr('disabled', 'disabled');
        let appId = $('#app-select option:selected').attr('id');
        let starttime = Date.parse($('#starttime').val());
        let endtime = Date.parse($('#endtime').val());
        let name = $('#modal-task-name').val();
        let textInput = $('#enter-text').val();
        let autoreplyData = {
            title: name,
            startedTime: starttime,
            endedTime: endtime,
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
        });
    }

    function findOne(appId, userId) {
        $('#autoreply-tables').empty();
        return api.autoreply.getOne(appId, userId).then(function(resJson) {
            let autoreplies = resJson.data[appId].autoreplies;
            for (let autoreplyId in autoreplies) {
                let autoreply = autoreplies[autoreplyId];

                var list = new TableObj();
                var title = list.th.text(autoreply.title);
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
            var dialogModalTemplate =
                '<div id="dialog_modal" class="modal fade" tabindex="-1" role="dialog">' +
                '<div class="modal-dialog" role="document">' +
                '<div class="modal-content">' +
                '<div class="modal-body">' +
                '<h4>' + textContent + '</h4>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-primary">確定</button>' +
                '<button type="button" class="btn btn-secondary">取消</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
            $('body').append(dialogModalTemplate);
            dialogModalTemplate = void 0;

            var isOK = false;
            var $dialogModal = $('#dialog_modal');

            $dialogModal.find('.btn-primary').on('click', function() {
                isOK = true;
                resolve(isOK);
                $dialogModal.remove();
            });

            $dialogModal.find('.btn-secondary').on('click', function() {
                resolve(isOK);
                $dialogModal.remove();
            });

            $dialogModal.modal({
                backdrop: false,
                show: true
            });
        });
    }
})();
