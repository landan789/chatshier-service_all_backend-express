/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var allComposesData = {};
    var composesData = {};
    var api = window.restfulAPI;
    var socket = io.connect(); // Socket
    var inputNum = 0; //計算訊息的數量
    var inputObj = {};
    var deleteNum = 0;
    var appId = '';
    var userId = '';
    var nowSelectAppId = '';
    var sendtime;
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $dropdownMenu = $appDropdown.find('.dropdown-menu');
    var $composeEditModal = $('#editModal');
    var $composesAddModal = $('#quickAdd');
    var $appSelector = $('#app-select');
    var $historyTableElem = null;
    var $draftTableElem = null;
    var $reservationTableElem = null;
    var timeInMs = (Date.now() + 1000);
    window.auth.ready.then(function(currentUser) {
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
        // ACTIONS
        $(document).on('change', '#app-select', storeApp);
        $(document).on('click', '.tablinks', clickMsg);
        $(document).on('click', '#btn-text', btnText);
        $(document).on('click', '#remove-btn', removeInput);
        $(document).on('click', '#modal-submit', insertSubmit); //新增
        $composesAddModal.find('#quickAdd').on('click', insertSubmit);
        $historyTableElem = $('#composes_history_table tbody');
        $reservationTableElem = $('#composes_reservation_table tbody');
        $draftTableElem = $('#composes_draft_table tbody');
        // FUNCTIONs

        function storeApp() {
            appId = $(this).find(':selected').attr('id');
        } // end of loadFriendsReply

        function removeInput() {
            var id = $(this).parent().find('form').find('textarea').attr('id');
            deleteNum++;
            delete inputObj[id];
            if (inputNum - deleteNum < 4) { $('.error_msg').hide() }
            $(this).parent().remove();
        }

        function clickMsg() { // 更換switch
            var target = $(this).attr('rel');
            $("#" + target).show().siblings().hide();
        }

        function btnText() {
            $('.error-input').hide();
            inputNum++;
            if (inputNum - deleteNum > 3) {
                $('.error-msg').show();
                console.log('超過三則訊息');
                inputNum--;
            } else {
                $('#inputText').append(
                    '<div style="margin:2%">' +
                    '<span class="remove-btn">刪除</span>' +
                    '<tr>' +
                    '<th style="padding:1.5%; background-color: #ddd">輸入文字:</th>' +
                    '</tr>' +
                    '<tr>' +
                    '<td style="background-color: #ddd">' +
                    '<form style="padding:1%">' +
                    '<textarea class="textinput" id="inputNum' + inputNum + '" row="5"></textarea>' +
                    '</form>' +
                    '</td>' +
                    '</tr>' +
                    '</div>');
                inputObj['inputNum' + inputNum] = 'inputNum' + inputNum;
            }
        }

        $composeEditModal.on('shown.bs.modal', function(event) {
            var targetRow = $(event.relatedTarget).parent().parent();
            var appId = targetRow.attr('text');
            var composeId = targetRow.attr('id');
            var $editForm = $composeEditModal.find('.modal-body form');
            var targetData = composesData[composeId];
            $editForm.find('#edit-time').val(ISODateTimeString(targetData.time));
            $editForm.find('#edutinput').val(targetData.text);
            $composeEditModal.find('#edit-submit').off('click').on('click', function() {
                $composeEditModal.find('#edit-submit').attr('disabled', 'disabled');
                var isDraft = $composeEditModal.find('input[name="modal-draft"]').prop('checked');
                targetData.text = $editForm.find('#edutinput').val();
                targetData.time = Date.parse($editForm.find('#edit-time').val());
                if (true === isDraft) {
                    targetData.status = 0;
                    targetData.text = $editForm.find('#edutinput').val();
                    targetData.time = Date.parse($editForm.find('#edit-time').val());
                } else {
                    targetData.status = 1;
                }
                return api.composes.update(appId, composeId, userId, targetData).then(function() {
                    $composeEditModal.modal('hide');
                    $.notify('修改成功！', { type: 'success' });
                    $composeEditModal.find('#edit-submit').removeAttr('disabled');
                    return loadComposes(appId, userId);
                });
            });
        });
        return api.app.getAll(userId);
    }).then(function(respJson) {
        allComposesData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in allComposesData) {
            $dropdownMenu.append('<li><a id="' + appId + '">' + allComposesData[appId].name + '</a></li>');
            $appSelector.append('<option id="' + appId + '">' + allComposesData[appId].name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        $appDropdown.find('.dropdown-text').text(allComposesData[nowSelectAppId].name);
        loadComposes(nowSelectAppId, userId);
        $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadComposes(nowSelectAppId, userId);
    }

    var TableObj = function() {
        this.tr = $('<tr>').attr('id', 'text');
        this.th = $('<th>').attr('id', 'text');
        this.td1 = $('<td>').attr('id', 'time');
        this.td2 = $('<td>').attr('id', 'status');
        this.td3 = $('<td>');
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

    function loadComposes(appId, userId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        $historyTableElem.empty();
        $draftTableElem.empty();
        $reservationTableElem.empty();
        return api.composes.getOne(appId, userId).then(function(resJson) {
            composesData = resJson.data[appId].composes;
            for (var composeId in composesData) {
                var composeData = composesData[composeId];
                if (composeData.isDeleted) {
                    continue;
                }
                var list = new TableObj();
                var text = list.th.text(composeData.text);
                var time = list.td1.text(ToLocalTimeString(composeData.time));
                var btns = list.td2.append(list.UpdateBtn, list.DeleteBtn);
                var trGrop = list.tr.attr('id', composeId).attr('text', appId).append(text, time, btns);
                if (0 === composeData.status) {
                    $draftTableElem.append(trGrop);
                } else if (1 === composeData.status && composeData.time > timeInMs) {
                    $reservationTableElem.append(trGrop);
                } else if (1 === composeData.status && (composeData.time < timeInMs || composeData.time === timeInMs)) {
                    $historyTableElem.append(trGrop);
                }
            }

            $jqDoc.find('td #delete-btn').off('click').on('click', function(event) {
                var targetRow = $(event.target).parent().parent();
                var appId = targetRow.attr('text');
                var composeId = targetRow.attr('id');

                return showDialog('確定要刪除嗎？').then(function(isOK) {
                    if (!isOK) {
                        return;
                    }

                    return api.composes.remove(appId, composeId, userId).then(function() {
                        $.notify('刪除成功！', { type: 'success' });
                        return loadComposes(appId, userId);
                    });
                });
            });
        });
    }

    function ToLocalTimeString(millisecond) {
        var date = new Date(millisecond);
        var localDate = date.toLocaleDateString();
        var localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    function insertSubmit() {
        $composesAddModal.find('#modal-submit').attr('disabled', 'disabled');
        var isDraft = $composesAddModal.find('input[name="modal-draft"]').prop('checked');
        let messages = [];
        if (0 === inputObj.length) {
            $('.error-input').show();
        } else {
            sendtime = $('#send-time').val();

            if ($('#send-now').prop('checked')) {
                for (let key in inputObj) {
                    let message = {
                        type: 'text',
                        text: $('#' + key).val()
                    };
                    messages.push(message);
                }
                let composes = {};
                for (let i in messages) {
                    composes = {
                        status: isDraft ? 0 : 1,
                        time: (timeInMs - 10000),
                        text: messages[i].text
                    };
                    socket.emit('insert compose', { userId, composes, appId });
                }

                var emitData = {
                    userId: userId,
                    messages: messages,
                    appId: appId
                };
                if (false === isDraft) {
                    socket.emit('push composes to all', emitData);
                }
                $('#quickAdd').modal('hide');
                $('.textinput').val('');
                $('#send-time').val('');
                $('#inputText').empty();
                inputNum = 0;
                $.notify('發送成功', { type: 'success' });
                $appDropdown.find('.dropdown-text').text(allComposesData[appId].name);
                $composesAddModal.find('#modal-submit').removeAttr('disabled');
                return loadComposes(appId, userId);
            }
        }
        // ==========
        // 檢查資料有無輸入
        // $errorMsgElem.empty().hide();
        // if (!appId) {
        //     $errorMsgElem.text('請選擇目標App').show();
        //     return;
        // } else if (!keyword) {
        //     $errorMsgElem.text('請輸入關鍵字').show();
        //     return;
        // } else if (!textContent) {
        //     $errorMsgElem.text('請輸入關鍵字回覆的內容').show();
        //     return;
        // }
        // ==========
        if ($('#send-sometime').prop('checked')) {
            let messages = [];
            for (let key in inputObj) {
                let message = {
                    type: 'text',
                    text: $('#' + key).val()
                };
                messages.push(message);
            }
            for (let message in messages) {
                let composeData = {
                    type: 'text',
                    text: messages[message].text,
                    status: isDraft ? 0 : 1,
                    time: Date.parse(sendtime)
                };
                api.composes.insert(appId, userId, composeData).then(function(resJson) {});
            }
            $('#quickAdd').modal('hide');
            $('.textinput').val('');
            $('#send-time').val('');
            $('#inputText').empty();
            inputNum = 0;
            $.notify('新增成功', { type: 'success' });
            $appDropdown.find('.dropdown-text').text(allComposesData[appId].name);
            return loadComposes(appId, userId);
        }
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
})();
