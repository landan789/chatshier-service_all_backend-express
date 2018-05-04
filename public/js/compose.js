/// <reference path='../../typings/client/index.d.ts' />

(function() {
    // var RESERVATION = 'RESERVATION';
    var HISTORY = 'HISTORY';
    // var DRAFT = 'DRAFT';

    var apps = {};
    var appsComposes = {};
    var api = window.restfulAPI;

    var SOCKET_NAMESPACE = '/chatshier';
    var SOCKET_SERVER_URL = window.urlConfig.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;
    var socket = io(SOCKET_SERVER_URL);

    var inputNum = 0; // 計算訊息的數量
    var ageRange = [];
    var gender = '';
    var fieldIds = {};
    var appsFields = '';
    var deleteNum = 0;
    var nowSelectAppId = '';
    var modelSelectAppId = '';
    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $appSelector = $('#app-select');
    var $customFields = $('#custom-fields');
    var $historyTableBody = null;
    var $draftTableBody = null;
    var $reservationTableBody = null;
    var timeInMs = (Date.now() + 1000);
    var fieldEnums = api.appsFields.enums;

    var $composeAddModal = $('#composeAddModal');
    var $composesAddDtPicker = $composeAddModal.find('#sendDatetimePicker');
    var $composesAddDtInput = $composesAddDtPicker.find('input[name="sendDatetime"]');

    var $composeEditModal = $('#composeEditModal');
    var $composesEditDtPicker = $composeEditModal.find('#sendDatetimePicker');
    var $composesEditDtInput = $composesEditDtPicker.find('input[name="sendDatetime"]');

    const NO_PERMISSION_CODE = '3.16';
    const MUST_BE_LATER_THAN_NOW = '15.5';
    const DID_NOT_HAVE_TAGS = '15.6';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    // ACTIONS
    $composeAddModal.on('click', '#composeAddSubmitBtn', insertSubmit);
    $(document).on('change', '#app-select', storeApp);
    $(document).on('click', '.tablinks', clickMsg);
    $(document).on('click', '#addComposeText', addComposeText);
    $(document).on('click', '.remove-btn', removeInput);
    $(document).on('click', '#delete-btn', remove);
    $(document).on('click', '#send-all', function () {
        let id = $(this).attr('rel');
        $('#' + id).addClass('d-none');
    });
    $(document).on('click', '#send-somebody', function () {
        let id = $(this).attr('rel');
        $('#' + id).removeClass('d-none');
    });
    $(document).on('click', 'button#field', appendInput);
    $(document).on('change paste keyup', '.search-bar', dataSearch);
    $(document).on('click', '#condition-close-btn', function() {
        let $conditionDiv = $(this).parent();
        let $fieldBtn = $(this).parent().parent().find('button#field');

        let btnName = $fieldBtn.attr('name');

        $fieldBtn.removeClass();
        $fieldBtn.attr('class', 'btn btn-border');
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

        if (!conditionValue) {
            $fieldBtn.show();
            return;
        }

        let checkResult = fieldsCheck(btnName, conditionValue);

        if (!checkResult) {
            $fieldBtn.show();
            return;
        }
        $conditionInput.attr('value', conditionValue);
        $fieldBtn.removeClass();
        $fieldBtn.attr('class', 'btn btn-info');
        $fieldBtn.text(btnName + ':' + conditionValue).show();
    });

    $historyTableBody = $('#composesHistoryTable tbody');
    $reservationTableBody = $('#composesReservationTable tbody');
    $draftTableBody = $('#composesDraftTable tbody');

    if (!window.isMobileBrowser()) {
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
        $composesAddDtPicker.datetimepicker(datetimePickerInitOpts);
        $composesEditDtPicker.datetimepicker(datetimePickerInitOpts);
    } else {
        $composesAddDtInput.attr('type', 'datetime-local');
        $composesEditDtInput.attr('type', 'datetime-local');
        $composesAddDtPicker.on('click', '.input-group-prepend', function() {
            $composesAddDtInput.focus();
        });
        $composesEditDtPicker.on('click', '.input-group-prepend', function() {
            $composesEditDtInput.focus();
        });
    }

    $composeAddModal.on('show.bs.modal', resetAddModal);

    // FUNCTIONs

    function storeApp() {
        modelSelectAppId = $(this).find(':selected').val();
        appCustomerTagChanged();
    } // end of loadFriendsReply

    function removeInput() {
        deleteNum++;
        if (inputNum - deleteNum < 4) {
            $('.error-msg').hide();
        };
        $(this).parent().remove();
    }

    function clickMsg() { // 更換switch
        var target = $(this).attr('rel');
        $('#' + target).show().siblings().hide();
    }

    function addComposeText() {
        inputNum++;
        if (inputNum - deleteNum > 3) {
            $('.error-msg').show();
            inputNum--;
        } else {
            let textAreaHtml = (
                '<div class="position-relative mt-3 input-container">' +
                    '<textarea class="pl-2 compose-textarea text-input"></textarea>' +
                    '<i class="position-absolute fas fa-times remove-btn"></i>' +
                '</div>'
            );
            $('#inputWarpper').append(textAreaHtml);
        }
    }

    $composeEditModal.on('shown.bs.modal', function(ev) {
        $('#edit-custom-fields').empty();
        var $targetRow = $(ev.relatedTarget).parents('tr');
        var $targetTable = $targetRow.parents('table');

        var appId = $targetRow.attr('text');
        var composeId = $targetRow.attr('id');
        var $editForm = $composeEditModal.find('.modal-body form');
        var targetCompose = appsComposes[appId].composes[composeId];
        var customFieldsElement = $targetRow.find('#fields > #field');
        var customFields = {};

        customFieldsElement.each(function() {
            let fieldValue = $(this).text();
            let fieldId = 'ageRange' === $(this).attr('data-type') ? 'age' : $(this).attr('data-type');
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
                                '<button type="button" class="btn btn-light btn-border" id="condition-check-btn">' +
                                    '<i class="fa fa-check"></i>' +
                                '</button>' +
                                '<button type="button" class="btn btn-light btn-border" id="condition-close-btn">' +
                                    '<i class="fa fa-times"></i>' +
                                '</button>' +
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
                                '<button type="button" class="btn btn-light btn-border" id="condition-check-btn">' +
                                    '<i class="fa fa-check"></i>' +
                                '</button>' +
                                '<button type="button" class="btn btn-light btn-border" id="condition-close-btn">' +
                                    '<i class="fa fa-times"></i>' +
                                '</button>' +
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
                                '<button type="button" class="btn btn-light btn-border" id="condition-check-btn">' +
                                    '<i class="fa fa-check"></i>' +
                                '</button>' +
                                '<button type="button" class="btn btn-light btn-border" id="condition-close-btn">' +
                                    '<i class="fa fa-times"></i>' +
                                '</button>' +
                            '</div>' +
                        '</div>'
                    );
                    break;
                default:
                    break;
            }
        }

        var category = $targetTable.attr('category');
        var composeDateTime = new Date(targetCompose.time);

        if (HISTORY === category) {
            composeDateTime = new Date(Date.now() + (5 * 60 * 1000));
            $composeEditModal.find('#edit-submit').text('重發');
        } else {
            $composeEditModal.find('#edit-submit').text('更新');
        }

        var composesEditDtPickerData = $composesEditDtPicker.data('DateTimePicker');
        if (composesEditDtPickerData) {
            composesEditDtPickerData.date(composeDateTime);
        } else {
            $composesEditDtInput.val(toDatetimeLocal(composeDateTime));
        }

        $editForm.find('#edutinput').val(targetCompose.text);
        $editForm.find('input[name="modal-draft"]').prop('checked', !targetCompose.status);

        $composeEditModal.find('#edit-submit').off('click').on('click', function() {
            $composeEditModal.find('#edit-submit').attr('disabled', 'disabled');
            var isDraft = $composeEditModal.find('input[name="modal-draft"]').prop('checked');
            var conditionInputElement = $composeEditModal.find('input#condition-input');

            fieldsObjCompose(conditionInputElement);
            targetCompose.text = $editForm.find('#edutinput').val();
            targetCompose.time = composesEditDtPickerData ? composesEditDtPickerData.date().toDate().getTime() : new Date($composesEditDtInput.val()).getTime();
            targetCompose.ageRange = ageRange;
            targetCompose.gender = gender;
            targetCompose.field_ids = 0 === Object.keys(fieldIds).length ? {} : fieldIds;
            targetCompose.status = !isDraft;

            return Promise.resolve().then(() => {
                if (HISTORY === category) {
                    return api.appsComposes.insert(appId, userId, targetCompose);
                }
                return api.appsComposes.update(appId, composeId, userId, targetCompose);
            }).then((resJson) => {
                ageRange = [];
                gender = '';
                fieldIds = {};
                $composeEditModal.modal('hide');
                $.notify(HISTORY === category ? '新增成功！' : '更新成功！', { type: 'success' });
                $composeEditModal.find('#edit-submit').removeAttr('disabled');
                return loadComposes(appId, userId);
            }).catch((resJson) => {
                $composeEditModal.find('#edit-submit').removeAttr('disabled');

                if (undefined === resJson.status) {
                    $.notify('失敗', { type: 'danger' });
                    $composeEditModal.modal('hide');
                }

                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                    $composeEditModal.modal('hide');
                }

                if (MUST_BE_LATER_THAN_NOW === resJson.code) {
                    $.notify('群發時間必須大於現在時間', { type: 'danger' });
                }
            });
        });
    });

    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;
        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        nowSelectAppId = '';
        modelSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete apps[appId];
                continue;
            }
            socket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId);

            $dropdownMenu.append('<a class="dropdown-item" app-id="' + appId + '">' + app.name + '</a>');
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
            $appDropdown.find('.dropdown-item[app-id="' + appId + '"]').on('click', appSourceChanged);

            if (!nowSelectAppId && !modelSelectAppId) {
                nowSelectAppId = appId;
                modelSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            loadComposes(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }

        if (modelSelectAppId) {
            appCustomerTagChanged();
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = $(ev.target).attr('app-id');
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
            .attr('class', 'btn btn-border')
            .attr('name', text)
            .attr('data-type', type)
            .attr('id', 'field')
            .text(text);
        div.append(btn);
        $('#' + elementId).append(div);
    }

    function loadComposes(appId, userId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        $historyTableBody.empty();
        $draftTableBody.empty();
        $reservationTableBody.empty();

        return api.appsComposes.findAll(appId, userId).then(function(resJson) {
            if (!resJson.data[appId]) {
                return;
            }

            Object.assign(appsComposes, resJson.data || {});
            var composes = appsComposes[appId].composes;

            for (var composeId in composes) {
                var compose = composes[composeId];
                if (compose.isDeleted) {
                    continue;
                }

                var composeTime = new Date(compose.time).getTime();
                var isDraft = !compose.status;
                var isReservation = compose.status && composeTime > timeInMs;
                var isHistory = composeTime <= timeInMs;

                var tr =
                    '<tr id="' + composeId + '" text="' + appId + '">' +
                        '<td id="text" data-title="' + compose.text.toLowerCase() + '">' + compose.text + '</td>' +
                        '<td id="time">' + ToLocalTimeString(compose.time) + '</td>' +
                        appendFields(compose) +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas ' + (isHistory ? 'fa-share-square' : 'fa-edit') + ' update" id="edit-btn" data-toggle="modal" data-target="#composeEditModal" aria-hidden="true"></button>' +
                            (isHistory ? '' : '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove" id="delete-btn"></button>') +
                        '</td>' +
                    '</tr>';

                if (isReservation) {
                    $reservationTableBody.append(tr);
                } else if (isHistory) {
                    $historyTableBody.append(tr);
                } else if (isDraft) {
                    $draftTableBody.append(tr);
                }
            }
        });
    }

    function appendFields(compose) {
        let composeFields = {
            'ageRange': {
                'value': ''
            },
            'gender': {
                'value': ''
            }
        };
        let fieldsTd = '<td id="fields">';
        let composeAgeRange = compose.ageRange || '';
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
        let composeGender;
        switch (compose.gender) {
            case 'MALE':
                composeGender = '男';
                break;
            case 'FEMALE':
                composeGender = '女';
                break;
            default:
                composeGender = '';
        }
        if (0 === Object.keys(compose.field_ids).length && 0 === compose.ageRange.length && '' === composeGender) {
            fieldsTd += '<snap id="sendAll" data-title="無"></snap>';
            return fieldsTd;
        }
        composeFields = Object.assign(composeFields, compose.field_ids) || composeFields;
        composeFields['ageRange'].value = composeAgeString;
        composeFields['gender'].value = composeGender;
        for (var fieldId in composeFields) {
            let composeTag = composeFields[fieldId];
            if (!composeTag.value) {
                continue;
            }
            fieldsTd += '<snap id="field" data-title="' + composeTag.value + '" data-type="' + fieldId + '">' + composeTag.value + '</snap>';
        }
        fieldsTd += '</td>';
        return fieldsTd;
    }

    function dataSearch(ev) {
        // debugger;
        let searchText = $(this).val().toLocaleLowerCase();
        let target = $('tbody > tr > [data-title*="' + searchText + '"]').parent();
        if (0 === target.length) {
            target = $('tbody > tr > td>[data-title*="' + searchText + '"]').parent().parent();
        }
        if (!searchText) {
            $('tbody > tr > :not([data-title*="' + searchText + '"])').parent().removeAttr('style');
            return;
        }
        var code = ev.keyCode || ev.which;
        if (13 === code) {
            // 按下enter鍵
            if (0 === target.length) {
                $('tbody > tr ').hide();
            }
            $('.table>tbody > tr').hide();
            target.show();
        }
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

    function resetAddModal() {
        $('.error-msg').hide();
        $('.error-input').hide();
        $('.text-input').val('');
        $('#send-all').prop('checked', true);
        $('#limit-user').addClass('d-none');
        $('#condition').remove();
        $('button[id="field"]').show();
        $('#send-now').prop('checked', true);
        $('#checkbox_value').prop('checked', false);

        var $inputWarpper = $('#inputWarpper');
        $inputWarpper.find('.input-container').first().val('');
        $inputWarpper.find('.input-container').not(':first').remove();

        var composesAddDtPickerData = $composesAddDtPicker.data('DateTimePicker');
        // 顯示新增視窗時，快速設定傳送時間預設為 5 分鐘後
        var dateNowLater = Date.now() + (5 * 60 * 1000);
        if (composesAddDtPickerData) {
            composesAddDtPickerData.date(new Date(dateNowLater));
        } else {
            $composesAddDtInput.val(toDatetimeLocal(new Date(dateNowLater)));
        }

        inputNum = 1;
        deleteNum = 0;
        ageRange = [];
        gender = '';
        fieldIds = {};

        appCustomerTagChanged();
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
                    '<button type="button" class="btn btn-light btn-border" id="condition-check-btn">' +
                        '<i class="fa fa-check"></i>' +
                    '</button>' +
                    '<button type="button" class="btn btn-light btn-border" id="condition-close-btn">' +
                        '<i class="fa fa-times"></i>' +
                    '</button>' +
                '</div>'
            );
        }
        $conditionDiv.show();
    }

    function insertSubmit() {
        var $inputWarpper = $('#inputWarpper');
        var $errorMsgElem = $composeAddModal.find('.error-input');
        var appId = $appSelector.find('option:selected').val();
        var isDraft = $composeAddModal.find('input[name="modal-draft"]').prop('checked');

        var time;
        var composesAddDtPickerData = $composesAddDtPicker.data('DateTimePicker');
        if (composesAddDtPickerData) {
            time = composesAddDtPickerData.date().toDate().getTime();
        } else {
            time = new Date($composesAddDtInput.val()).getTime();
        }

        var conditionInputElement = $composeAddModal.find('input#condition-input');
        fieldsObjCompose(conditionInputElement);
        $errorMsgElem.empty().hide();

        var isTextVaild = true;
        $('.text-input').each(function() {
            isTextVaild &= !!$(this).val();
        });

        if (!isTextVaild) {
            $errorMsgElem.text('請輸入群發的內容').show();
            return;
        }

        let options = {
            time: time,
            isDraft: isDraft,
            ageRange: ageRange,
            gender: gender,
            field_ids: 0 === Object.keys(fieldIds).length ? {} : fieldIds
        };

        let messages = [];
        if ($('#send-now').prop('checked')) {
            $inputWarpper.find('.input-container textarea').each(function() {
                let compose = {
                    type: 'text',
                    text: $(this).val(),
                    status: 1,
                    time: Date.now() - 60000,
                    ageRange: ageRange,
                    gender: gender,
                    field_ids: 0 === Object.keys(fieldIds).length ? {} : fieldIds
                };
                messages.push(compose);
            });

            // 如果是屬於草稿則不做立即發送動作
            // 將群發訊息存入資料庫，等待使用者再行編輯
            if (isDraft) {
                return insert(appId, userId, messages, options).then(() => {
                    $composeAddModal.modal('hide');
                    $('.form-control').val(apps[appId].name);
                    $('.text-input').val('');
                    $composesAddDtInput.val('');

                    inputNum = 1;
                    $.notify('新增成功', { type: 'success' });
                    $appDropdown.find('.dropdown-text').text(apps[appId].name);
                    $composeAddModal.find('#composeAddSubmitBtn').removeAttr('disabled');
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
                    $composeAddModal.modal('hide');
                    $composeAddModal.find('button.btn-update-submit').removeAttr('disabled');
                    if (1 === json.status) {
                        $('.form-control').val(apps[appId].name);
                        $('.text-input').val('');
                        $composesAddDtInput.val('');
                        inputNum = 1;

                        $.notify('發送成功', { type: 'success' });
                        $appDropdown.find('.dropdown-text').text(apps[appId].name);
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
            if (time < Date.now()) {
                $errorMsgElem.text('群發時間必須大於現在時間').show();
                return;
            };

            $inputWarpper.find('.input-container textarea').each(function() {
                let message = {
                    type: 'text',
                    text: $(this).val()
                };
                messages.push(message);
            });

            return insert(appId, userId, messages, options).then((responses) => {
                responses.forEach((response) => {
                    if (0 === response.stats) {
                        return;
                    };
                    let _appsComposes = response.data || {};
                    let appId = Object.keys(_appsComposes)[0];
                    let composes = _appsComposes[appId].composes;
                    let composeId = Object.keys(composes)[0];
                    let compose = composes[composeId];

                    var trGrop =
                        '<tr id="' + composeId + '" text="' + appId + '">' +
                            '<td id="text" data-title="' + compose.text.toLowerCase() + '">' + compose.text + '</td>' +
                            '<td id="time">' + ToLocalTimeString(compose.time) + '</td>' +
                            appendFields(compose) +
                            '<td>' +
                                '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit insert" id="edit-btn" data-toggle="modal" data-target="#composeEditModal" aria-hidden="true"></button>' +
                                '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove" id="delete-btn"></button>' +
                            '</td>' +
                        '</tr>';
                    if (!compose.status) {
                        $draftTableBody.append(trGrop);
                    } else if (compose.status && new Date(compose.time) > timeInMs) {
                        $reservationTableBody.append(trGrop);
                    } else if (compose.status && new Date(compose.time) <= timeInMs) {
                        $historyTableBody.append(trGrop);
                    }
                });
                $composeAddModal.modal('hide');
                $.notify('新增成功', { type: 'success' });
            }).then(() => {
                return loadComposes(appId, userId);
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
                default:
                    break;
            }

            switch (conditionRel) {
                case 'age':
                    ageRange = conditionVal;
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
                            gender = conditionVal.toUpperCase();
                    }
                    break;
                default:
                    fieldIds[conditionRel] = {
                        value: conditionVal
                    };
            }
        });
    }

    function fieldsCheck(btnName, value) {
        switch (btnName) {
            case '年齡':
                if (value && !value.includes('~')) {
                    $.notify('請輸入兩數字區間 e.g.10~20', { type: 'warning' });
                    return false;
                }
                let ageRange = value.split('~');
                for (let i in ageRange) {
                    ageRange[i] = parseInt(ageRange[i]);
                    if (ageRange[i] < 0 && ageRange[i] > 130) {
                        $.notify('請輸入 0 到 130 之間的數字區間', { type: 'warning' });
                        return false;
                    }
                }
                return true;
            case '性別':
                if (value && ('男' === value || '女' === value ||
                'MALE' === value.toUpperCase() || 'FEMALE' === value.toUpperCase()
                )) {
                    return true;
                }

                $.notify('請輸入 男/女 或 male/female', { type: 'warning' });
                return false;
            default:
                return true;
        }
    }

    function insert(appId, userId, messages, options) {
        options = options || {};

        let composes = messages.map(function(message) {
            let compose = {
                type: message.type,
                text: message.text,
                status: options.isDraft ? 0 : 1,
                time: options.time,
                ageRange: options.ageRange,
                gender: options.gender,
                field_ids: options.field_ids
            };
            return compose;
        });

        return api.appsComposes.insert(appId, userId, composes, true).catch((resJson) => {
            $composeAddModal.find('#composeAddSubmitBtn').removeAttr('disabled');

            if (undefined === resJson.status) {
                $.notify('失敗', { type: 'danger' });
                $composeAddModal.modal('hide');
            }

            if (NO_PERMISSION_CODE === resJson.code) {
                $.notify('無此權限', { type: 'danger' });
                $composeAddModal.modal('hide');
            }

            if (MUST_BE_LATER_THAN_NOW === resJson.code) {
                $.notify('群發時間必須大於現在時間', { type: 'danger' });
            }
        });
    }

    function remove() {
        var userId;
        try {
            var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
            userId = payload.uid;
        } catch (ex) {
            userId = '';
        }
        var targetRow = $(event.target).parent().parent();
        var appId = targetRow.attr('text');
        var composeId = targetRow.attr('id');
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }
            return api.appsComposes.remove(appId, composeId, userId).then(function(resJson) {
                $('#' + composeId).remove();
                $.notify('刪除成功！', { type: 'success' });
            }).catch((resJson) => {
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                    return;
                }

                if (MUST_BE_LATER_THAN_NOW === resJson.code) {
                    $.notify('群發時間必須大於現在時間', { type: 'danger' });
                    return;
                }

                $.notify('失敗', { type: 'danger' });
                return;
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
