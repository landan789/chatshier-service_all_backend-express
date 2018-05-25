/// <reference path='../../typings/client/index.d.ts' />

(function() {
    let api = window.restfulAPI;
    let SOCKET_NAMESPACE = '/chatshier';
    let SOCKET_SERVER_URL = window.urlConfig.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;
    let socket = io(SOCKET_SERVER_URL);

    let apps = {};
    let appsChatrooms = {};
    let appsFields = {};
    let appsComposes = {};

    let inputNum = 0; // 計算訊息的數量
    let deleteNum = 0;
    let nowSelectAppId = '';
    let $jqDoc = $(document);
    let $appSelector = $('#appSelector');

    let $historyTableBody = $('#composesHistoryTable tbody');
    let $reservationTableBody = $('#composesReservationTable tbody');
    let $draftTableBody = $('#composesDraftTable tbody');

    let $composeEditModal = $('#composeEditModal');
    let $composesEditDtPicker = $composeEditModal.find('#sendDatetimePicker');
    let $composesEditDtInput = $composesEditDtPicker.find('input[name="sendDatetime"]');

    let LINE = 'LINE';
    let FACEBOOK = 'FACEBOOK';
    let CHATSHIER = 'CHATSHIER';

    const NO_PERMISSION_CODE = '3.16';
    const MUST_BE_LATER_THAN_NOW = '15.5';

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

    // ACTIONS
    $appSelector.on('click', '.dropdown-item', appSourceChanged);
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

    if (!window.isMobileBrowser()) {
        $composesEditDtPicker.datetimepicker(datetimePickerInitOpts);
    } else {
        $composesEditDtInput.attr('type', 'datetime-local');
        $composesEditDtPicker.on('click', '.input-group-prepend', function() {
            $composesEditDtInput.focus();
        });
    }

    // 當有收到訊息發送的事件時更新 compose
    socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, function(data) {
        /** @type {ChatshierChatSocketBody} */
        let socketBody = data;
        let appId = socketBody.app_id;
        appId === nowSelectAppId && loadComposes(nowSelectAppId);
    });

    Promise.all([
        api.apps.findAll(userId),
        api.appsChatrooms.findAll(userId),
        api.appsComposes.findAll(void 0, userId),
        api.appsFields.findAll(userId)
    ]).then(function(respJsons) {
        apps = respJsons[0].data;
        appsChatrooms = respJsons[1].data;
        appsComposes = respJsons[2].data;
        appsFields = respJsons[3].data;

        nowSelectAppId = '';
        let $dropdownMenu = $appSelector.find('.dropdown-menu');
        for (let appId in apps) {
            let app = apps[appId];
            if (app.isDeleted || app.type === CHATSHIER) {
                delete apps[appId];
                continue;
            }
            socket.emit(SOCKET_EVENTS.APP_REGISTRATION, appId);

            $dropdownMenu.append('<a class="dropdown-item" app-id="' + appId + '">' + app.name + '</a>');
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appSelector.find('.dropdown-text').text(apps[nowSelectAppId].name);
            loadComposes(nowSelectAppId);
        }
        $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
    });

    // Compose add modal 的處理全部寫在此閉包中
    (function() {
        let DEFAULT_CONDITION_TYPES = {
            AGE_RANGE: {
                type: 'AGE_RANGE',
                text: '年齡',
                field_id: ''
            },
            GENDER: {
                type: 'GENDER',
                text: '性別',
                field_id: ''
            },
            TAGS: {
                type: 'TAGS',
                text: '標籤',
                field_id: ''
            }
        };
        let conditionTypes = {};

        let allFields = {};
        let allTags = [];
        let icons = {
            LINE: 'fab fa-line fa-fw line-color',
            FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
        };

        let $composeAddModal = $('#composeAddModal');
        let $composesAddDtPicker = $composeAddModal.find('#sendDatetimePicker');
        let $composesAddDtInput = $composesAddDtPicker.find('input[name="sendDatetime"]');
        let $conditionContainer = $composeAddModal.find('#conditionContainer');
        let $appsDropdownMenu = $composeAddModal.find('#appsDropdown .dropdown-menu');

        $composeAddModal.on('show.bs.modal', resetAddModal);
        $composeAddModal.on('change', '#appsDropdown .dropdown-item .form-check-input', updateAppsDropdownText);
        $composeAddModal.on('click', '#composeAddSubmitBtn', insertSubmit);
        $composeAddModal.on('click', '.condition-add-btn', addConditionItem);
        $composeAddModal.on('click', '.condition-remove-btn', removeConditionItem);
        $composeAddModal.on('click', '.condition-item .condition-types-menu .dropdown-item', conditionTypeChanged);
        $composeAddModal.on('click', '.condition-item .condition-content-menu .dropdown-item', conditionContentChanged);
        $composeAddModal.on('click', '.condition-item .tag-chip .remove-chip', removeTag);

        if (!window.isMobileBrowser()) {
            $composesAddDtPicker.datetimepicker(datetimePickerInitOpts);
        } else {
            $composesAddDtInput.attr('type', 'datetime-local');
            $composesAddDtPicker.on('click', '.input-group-prepend', function() {
                $composesAddDtInput.focus();
            });
        }

        function resetAddModal() {
            conditionTypes = {};
            allFields = {};
            allTags.length = 0;

            $appsDropdownMenu.empty();
            for (let appId in apps) {
                let app = apps[appId];
                $appsDropdownMenu.append(
                    '<div class="form-check dropdown-item">' +
                        '<label class="form-check-label">' +
                            '<input class="form-check-input mr-2" type="checkbox" app-id="' + appId + '" />' +
                            (icons[app.type] ? '<i class="' + icons[app.type] + '"></i>' : '') +
                            '<span>' + app.name + '</span>' +
                        '</label>' +
                    '</div>'
                );

                if (appsFields[appId]) {
                    let _fields = appsFields[appId].fields;

                    for (let fieldId in _fields) {
                        let field = _fields[fieldId];
                        if (api.appsFields.enums.type.CUSTOM !== field.type) {
                            continue;
                        }

                        allFields[fieldId] = field;
                        conditionTypes[fieldId] = {
                            type: 'CUSTOM_FIELD',
                            text: field.text,
                            field_id: fieldId
                        };
                    }
                }

                if (appsChatrooms[appId]) {
                    let _chatrooms = appsChatrooms[appId].chatrooms;
                    for (let chatroomId in _chatrooms) {
                        let chatroom = _chatrooms[chatroomId];
                        if (chatroom.platformGroupId) {
                            continue;
                        }

                        let messagers = chatroom.messagers;
                        for (let messagerId in messagers) {
                            let messager = messagers[messagerId];
                            if ('CHATSHIER' === messager.type || !messager.tags) {
                                continue;
                            }
                            allTags = allTags.concat(messager.tags);
                        }
                    }
                }
            }

            $composeAddModal.find('.error-msg').addClass('d-none');
            $composeAddModal.find('.error-input').addClass('d-none');
            $composeAddModal.find('.text-input').val('');
            $composeAddModal.find('#send-all').prop('checked', true);
            $composeAddModal.find('#condition').remove();
            $composeAddModal.find('button[id="field"]').show();
            $composeAddModal.find('#send-now').prop('checked', true);
            $composeAddModal.find('#checkbox_value').prop('checked', false);
            $composeAddModal.find('#availableCount').empty().addClass('d-none');

            $conditionContainer.empty();

            let $inputWarpper = $composeAddModal.find('#inputWarpper');
            $inputWarpper.find('.input-container').first().val('');
            $inputWarpper.find('.input-container').not(':first').remove();

            let composesAddDtPickerData = $composesAddDtPicker.data('DateTimePicker');
            // 顯示新增視窗時，快速設定傳送時間預設為 5 分鐘後
            let dateNowLater = Date.now() + (5 * 60 * 1000);
            if (composesAddDtPickerData) {
                composesAddDtPickerData.date(new Date(dateNowLater));
            } else {
                $composesAddDtInput.val(toDatetimeLocal(new Date(dateNowLater)));
            }

            inputNum = 1;
            deleteNum = 0;
            updateAppsDropdownText();
        }

        function updateAppsDropdownText() {
            let $checkedInputs = $appsDropdownMenu.find('input:checked');
            $appsDropdownMenu.parent().find('.dropdown-value').text('已選擇的機器人 (' + $checkedInputs.length + ')');
            refreshAvailable();
        }

        /**
         * @param {MouseEvent} [ev]
         * @param {string} [type]
         */
        function addConditionItem(ev, type) {
            type = type || 'AGE_RANGE';
            let conditionType = DEFAULT_CONDITION_TYPES[type] || conditionTypes[type];

            let $conditionItem = $(
                '<div class="my-1 d-flex flex-wrap align-items-center condition-item">' +
                    '<div class="d-inline-block mr-2 dropdown condition-types">' +
                        '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                            '<span class="dropdown-value" value="' + type + '" field-id="' + conditionType.field_id + '">' + conditionType.text + '</span>' +
                        '</button>' +
                        '<div class="dropdown-menu condition-types-menu">' +
                            (function() {
                                return Object.keys(DEFAULT_CONDITION_TYPES).map(function(type) {
                                    return '<a class="dropdown-item" value="' + type + '">' + DEFAULT_CONDITION_TYPES[type].text + '</a>';
                                }).join('');
                            })() +
                            (Object.keys(conditionTypes).length > 0 ? '<div class="dropdown-divider"></div>' : '') +
                            (function() {
                                return Object.keys(conditionTypes).map(function(fieldId) {
                                    return '<a class="dropdown-item" value="CUSTOM_FIELD" field-id="' + fieldId + '">' + conditionTypes[fieldId].text + '</a>';
                                }).join('');
                            })() +
                        '</div>' +
                    '</div>' +
                    generateConditionContent(type) +
                    '<i class="ml-auto p-2 fas fa-times-circle condition-remove-btn"></i>' +
                '</div>'
            );
            $conditionContainer.append($conditionItem);
            refreshAvailable();
        }

        /**
         * @param {string} type
         */
        function generateConditionContent(type) {
            let conditionType = DEFAULT_CONDITION_TYPES[type] || conditionTypes[type];

            switch (type) {
                case 'AGE_RANGE':
                    return (
                        '<div class="d-inline-block dropdown condition-content range range-down">' +
                            '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                '<span class="dropdown-value" value="20">20 歲</span>' +
                            '</button>' +
                            '<div class="dropdown-menu condition-content-menu">' +
                                (function() {
                                    let age = 10;
                                    let items = '';
                                    while (age <= 80) {
                                        items += (
                                            '<a class="dropdown-item" value="' + age + '">' + age + ' 歲</a>'
                                        );
                                        age += 5;
                                    }
                                    return items;
                                })() +
                            '</div>' +
                        '</div>' +
                        '<span class="mx-1">~</span>' +
                        '<div class="d-inline-block dropdown condition-content range range-up">' +
                            '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                '<span class="dropdown-value" value="20">20 歲</span>' +
                            '</button>' +
                            '<div class="dropdown-menu condition-content-menu">' +
                                (function() {
                                    let age = 15;
                                    let items = '';
                                    while (age <= 80) {
                                        items += (
                                            '<a class="dropdown-item" value="' + age + '">' + age + ' 歲</a>'
                                        );
                                        age += 5;
                                    }
                                    return items;
                                })() +
                            '</div>' +
                        '</div>'
                    );
                case 'GENDER':
                    return (
                        '<div class="d-inline-block dropdown condition-content">' +
                            '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                '<span class="dropdown-value" value="MALE">男</span>' +
                            '</button>' +
                            '<div class="dropdown-menu condition-content-menu">' +
                                '<a class="dropdown-item" value="MALE">男</a>' +
                                '<a class="dropdown-item" value="FEMALE">女</a>' +
                            '</div>' +
                        '</div>'
                    );
                case 'TAGS':
                    return (
                        '<div class="d-inline-block condition-content">' +
                            '<input class="form-control typeahead" data-provide="typeahead" type="text" placeholder="請輸入標籤關鍵字" />' +
                        '</div>'
                    );
                default:
                    if (conditionType && conditionType.field_id) {
                        // 帶有 fieldId 的條件代表是自定義的過濾條件
                        return fieldSetsToConditionInput(conditionType.field_id);
                    }
                    return '';
            }
        }

        /**
         * @param {string} fieldId
         */
        function fieldSetsToConditionInput(fieldId) {
            let field = allFields[fieldId];
            let SETS_TYPES = api.appsFields.enums.setsType;

            switch (field.setsType) {
                case SETS_TYPES.SELECT:
                case SETS_TYPES.MULTI_SELECT:
                    return (
                        '<div class="d-inline-block dropdown condition-content">' +
                            '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                '<span class="dropdown-value" value="' + (field.sets[0] || '') + '">' + (field.sets[0] || '') + '</span>' +
                            '</button>' +
                            '<div class="dropdown-menu condition-content-menu">' +
                                (function() {
                                    return field.sets.map(function(set) {
                                        if (!set) {
                                            return '';
                                        }
                                        return (
                                            '<a class="dropdown-item" value="' + set + '">' +
                                                '<span>' + set + '</span>' +
                                            '</a>'
                                        );
                                    }).join('');
                                })() +
                            '</div>' +
                        '</div>'
                    );
                default:
                    return '';
            }
        }

        /**
         * @param {MouseEvent} ev
         */
        function removeConditionItem(ev) {
            $(ev.target).parent().remove();
            refreshAvailable();
        }

        /**
         * @param {MouseEvent} ev
         */
        function removeTag(ev) {
            $(ev.target).parents('.tag-chip').remove();
            refreshAvailable();
        }

        /**
         * @param {MouseEvent} ev
         */
        function conditionTypeChanged(ev) {
            let $target = $(ev.target).hasClass('dropdown-item') ? $(ev.target) : $(ev.target).parents('.dropdown-item');
            let typeValue = $target.attr('value');
            let typeFieldId = $target.attr('field-id');
            let typeText = $target.text();
            let $conditionTypes = $target.parents('.condition-types');

            let $conditionTypeValue = $conditionTypes.find('.dropdown-value');
            $conditionTypeValue.attr('value', typeValue).attr('field-id', typeFieldId).text(typeText);

            $conditionTypes.siblings('.condition-content').remove();
            $conditionTypes.siblings('span').remove();
            let $conditionContent = $(generateConditionContent(typeFieldId || typeValue));
            $conditionContent.insertAfter($conditionTypes);
            refreshAvailable();

            if ('TAGS' === typeValue) {
                let $conditionItem = $conditionContent.parents('.condition-item');
                let $tagsContainer = $('<div class="my-2 tags-container"></div>');
                $conditionItem.append($tagsContainer);

                let $tagsTypeahead = $conditionContent.find('.typeahead');
                $tagsTypeahead.typeahead({
                    minLength: 1,
                    fitToElement: true,
                    showHintOnFocus: false,
                    items: 4,
                    source: allTags,
                    autoSelect: false,
                    afterSelect: function() {
                        let tag = $tagsTypeahead.val();
                        $tagsContainer.append(
                            '<div class="d-inline-flex align-items-center mx-2 my-1 tag-chip">' +
                                '<span class="pt-2 pb-2 pl-2 chip-text">' + tag + '</span>' +
                                '<i class="p-2 fas fa-times remove-chip"></i>' +
                            '</div>'
                        );
                    }
                });

                $tagsTypeahead.on('keyup', function(ev) {
                    var typeaheadData = $(ev.target).data('typeahead');
                    typeaheadData.lookup();
                });
            }
        }

        /**
         * @param {MouseEvent} ev
         */
        function conditionContentChanged(ev) {
            let $target = $(ev.target).hasClass('dropdown-item') ? $(ev.target) : $(ev.target).parents('.dropdown-item');
            let contentValue = $target.attr('value');
            let contentText = $target.text();
            let appId = $target.attr('app-id');

            let $conditionContent = $target.parents('.condition-content');
            $conditionContent.find('.dropdown-value').attr('value', contentValue).attr('app-id', appId || '').text(contentText);
            refreshAvailable();
        }

        function refreshAvailable() {
            let availableCount = findavailableCount();
            let $availableCount = $composeAddModal.find('#availableCount');
            $availableCount.text('有 ' + availableCount + ' 筆符合的發送對象').removeClass('d-none');
        }

        function retrieveConditions() {
            let conditions = [];
            let $conditionItems = $composeAddModal.find('.condition-item');
            $conditionItems.each(function() {
                let $conditionItem = $(this);
                let $typeValues = $conditionItem.find('.condition-types .dropdown-value');

                let typeFieldId = $typeValues.attr('field-id');
                let conditionType = $typeValues.attr('value');

                let contentValues = [];
                if ('TAGS' === conditionType) {
                    let $tags = $conditionItem.find('.tags-container .chip-text');
                    $tags.each(function() {
                        let tag = $(this).text();
                        contentValues.push(tag);
                    });
                } else {
                    let $contentValues = $conditionItem.find('.condition-content .dropdown-value');
                    $contentValues.each(function() {
                        let value = $(this).attr('value');
                        contentValues.push(value);
                    });
                }

                let condition = {
                    type: conditionType,
                    values: contentValues,
                    field_id: typeFieldId
                };

                let hasContain = false;
                for (let i in conditions) {
                    if (conditions[i].type === condition.type) {
                        hasContain = true;
                        conditions[i].values = condition.values;
                        break;
                    }
                }
                !hasContain && conditions.push(condition);
            });
            return conditions;
        }

        function findavailableCount() {
            let availableCount = 0;
            let conditions = retrieveConditions();
            // console.log(JSON.stringify(conditions, void 0, 2));

            let appIds = [];
            let $checkedInputs = $appsDropdownMenu.find('input:checked');
            $checkedInputs.each(function() {
                appIds.push($(this).attr('app-id'));
            });

            for (let i in appIds) {
                let appId = appIds[i];
                let app = apps[appId];
                if (CHATSHIER === app.type || !appsChatrooms[appId]) {
                    continue;
                }
                let chatrooms = appsChatrooms[appId].chatrooms;
                for (let chatroomId in chatrooms) {
                    let chatroom = chatrooms[chatroomId];
                    if (chatroom.platformGroupId) {
                        continue;
                    }
                    let messagers = chatroom.messagers;

                    for (let messagerId in messagers) {
                        let messager = messagers[messagerId];
                        if (CHATSHIER === messager.type) {
                            continue;
                        }

                        let isAvailable = !conditions.length;
                        for (let i in conditions) {
                            let condition = conditions[i];

                            if ('AGE_RANGE' === condition.type) {
                                if (!messager.age) {
                                    isAvailable = false;
                                } else {
                                    let ageDown = condition.values[0];
                                    let ageUp = condition.values[1];
                                    isAvailable = ageDown <= messager.age && ageUp >= messager.age;
                                }
                            } else if ('GENDER' === condition.type) {
                                if (!messager.gender) {
                                    isAvailable = false;
                                } else {
                                    let gender = condition.values[0];
                                    isAvailable = gender === messager.gender;
                                }
                            } else if ('TAGS' === condition.type) {
                                if (!messager.tags || (messager.tags && 0 === messager.tags.length)) {
                                    isAvailable = false;
                                } else {
                                    let tags = condition.values;
                                    let hasContainTag = false;
                                    for (let i in tags) {
                                        if (messager.tags.includes(tags[i])) {
                                            hasContainTag = true;
                                            break;
                                        }
                                    }
                                    isAvailable = hasContainTag;
                                }
                            } else if ('CUSTOM_FIELD' === condition.type) {
                                let fieldId = condition.field_id;
                                let customField = messager.custom_fields[fieldId];
                                if (!customField) {
                                    isAvailable = false;
                                } else {
                                    let customFieldValue = customField.value;
                                    isAvailable = customFieldValue.indexOf(condition.values[0]) >= 0;
                                }
                            }

                            if (!isAvailable) {
                                break;
                            }
                        }

                        isAvailable && availableCount++;
                    }
                }
            }
            return availableCount;
        }

        function insertSubmit() {
            let $errorMsgElem = $composeAddModal.find('.error-input');
            $errorMsgElem.empty().addClass('d-none');

            let isTextVaild = true;
            let $textInputs = $composeAddModal.find('#inputWarpper .text-input');
            $textInputs.each(function() {
                isTextVaild &= !!$(this).val();
            });

            if (!isTextVaild) {
                $errorMsgElem.text('請輸入群發的內容').removeClass('d-none');
                return;
            }

            let isDraft = $composeAddModal.find('input[name="modal-draft"]').prop('checked');
            let isSendNow = $('#send-now').prop('checked');
            let isReserveSend = $('#send-sometime').prop('checked');
            let conditions = retrieveConditions();

            let appIds = [];
            let $checkedInputs = $appsDropdownMenu.find('input:checked');
            $checkedInputs.each(function() {
                appIds.push($(this).attr('app-id'));
            });

            if (0 === appIds.length) {
                $.notify('至少需選擇一個目標機器人', { type: 'warning' });
                return;
            }

            let composesAddDtPickerData = $composesAddDtPicker.data('DateTimePicker');
            let reserveTime = composesAddDtPickerData
                ? composesAddDtPickerData.date().toDate().getTime()
                : new Date($composesAddDtInput.val()).getTime();

            if (isReserveSend && reserveTime < Date.now()) {
                $errorMsgElem.text('群發時間必須大於現在時間').removeClass('d-none');
                return;
            }

            let composes = [];
            $textInputs.each(function() {
                let compose = {
                    type: 'text',
                    text: $(this).val(),
                    status: !isDraft,
                    time: isSendNow ? Date.now() - 60000 : reserveTime,
                    isImmediately: isSendNow,
                    conditions: conditions
                };
                composes.push(compose);
            });

            $composeAddModal.find('#composeAddSubmitBtn').attr('disabled', true);

            let insertedAppsComposes = {};
            let nextRequest = function(i) {
                if (i >= appIds.length) {
                    return Promise.resolve();
                }

                let appId = appIds[i];
                insertedAppsComposes[appId] = { composes: {} };
                return api.appsComposes.insert(appId, userId, composes, true).then((resJsons) => {
                    resJsons.forEach((resJson) => {
                        let _appsComposes = resJson.data;
                        let _composes = _appsComposes[appId].composes;
                        Object.assign(insertedAppsComposes[appId].composes, _composes);
                        Object.assign(appsComposes[appId].composes, _composes);
                    });
                }).then(() => {
                    return nextRequest(i + 1);
                });
            };

            return nextRequest(0).then(() => {
                if (isDraft || isReserveSend) {
                    return;
                }

                // 立即群發動作將資料包裝為 socket 資料
                // 使用 socket 發送至所有用戶端
                let socketBody = {
                    appIds: appIds,
                    composes: composes,
                    conditions: conditions
                };
                return new Promise((resolve, reject) => {
                    socket.emit(SOCKET_EVENTS.PUSH_COMPOSES_TO_ALL, socketBody, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
            }).then(() => {
                $composeAddModal.find('#composeAddSubmitBtn').removeAttr('disabled');
                $composeAddModal.modal('hide');
                $.notify('處理成功', { type: 'success' });
                return loadComposes(nowSelectAppId);
            }).catch((err) => {
                console.log(err);
                $composeAddModal.find('#composeAddSubmitBtn').removeAttr('disabled');
                $composeAddModal.modal('hide');

                if (NO_PERMISSION_CODE === err.code) {
                    $.notify('無此權限', { type: 'danger' });
                    return;
                }

                if (MUST_BE_LATER_THAN_NOW === err.code) {
                    $.notify('群發時間必須大於現在時間', { type: 'danger' });
                    return;
                }
                $.notify('處理失敗', { type: 'danger' });
            });
        }
    })();

    function removeInput() {
        deleteNum++;
        if (inputNum - deleteNum < 4) {
            $('.error-msg').addClass('d-none');
        };
        $(this).parent().remove();
    }

    function addComposeText() {
        inputNum++;
        if (inputNum - deleteNum > 3) {
            $('.error-msg').removeClass('d-none');
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

    function appSourceChanged(ev) {
        nowSelectAppId = $(ev.target).attr('app-id');
        $appSelector.find('.dropdown-text').text(ev.target.text);
        loadComposes(nowSelectAppId);
    }

    function loadComposes(appId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        $historyTableBody.empty();
        $draftTableBody.empty();
        $reservationTableBody.empty();

        if (!appsComposes[appId]) {
            return;
        }

        let composes = appsComposes[appId].composes;
        let composeIds = Object.keys(composes);
        composeIds.sort((a, b) => new Date(composes[b].time) - new Date(composes[a].time));

        for (let i in composeIds) {
            let composeId = composeIds[i];
            let compose = composes[composeId];
            if (compose.isDeleted) {
                continue;
            }

            let composeTime = new Date(compose.time).getTime();
            let isDraft = !compose.status;
            let timeInMs = (Date.now() + 1000);
            let isReservation = compose.status && composeTime > timeInMs;
            let isHistory = composeTime <= timeInMs;

            let $composeRow = $(
                '<tr id="' + composeId + '" text="' + appId + '">' +
                    '<td id="text" data-title="' + compose.text.toLowerCase() + '">' + compose.text + '</td>' +
                    '<td id="time">' + toLocalTimeString(compose.time) + '</td>' +
                    '<td>' +
                        (function generateConditionsCol(conditions) {
                            if (0 === conditions.length) {
                                return '無';
                            }

                            let typeText = {
                                AGE_RANGE: '年齡範圍',
                                GENDER: '性別',
                                TAGS: '標籤'
                            };

                            return conditions.map((condition) => {
                                let conditionText = typeText[condition.type] || '無';
                                let conditionContent = condition.values.join(', ');
                                if (condition.field_id) {
                                    let field = appsFields[appId].fields[condition.field_id];
                                    if (!field) {
                                        return '';
                                    }
                                    conditionText = field ? field.text : '無此自定義條件';
                                }

                                return (
                                    '<div class="condition-col">' +
                                        conditionText + ': ' + conditionContent +
                                    '<div>'
                                );
                            }).join('');
                        })(compose.conditions || []) +
                    '</td>' +
                    '<td>' +
                        '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas ' + (isHistory ? 'fa-share-square' : 'fa-edit') + ' update" id="edit-btn" data-toggle="modal" data-target="#composeEditModal" aria-hidden="true"></button>' +
                        (isHistory ? '' : '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove" id="delete-btn"></button>') +
                    '</td>' +
                '</tr>'
            );

            if (isReservation) {
                $reservationTableBody.append($composeRow);
            } else if (isHistory) {
                $historyTableBody.append($composeRow);
            } else if (isDraft) {
                $draftTableBody.append($composeRow);
            }
        }
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
        let code = ev.keyCode || ev.which;
        if (13 === code) {
            // 按下enter鍵
            if (0 === target.length) {
                $('tbody > tr ').hide();
            }
            $('.table>tbody > tr').hide();
            target.show();
        }
    }

    function toLocalTimeString(millisecond) {
        let date = new Date(millisecond);
        let localDate = date.toLocaleDateString();
        let localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let localTimeString = localDate + ' ' + localTime;
        return localTimeString;
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

    function remove() {
        let userId;
        try {
            let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
            userId = payload.uid;
        } catch (ex) {
            userId = '';
        }
        let targetRow = $(event.target).parent().parent();
        let appId = targetRow.attr('text');
        let composeId = targetRow.attr('id');
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
