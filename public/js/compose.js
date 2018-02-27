/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var appsData = {};
    var composesData = {};
    var api = window.restfulAPI;
    var SOCKET_NAMESPACE = '/chatshier';
    const socket = io(SOCKET_NAMESPACE);
    var inputNum = 0; // 計算訊息的數量
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
    const unpermittedCode = '3.16';

    var $sendDatetimePicker = $('#send-datetime-picker');

    window.auth.ready.then(function(currentUser) {
        userId = currentUser.uid;

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
            if (inputNum - deleteNum < 4) { $('.error_msg').hide(); };
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
                    '</div>'
                );
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
                }).catch((resJson) => {
                    if (undefined === resJson.status) {
                        $composeEditModal.modal('hide');
                        $.notify('失敗', { type: 'danger' });
                        $composeEditModal.find('#edit-submit').removeAttr('disabled');
                        return loadComposes(appId, userId);
                    }
                    if (unpermittedCode === resJson.code) {
                        $composeEditModal.modal('hide');
                        $.notify('無此權限', { type: 'danger' });
                        $composeEditModal.find('#edit-submit').removeAttr('disabled');
                        return loadComposes(appId, userId);
                    }
                });
            });
        });
        return api.app.getAll(userId);
    }).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.app.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }
            socket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId);

            $dropdownMenu.append('<li><a id="' + appId + '">' + app.name + '</a></li>');
            $appSelector.append('<option id="' + appId + '">' + app.name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadComposes(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
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
            .addClass('btn btn-grey fa fa-pencil')
            .attr('id', 'edit-btn')
            .attr('data-toggle', 'modal')
            .attr('data-target', '#editModal')
            .attr('aria-hidden', 'true');
        this.DeleteBtn = $('<button>').attr('type', 'button')
            .addClass('btn btn-danger fa fa-trash-o')
            .attr('id', 'delete-btn');
    };

    function loadComposes(appId, userId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        $historyTableElem.empty();
        $draftTableElem.empty();
        $reservationTableElem.empty();
        return api.composes.getAll(appId, userId).then(function(resJson) {
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
                        }).catch((resJson) => {
                            if (undefined === resJson.status) {
                                $.notify('失敗', { type: 'danger' });
                            }
                            if (unpermittedCode === resJson.code) {
                                $.notify('無此權限', { type: 'danger' });
                            }
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

    function cleanmodal() {
        $('.error-msg').hide();
        $('.error-input').hide();
        $('.textinput').val('');
        $('#send-time').val('');
        $('#checkbox_value').prop('checked', false);
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
                let composes = [];
                for (let key in inputObj) {
                    let compose = {
                        type: 'text',
                        text: $('#' + key).val(),
                        status: 1,
                        time: (Date.now()) - 60000
                    };
                    composes.push(compose);
                }

                var emitData = {
                    userId: userId,
                    appId: appId,
                    composes: composes
                };
                if (false === isDraft) {
                    socket.emit('push composes to all', emitData);
                    $composesAddModal.modal('hide');
                    $('.form-control').val(appsData[appId].name);
                    $('.textinput').val('');
                    $('#send-time').val('');
                    $('#inputText').empty();
                    inputNum = 0;
                    socket.on('verify', (json) => {
                        if (!json) {
                            $.notify('發送成功', { type: 'success' });
                            $appDropdown.find('.dropdown-text').text(appsData[appId].name);
                            $composesAddModal.find('#modal-submit').removeAttr('disabled');
                            return loadComposes(appId, userId);
                        } else {
                            if (undefined === json.status) {
                                $composesAddModal.modal('hide');
                                $.notify('失敗', { type: 'danger' });
                                $composesAddModal.find('button.btn-update-submit').removeAttr('disabled');
                                return loadComposes(appId, userId);
                            }
                            if (unpermittedCode === json.code) {
                                $composesAddModal.modal('hide');
                                $.notify('無此權限', { type: 'danger' });
                                $composesAddModal.find('button.btn-update-submit').removeAttr('disabled');
                                return loadComposes(appId, userId);
                            }
                        }
                    });
                } else {
                    insert(appId, userId, isDraft, composes);
                    $composesAddModal.modal('hide');
                    $('.form-control').val(appsData[appId].name);
                    $('.textinput').val('');
                    $('#send-time').val('');
                    $('#inputText').empty();
                    inputNum = 0;
                    $.notify('儲存成功', { type: 'success' });
                    $appDropdown.find('.dropdown-text').text(appsData[appId].name);
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
            insert(appId, userId, isDraft, messages).then((responses) => {
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
                $composesAddModal.modal('hide');
                $.notify('新增成功', { type: 'success' });
            });
        }
    }

    function insert(appId, userId, isDraft, messages) {
        let respJsons = [];

        function nextPromise(i) {
            if (i >= messages.length) {
                return Promise.resolve(respJsons);
            };
            if (false === isDraft) {
                let compose = {
                    type: 'text',
                    text: messages[i].text,
                    status: isDraft ? 0 : 1,
                    time: Date.parse(sendtime)
                };
                return api.composes.insert(appId, userId, compose).then((resJson) => {
                    respJsons.push(resJson);
                    return nextPromise(i + 1);
                }).catch((resJson) => {
                    if (undefined === resJson.status) {
                        $composesAddModal.modal('hide');
                        $composesAddModal.find('#modal-submit').removeAttr('disabled');
                        $.notify('失敗', { type: 'danger' });
                        return loadComposes(appId, userId);
                    }
                    if (unpermittedCode === resJson.code) {
                        $composesAddModal.modal('hide');
                        $composesAddModal.find('#modal-submit').removeAttr('disabled');
                        $.notify('無此權限', { type: 'danger' });
                        return loadComposes(appId, userId);
                    }
                });
            } else {
                let compose = {
                    type: 'text',
                    text: messages[i].text,
                    status: isDraft ? 0 : 1,
                    time: Date.now()
                };
                return api.composes.insert(appId, userId, compose).then((resJson) => {
                    respJsons.push(resJson);
                    return nextPromise(i + 1);
                }).catch((resJson) => {
                    if (undefined === resJson.status) {
                        $composesAddModal.modal('hide');
                        $composesAddModal.find('#modal-submit').removeAttr('disabled');
                        $.notify('失敗', { type: 'danger' });
                        return loadComposes(appId, userId);
                    }
                    if (unpermittedCode === resJson.code) {
                        $composesAddModal.modal('hide');
                        $composesAddModal.find('#modal-submit').removeAttr('disabled');
                        $.notify('無此權限', { type: 'danger' });
                        return loadComposes(appId, userId);
                    }
                });
            }

        }
        return nextPromise(0);
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