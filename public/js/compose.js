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
    var $composeEditModal = $('#editModal');
    var $composesAddModal = $('#quickAdd');
    var $appSelector = $('#app-select');
    var $historyTableElem = null;
    var $draftTableElem = null;
    var $reservationTableElem = null;
    var timeInMs = (Date.now() + 1000);


    var $sendDatetimePicker = $('#send-datetime-picker');

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
        $(document).on('click', '.remove-btn', removeInput);
        $(document).on('click', '#modal-submit', insertSubmit);
        $(document).on('click', '#add-btn', cleanmodal);
        $(document).on('change paste keyup', '.search-bar', dataSearch);
        $composesAddModal.find('#quickAdd').on('click', insertSubmit);
        $historyTableElem = $('#composes_history_table tbody');
        $reservationTableElem = $('#composes_reservation_table tbody');
        $draftTableElem = $('#composes_draft_table tbody');
        let options = {
            locale: 'zh-tw',
            sideBySide: true,
            minDate: Date.now()
        };
        $sendDatetimePicker.datetimepicker(options);

        // FUNCTIONs

        function storeApp() {
            appId = '';
            appId = $(this).find(':selected').attr('id');
        } // end of loadFriendsReply

        function removeInput() {
            var id = $(this).parent().find('form').find('textarea').attr('id');
            deleteNum++;
            delete inputObj[id];
            if (inputNum - deleteNum < 4) { $('.error_msg').hide() };
            $(this).parent().remove();
        }

        function clickMsg() { // 更換switch
            var target = $(this).attr('rel');
            $('#' + target).show().siblings().hide();
        }

        function btnText() {
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
                    '<textarea name="inputNum' + inputNum + '" class="textinput" id="inputNum' + inputNum + '" row="5"></textarea>' +
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
                var text = list.th.attr('data-title', composeData.text).text(composeData.text);
                var time = list.td1.text(ToLocalTimeString(composeData.time));

                list.DeleteBtn.off('click').on('click', function(event) {
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
        });
    }

    function dataSearch() {
        let searchText = $(this).val().toLocaleLowerCase();
        if (!searchText) {
            $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().removeAttr('style');
            return;
        }
        $('tbody>tr>th:not([data-title*="' + searchText + '"]').parent().css('display', 'none');
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

    function cleanmodal() {
        $('.error-msg').hide();
        $('.error-input').hide();
        $('.textinput').val('');
        $('#send-time').val('');
        $('#inputText').empty();
        inputObj = {};
        inputNum = 0;
        deleteNum = 0;
    }

    function insertSubmit() {
        var $errorMsgElem = $composesAddModal.find('.error-input');
        var isDraft = $composesAddModal.find('input[name="modal-draft"]').prop('checked');
        var sendTime = $composesAddModal.find('#send-time').val();
        let messages = [];
        $errorMsgElem.empty().hide();

        var isTextVaild = true;
        $('.textinput').each(function() {
            isTextVaild &= !!$(this).val();
        });
        if (new Date(sendTime).getTime() < Date.now()) {
            $errorMsgElem.text('群發時間必須大於現在時間').show();
            return;
        };

        if (!isTextVaild) {
            $errorMsgElem.text('請輸入群發的內容').show();
            return;
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
                    $composesAddModal.modal('hide');
                    $('.form-control').val(allComposesData[appId].name);
                    $('.textinput').val('');
                    $('#send-time').val('');
                    $('#inputText').empty();
                    inputNum = 0;
                    $.notify('發送成功', { type: 'success' });
                    $appDropdown.find('.dropdown-text').text(allComposesData[appId].name);
                    $composesAddModal.find('#modal-submit').removeAttr('disabled');
                    return loadComposes(appId, userId);
                } else {
                    $composesAddModal.modal('hide');
                    $('.form-control').val(allComposesData[appId].name);
                    $('.textinput').val('');
                    $('#send-time').val('');
                    $('#inputText').empty();
                    inputNum = 0;
                    $.notify('儲存成功', { type: 'success' });
                    $appDropdown.find('.dropdown-text').text(allComposesData[appId].name);
                    $composesAddModal.find('#modal-submit').removeAttr('disabled');
                    return loadComposes(appId, userId);
                }
            }
        };
        if ($('#send-sometime').prop('checked')) {
            let messages = [];
            for (let key in inputObj) {
                let message = {
                    type: 'text',
                    text: $('#' + key).val()
                };
                messages.push(message);
            };

            Promise.all(messages.map((message) => {
                let compose = {
                    type: 'text',
                    text: message.text,
                    status: isDraft ? 0 : 1,
                    time: Date.parse(sendtime)
                };
                return api.composes.insert(appId, userId, compose);
            })).then((responses) => {
                responses.map((response) => {
                    if (0 === response.stats) {
                        return;
                    };
                    let appsComposes = response.data;
                    let appId = Object.keys(appsComposes)[0];
                    let composes = appsComposes[appId].composes;
                    let composeId = Object.keys(composes)[0];
                    let compose = composes[composeId];
                    var list = new TableObj();
                    var text = list.th.attr('data-title', compose.text).text(compose.text);
                    var time = list.td1.text(ToLocalTimeString(compose.time));
                    var btns = list.td2.append(list.UpdateBtn, list.DeleteBtn);
                    var trGrop = list.tr.attr('id', composeId).attr('text', appId).append(text, time, btns);
                    if (0 === compose.status) {
                        $draftTableElem.append(trGrop);
                    } else if (1 === compose.status && compose.time > timeInMs) {
                        $reservationTableElem.append(trGrop);
                    } else if (1 === compose.status && (compose.time < timeInMs || compose.time === timeInMs)) {
                        $historyTableElem.append(trGrop);
                    }
                    composesData[composeId] = compose;
                });
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
                $composesAddModal.modal('hide');
                $.notify('新增成功', { type: 'success' });
            }).catch(() => {
                $.notify('新增失敗', { type: 'warning' });
            });
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