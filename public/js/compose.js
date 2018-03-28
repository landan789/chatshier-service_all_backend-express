/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var appsData = {};
    var composesData = {};
    var api = window.restfulAPI;
    var SOCKET_NAMESPACE = '/chatshier';
    const socket = io(SOCKET_NAMESPACE);
    var inputNum = 0; // 計算訊息的數量
    var inputObj = {};
    var age = '';
    var gender = '';
    var field_ids = {};
    var appsFields = '';
    var deleteNum = 0;
    var nowSelectAppId = '';
    var modelSelectAppId = '';
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $composeEditModal = $('#editModal');
    var $composesAddModal = $('#quickAdd');
    var $appSelector = $('#app-select');
    var $customFields = $('#custom-fields');
    var $historyTableElem = null;
    var $draftTableElem = null;
    var $reservationTableElem = null;
    var timeInMs = (Date.now() + 1000);
    var fieldEnums = api.appsFields.enums;
    const NO_PERMISSION_CODE = '3.16';
    const DID_NOT_HAVE_TAGS = '15.6';

    var $sendDatetimePicker = $('#send-datetime-picker');

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    // ACTIONS
    $(document).on('change', '#app-select', storeApp);
    $(document).on('click', '.tablinks', clickMsg);
    $(document).on('click', '#btn-text', btnText);
    $(document).on('click', '.remove-btn', removeInput);
    $(document).on('click', '#modal-submit', insertSubmit);
    $(document).on('click', '#add-btn', cleanmodal);
    $(document).on('click', '#send-all', function () {
        let id = $(this).attr('rel');
        $('#' + id).hide();
    });
    $(document).on('click', '#send-somebody', function () {
        let id = $(this).attr('rel');
        $('#' + id).show();
    });
    $(document).on('click', 'button#field', appendInput);
    $(document).on('change paste keyup', '.search-bar', dataSearch);
    $(document).on('click', '#condition-close-btn', function() {
        let $conditionDiv = $(this).parent();
        let $fieldBtn = $(this).parent().parent().find('button#field');

        let btnName = $fieldBtn.attr('name');

        $fieldBtn.removeClass();
        $fieldBtn.attr('class', 'btn btn-grey');
        $fieldBtn.text(btnName);
        $fieldBtn.show();
        $conditionDiv.remove();
    });
    $(document).on('click', '#condition-check-btn', function() {
        let $conditionDiv = $(this).parent();
        let $conditionInput = $(this).parent().find('input');
        let $fieldBtn = $(this).parent().parent().find('button#field');

        let btnName = $fieldBtn.attr('name');
        let conditionValue = $conditionInput.val();

        $conditionDiv.hide();
        $conditionInput.attr('value', conditionValue);
        $fieldBtn.removeClass();
        $fieldBtn.attr('class', 'btn btn-info');
        $fieldBtn.text(btnName + ':' + conditionValue).show();
    });
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
        modelSelectAppId = $(this).find(':selected').val();
        appCustomerTagChanged();
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
        $('#edit-custom-fields').empty();
        var targetRow = $(event.relatedTarget).parent().parent();
        var appId = targetRow.attr('text');
        var composeId = targetRow.attr('id');
        var $editForm = $composeEditModal.find('.modal-body form');
        var targetData = composesData[composeId];
        var customFieldsElement = targetRow.find('#fields>#field');
        var customFields = {};
        customFieldsElement.each(function() {
            let fieldValue = $(this).text();
            let fieldId = $(this).attr('data-type');
            customFields[fieldId] = fieldValue;
        });

        var fields = appsFields[appId].fields;
        for (let fieldId in fields) {
            let field = fields[fieldId];
            if (field.isDeleted || ('age' !== field.alias && 'gender' !== field.alias && '' !== field.alias)) {
                delete fields[fieldId];
                continue;
            }

            switch (field.alias) {
                case 'age':
                    if (!customFields[field.alias]) {
                        TagBtn('age', '年齡', field.setsType, 'edit-custom-fields');
                        break;
                    }

                    $('#edit-custom-fields').append(
                        '<div class="form-group col-sm-6">' +
                            '<button type="button" rel="' + field.alias + '" class="btn btn-info" name="年齡" data-type="' + field.setsType + '" id="field">年齡:' + customFields[field.alias] + '</button>' +
                            '<div id="condition" style="display: none;">' +
                                '<input type="text" class="form-gruop" rel="' + field.alias + '" data-type="' + field.setsType + '" placeholder="年齡" id="condition-input" value="' + customFields[field.alias] + '">' +
                                '<button type="button" class="btn btn-default fa fa-check" id="condition-check-btn"></button>' +
                                '<button type="button" class="btn btn-default fa fa-close" id="condition-close-btn"></button>' +
                            '</div>' +
                        '</div>'
                    );
                    break;
                case 'gender':
                    if (!customFields[field.alias]) {
                        TagBtn('gender', '性別', field.setsType, 'edit-custom-fields');
                        break;
                    }
                    $('#edit-custom-fields').append(
                        '<div class="form-group col-sm-6">' +
                            '<button type="button" rel="' + field.alias + '" class="btn btn-info" name="性別" data-type="' + field.setsType + '" id="field">性別:' + customFields[field.alias] + '</button>' +
                            '<div id="condition" style="display: none;">' +
                                '<input type="text" class="form-gruop" rel="' + field.alias + '" data-type="' + field.setsType + '" placeholder="性別" id="condition-input" value="' + customFields[field.alias] + '">' +
                                '<button type="button" class="btn btn-default fa fa-check" id="condition-check-btn"></button>' +
                                '<button type="button" class="btn btn-default fa fa-close" id="condition-close-btn"></button>' +
                            '</div>' +
                        '</div>'
                    );
                    break;
                case '':
                    if (!customFields[fieldId]) {
                        TagBtn(fieldId, field.text, field.setsType, 'edit-custom-fields');
                        break;
                    }
                    $('#edit-custom-fields').append(
                        '<div class="form-group col-sm-6">' +
                            '<button type="button" rel="' + fieldId + '" class="btn btn-info" name="' + field.text + '" data-type="' + field.setsType + '" id="field">' + field.text + ':' + customFields[fieldId] + '</button>' +
                            '<div id="condition" style="display: none;">' +
                                '<input type="text" class="form-gruop" rel="' + fieldId + '" data-type="' + field.setsType + '" placeholder="' + field.text + '" id="condition-input" value="' + customFields[fieldId] + '">' +
                                '<button type="button" class="btn btn-default fa fa-check" id="condition-check-btn"></button>' +
                                '<button type="button" class="btn btn-default fa fa-close" id="condition-close-btn"></button>' +
                            '</div>' +
                        '</div>'
                    );
                    break;
                default:
                    break;
            }
        }

        $editForm.find('#edit-time').val(ISODateTimeString(targetData.time));
        $editForm.find('#edutinput').val(targetData.text);
        $composeEditModal.find('#edit-submit').off('click').on('click', function() {
            $composeEditModal.find('#edit-submit').attr('disabled', 'disabled');
            var isDraft = $composeEditModal.find('input[name="modal-draft"]').prop('checked');
            var conditionInputElement = $composeEditModal.find('input#condition-input');
            fieldsObjCompose(conditionInputElement);
            targetData.text = $editForm.find('#edutinput').val();
            targetData.time = Date.parse($editForm.find('#edit-time').val());
            targetData.age = age;
            targetData.gender = gender;
            targetData.field_ids = Object.assign({}, field_ids);
            if (true === isDraft) {
                targetData.status = 0;
            } else {
                targetData.status = 1;
            }
            return api.appsComposes.update(appId, composeId, userId, targetData).then((resJson) => {
                age = '';
                gender = '';
                field_ids = {};
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
                if (NO_PERMISSION_CODE === resJson.code) {
                    $composeEditModal.modal('hide');
                    $.notify('無此權限', { type: 'danger' });
                    $composeEditModal.find('#edit-submit').removeAttr('disabled');
                    return loadComposes(appId, userId);
                }
            });
        });
    });
    return api.apps.findAll(userId).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        modelSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }
            socket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId);

            $dropdownMenu.append('<li><a id="' + appId + '">' + app.name + '</a></li>');
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId && !modelSelectAppId) {
                nowSelectAppId = appId;
                modelSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadComposes(nowSelectAppId, userId);
            $jqDoc.find('button.btn-default.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }

        if (modelSelectAppId) {
            appCustomerTagChanged();
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadComposes(nowSelectAppId, userId);
    }

    function appCustomerTagChanged() {
        $customFields.empty();
        if (!modelSelectAppId) {
            modelSelectAppId = $(this).find(':selected').val();
        }
        return api.appsFields.findAll(userId).then((resJson) => {
            appsFields = resJson.data;
            let fields = resJson.data[modelSelectAppId].fields;
            for (let fieldId in fields) {
                let field = fields[fieldId];
                if (field.isDeleted) {
                    delete fields[fieldId];
                    continue;
                }
                switch (field.alias) {
                    case 'age':
                        TagBtn('age', '年齡', field.setsType, 'custom-fields');
                        break;
                    case 'gender':
                        TagBtn('gender', '性別', field.setsType, 'custom-fields');
                        break;
                    case '':
                        TagBtn(fieldId, field.text, field.setsType, 'custom-fields');
                        break;
                    default:
                        break;
                }
            }
        });
    }

    function TagBtn(id, text, type, elementId) {
        let div = $('<div>').attr('class', 'form-group col-sm-6');
        let btn = $('<button>').attr('type', 'button')
            .attr('rel', id)
            .attr('class', 'btn btn-grey')
            .attr('name', text)
            .attr('data-type', type)
            .attr('id', 'field')
            .text(text);
        div.append(btn);
        $('#' + elementId).append(div);
    }

    function loadComposes(appId, userId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        $historyTableElem.empty();
        $draftTableElem.empty();
        $reservationTableElem.empty();
        return api.appsComposes.findAll(appId, userId).then(function(resJson) {
            if (!resJson.data[appId]) {
                return;
            }

            composesData = resJson.data[appId].composes;
            for (var composeId in composesData) {
                var composeData = composesData[composeId];

                if (composeData.isDeleted) {
                    continue;
                }

                $('#delete-btn').off('click').on('click', function(event) {
                    var targetRow = $(event.target).parent().parent();
                    var appId = targetRow.attr('text');
                    var composeId = targetRow.attr('id');

                    return showDialog('確定要刪除嗎？').then(function(isOK) {
                        if (!isOK) {
                            return;
                        }

                        return api.appsComposes.remove(appId, composeId, userId).then(function() {
                            $.notify('刪除成功！', { type: 'success' });
                            return loadComposes(appId, userId);
                        }).catch((resJson) => {
                            if (undefined === resJson.status) {
                                $.notify('失敗', { type: 'danger' });
                            }
                            if (NO_PERMISSION_CODE === resJson.code) {
                                $.notify('無此權限', { type: 'danger' });
                            }
                        });
                    });
                });

                var trGrop =
                    '<tr id="' + composeId + '" text="' + appId + '">' +
                        '<th id="text" data-title="' + composeData.text + '">' + composeData.text + '</th>' +
                        '<td id="time">' + ToLocalTimeString(composeData.time) + '</td>' +
                        appendFields(composeData) +
                        '<td>' +
                            '<button type="button" class="btn btn-grey fa fa-pencil" id="edit-btn" data-toggle="modal" data-target="#editModal" aria-hidden="true"></button>' +
                            '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                        '</td>' +
                    '</tr>';
                if (!composeData.status) {
                    $draftTableElem.append(trGrop);
                } else if (composeData.status && Date.parse(composeData.time) > timeInMs) {
                    $reservationTableElem.append(trGrop);
                } else if (composeData.status && Date.parse(composeData.time) <= timeInMs) {
                    $historyTableElem.append(trGrop);
                }
            }
        });
    }
    function appendFields(composeData) {
        let composeFields = {
            'ageRange': {
                'value': ''
            },
            'gender': {
                'value': ''
            }
        };
        let fieldsTd = '<td id="fields">';
        let composeAgeRange = composeData.ageRange || '';
        let composeAgeString = '';
        for (let i = 0; i < composeAgeRange.length; i++) {
            if (i % 2) {
                composeAgeString += '-' + composeAgeRange[i];
                continue;
            } else {
                composeAgeString += composeAgeRange[i];
                continue;
            }
        }
        let composeGender = composeData.gender || '';
        if (!composeData.field_ids && 0 === composeData.ageRange.length && '' === composeGender) {
            fieldsTd += '<snap id="sendAll">無';
            return fieldsTd;
        }
        composeFields = Object.assign(composeFields, composeData.field_ids) || composeFields;
        composeFields['ageRange'].value = composeAgeString;
        composeFields['gender'].value = composeGender;
        for (var fieldId in composeFields) {
            let composeTag = composeFields[fieldId];
            if (!composeTag.value) {
                continue;
            }
            fieldsTd += '<snap id="field" data-type="' + fieldId + '">' + composeTag.value;
        }
        fieldsTd += '</td>';
        return fieldsTd;
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
        $('#send-all').prop('checked', true);
        $('div#limit-user').hide();
        $('div#condition').remove();
        $('button[id="field"]').show();
        $('#send-now').prop('checked', true);
        $('#send-time').val('');
        $('#checkbox_value').prop('checked', false);
        $('#inputText').empty();
        inputObj = {};
        inputNum = 0;
        deleteNum = 0;
        age = '';
        gender = '';
        field_ids = {};
    }

    function appendInput() {
        let text = $(this).text();
        let rel = $(this).attr('rel');
        let dataType = $(this).attr('data-type');
        let $fieldDiv = $(this).parent();
        let $conditionDiv = $(this).parent().find('div');

        let conditionId = $conditionDiv.attr('id');

        $(this).hide();
        if (!conditionId) {
            $fieldDiv.append(
                '<div id="condition">' +
                    '<input type="text" class="form-gruop" rel="' + rel + '" data-type="' + dataType + '" placeholder="' + text + '" id="condition-input">' +
                    '<button type="button" class="btn btn-default fa fa-check" id="condition-check-btn"></button>' +
                    '<button type="button" class="btn btn-default fa fa-close" id="condition-close-btn"></button>' +
                '</div>'
            );
        }
        $conditionDiv.show();
    }

    function insertSubmit() {
        var $errorMsgElem = $composesAddModal.find('.error-input');
        var appId = $appSelector.find('option:selected').val();
        var isDraft = $composesAddModal.find('input[name="modal-draft"]').prop('checked');
        var sendTime = $composesAddModal.find('#send-time').val();
        var conditionInputElement = $composesAddModal.find('input#condition-input');
        fieldsObjCompose(conditionInputElement);
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
        }

        let options = {
            sendTime: sendTime,
            isDraft: isDraft,
            age: age,
            gender: gender,
            field_ids: 0 === Object.keys(field_ids).length ? {} : field_ids
        };

        let messages = [];
        if ($('#send-now').prop('checked')) {
            for (let key in inputObj) {
                let compose = {
                    type: 'text',
                    text: $('#' + key).val(),
                    status: 1,
                    time: Date.now() - 60000,
                    age: age,
                    gender: gender,
                    field_ids: 0 === Object.keys(field_ids).length ? {} : field_ids
                };
                messages.push(compose);
            }

            // 如果是屬於草稿則不做立即發送動作
            // 將群發訊息存入資料庫，等待使用者再行編輯
            if (isDraft) {
                return insert(appId, userId, messages, options).then(() => {
                    $composesAddModal.modal('hide');
                    $('.form-control').val(appsData[appId].name);
                    $('.textinput').val('');
                    $('#send-time').val('');
                    $('#inputText').empty();
                    inputNum = 0;
                    $.notify('新增成功', { type: 'success' });
                    $appDropdown.find('.dropdown-text').text(appsData[appId].name);
                    $composesAddModal.find('#modal-submit').removeAttr('disabled');
                    return loadComposes(appId, userId);
                });
            }

            // 立即群發動作將資料包裝為 socket 資料
            // 使用 socket 發送至所有用戶端
            return new Promise((resolve) => {
                var emitData = {
                    userId: userId,
                    appId: appId,
                    composes: messages
                };

                socket.emit(SOCKET_EVENTS.PUSH_COMPOSES_TO_ALL, emitData, (json) => {
                    $composesAddModal.modal('hide');
                    $composesAddModal.find('button.btn-update-submit').removeAttr('disabled');
                    if (1 === json.status) {
                        $('.form-control').val(appsData[appId].name);
                        $('.textinput').val('');
                        $('#send-time').val('');
                        $('#inputText').empty();
                        inputNum = 0;

                        $.notify('發送成功', { type: 'success' });
                        $appDropdown.find('.dropdown-text').text(appsData[appId].name);
                    } else {
                        let errText = '';
                        if (NO_PERMISSION_CODE === json.code) {
                            errText = '無此權限';
                        }
                        if (DID_NOT_HAVE_TAGS === json.code) {
                            errText = '無符合的客戶條件';
                        } else {
                            errText = '失敗';
                        }
                        $.notify(errText, { type: 'danger' });
                    }
                    resolve();
                });
            }).then(() => {
                return loadComposes(appId, userId);
            });
        } else if ($('#send-sometime').prop('checked')) {
            for (let key in inputObj) {
                let message = {
                    type: 'text',
                    text: $('#' + key).val()
                };
                messages.push(message);
            };

            return insert(appId, userId, messages, options).then((responses) => {
                responses.forEach((response) => {
                    if (0 === response.stats) {
                        return;
                    };
                    let appsComposes = response.data;
                    let appId = Object.keys(appsComposes)[0];
                    let composes = appsComposes[appId].composes;
                    let composeId = Object.keys(composes)[0];
                    let compose = composes[composeId];

                    var trGrop =
                        '<tr id="' + composeId + '" text="' + appId + '">' +
                            '<th id="text" data-title="' + compose.text + '">' + compose.text + '</th>' +
                            '<td id="time">' + ToLocalTimeString(compose.time) + '</td>' +
                            appendFields(appsComposes) +
                            '<td>' +
                                '<button type="button" class="btn btn-grey fa fa-pencil" id="edit-btn" data-toggle="modal" data-target="#editModal" aria-hidden="true"></button>' +
                                '<button type="button" class="btn btn-danger fa fa-trash-o" id="delete-btn"></button>' +
                            '</td>' +
                        '</tr>';
                    if (!compose.status) {
                        $draftTableElem.append(trGrop);
                    } else if (compose.status && Date.parse(compose.time) > timeInMs) {
                        $reservationTableElem.append(trGrop);
                    } else if (compose.status && Date.parse(compose.time) <= timeInMs) {
                        $historyTableElem.append(trGrop);
                    }
                    composesData[composeId] = compose;
                });
                $composesAddModal.modal('hide');
                $.notify('新增成功', { type: 'success' });
            });
        }
    }
    function fieldsObjCompose(conditionInputElement) {
        conditionInputElement.each(function () {
            var conditionVal = $(this).val();
            var conditionRel = $(this).attr('rel');
            var conditionDataType = $(this).attr('data-type');
            if (!conditionVal) {
                return;
            }

            switch (conditionDataType) {
                case fieldEnums.setsType.NUMBER:
                    let ageRange = conditionVal.split(/[-~]/);
                    for (let i in ageRange) {
                        ageRange[i] = parseInt(ageRange[i]);
                    }
                    conditionVal = ageRange;
                    break;
            }

            switch (conditionRel) {
                case 'age':
                    age = conditionVal;
                    break;
                case 'gender':
                    switch (conditionVal) {
                        case '男':
                            gender = 'MALE';
                            break;
                        case '女':
                            gender = 'FEMALE';
                            break;
                        default:
                            gender = conditionVal;
                    }
                    break;
                default:
                    field_ids[conditionRel] = {
                        value: conditionVal
                    };
            }
        });
    }
    function insert(appId, userId, messages, options) {
        options = options || {};

        let composes = messages.map(function(message) {
            let compose = {
                type: message.type,
                text: message.text,
                status: options.isDraft ? 0 : 1,
                time: options.isDraft ? Date.now() : Date.parse(options.sendTime),
                age: options.age,
                gender: options.gender,
                field_ids: options.field_ids
            };
            return compose;
        });

        return api.appsComposes.insert(appId, userId, composes, true).catch((resJson) => {
            if (undefined === resJson.status) {
                $composesAddModal.modal('hide');
                $composesAddModal.find('#modal-submit').removeAttr('disabled');
                $.notify('失敗', { type: 'danger' });
                return loadComposes(appId, userId);
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $composesAddModal.modal('hide');
                $composesAddModal.find('#modal-submit').removeAttr('disabled');
                $.notify('無此權限', { type: 'danger' });
                return loadComposes(appId, userId);
            }
        });
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