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
            CHATBOT: {
                type: 'CHATBOT',
                text: '聊天機器人',
                field_id: ''
            },
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

        let $composeAddModal = $('#composeAddModal');
        let $composesAddDtPicker = $composeAddModal.find('#sendDatetimePicker');
        let $composesAddDtInput = $composesAddDtPicker.find('input[name="sendDatetime"]');
        let $conditionContainer = $composeAddModal.find('#conditionContainer');

        $composeAddModal.on('show.bs.modal', resetAddModal);
        $composeAddModal.on('click', '#composeAddSubmitBtn', insertSubmit);
        $composeAddModal.on('click', '.condition-add-btn', addConditionItem);
        $composeAddModal.on('click', '.condition-remove-btn', removeConditionItem);
        $composeAddModal.on('click', '.condition-item .condition-types-menu .dropdown-item', conditionTypeChanged);
        $composeAddModal.on('click', '.condition-item .condition-content-menu .dropdown-item', conditionContentChanged);

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

            for (let appId in appsFields) {
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

            for (let appId in appsChatrooms) {
                let _chatrooms = appsChatrooms[appId].chatrooms;
                for (let chatroomId in _chatrooms) {
                    let chatroom = _chatrooms[chatroomId];
                    if (chatroom.platformGroupId) {
                        continue;
                    }

                    let messengers = chatroom.messengers;
                    for (let messengerId in messengers) {
                        let messenger = messengers[messengerId];
                        if ('CHATSHIER' === messenger.type || !messenger.tags) {
                            continue;
                        }
                        allTags.concat(messenger.tags);
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
            addConditionItem();

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
        }

        /**
         * @param {MouseEvent} [ev]
         * @param {string} [type]
         */
        function addConditionItem(ev, type) {
            type = type || 'CHATBOT';
            let conditionType = DEFAULT_CONDITION_TYPES[type] || conditionTypes[type];

            let $conditionItem = $(
                '<div class="my-1 d-flex align-items-center condition-item">' +
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
                    '<i class="ml-auto p-2 fas fa-times-circle condition-remove-btn d-none"></i>' +
                '</div>'
            );
            $conditionContainer.append($conditionItem);

            let $conditionItems = $composeAddModal.find('.condition-item');
            if ($conditionItems.length > 1) {
                $composeAddModal.find('.condition-remove-btn').removeClass('d-none');
            }
            refreshAvailable();
        }

        /**
         * @param {string} type
         */
        function generateConditionContent(type) {
            let conditionType = DEFAULT_CONDITION_TYPES[type] || conditionTypes[type];

            switch (type) {
                case 'CHATBOT':
                    return (
                        '<div class="d-inline-block dropdown condition-content">' +
                            '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                '<span class="dropdown-value" value="ALL">全部</span>' +
                            '</button>' +
                            '<div class="dropdown-menu condition-content-menu">' +
                                '<a class="dropdown-item" value="ALL">全部</a>' +
                                '<a class="dropdown-item" value="LINE">LINE</a>' +
                                '<a class="dropdown-item" value="FACEBOOK">Facebook</a>' +
                                '<div class="dropdown-divider"></div>' +
                                (function() {
                                    let icons = {
                                        LINE: 'fab fa-line fa-fw line-color',
                                        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
                                    };
                                    return Object.keys(apps).map(function(appId) {
                                        let app = apps[appId];
                                        return (
                                            '<a class="dropdown-item" value="' + app.type + '" app-id="' + appId + '">' +
                                                (icons[app.type] ? '<i class="' + icons[app.type] + '"></i>' : '') +
                                                '<span>' + app.name + '</span>' +
                                            '</a>'
                                        );
                                    }).join('');
                                })() +
                            '</div>' +
                        '</div>'
                    );
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
                            '<input class="form-control" type="text" placeholder="請輸入標籤關鍵字" />' +
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
            let $conditionItems = $composeAddModal.find('.condition-item');
            if ($conditionItems.length <= 1) {
                $composeAddModal.find('.condition-remove-btn').addClass('d-none');
            }
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

            let $conditionContent = $conditionTypes.siblings('.condition-content');
            $conditionContent.remove();
            $conditionTypes.siblings('span').remove();
            $(generateConditionContent(typeFieldId || typeValue)).insertAfter($conditionTypes);
            refreshAvailable();
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
            let availableConut = findAvailableConut();
            let $availableCount = $composeAddModal.find('#availableCount');
            $availableCount.text('有 ' + availableConut + ' 筆符合的發送對象').removeClass('d-none');
        }

        function retrieveConditions() {
            let conditions = [];
            let $conditionItems = $composeAddModal.find('.condition-item');
            $conditionItems.each(function() {
                let $conditionItem = $(this);
                let $typeValues = $conditionItem.find('.condition-types .dropdown-value');
                let $contentValues = $conditionItem.find('.condition-content .dropdown-value');

                let typeFieldId = $typeValues.attr('field-id');
                let conditionType = $typeValues.attr('value');

                let contentValues = [];
                $contentValues.each(function() {
                    let value = $(this).attr('value');
                    let appId = $(this).attr('app-id');
                    contentValues.push(appId || value);
                });

                let condition = {
                    type: conditionType,
                    values: contentValues,
                    field_id: typeFieldId
                };

                let hasContain = false;
                for (let i in conditions) {
                    if (conditions[i].type === condition.type) {
                        hasContain = true;
                        if ('CHATBOT' === condition.type &&
                            condition.values[0] &&
                            !conditions[i].values.includes(condition.values[0])) {
                            conditions[i].values = conditions[i].values.concat(condition.values);
                            if (conditions[i].values.includes('ALL')) {
                                conditions[i].values = ['ALL'];
                            }
                        } else {
                            conditions[i].values = condition.values;
                        }
                        break;
                    }
                }
                !hasContain && conditions.push(condition);
            });
            return conditions;
        }

        function findAvailableConut() {
            let availableConut = 0;
            let conditions = retrieveConditions();
            // console.log(JSON.stringify(conditions, void 0, 2));

            for (let appId in apps) {
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

                        let isAvailable = false;
                        for (let cType in conditions) {
                            let condition = conditions[cType];

                            if ('CHATBOT' === condition.type) {
                                if (condition.values.includes('ALL')) {
                                    isAvailable = true;
                                } else if (condition.values.includes(LINE)) {
                                    isAvailable = LINE === app.type;
                                } else if (condition.values.includes(FACEBOOK)) {
                                    isAvailable = FACEBOOK === app.type;
                                } else {
                                    isAvailable = condition.values.includes(appId);
                                }
                            } else if ('AGE_RANGE' === condition.type) {
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

                        isAvailable && availableConut++;
                    }
                }
            }

            return availableConut;
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

            let appIds = (function() {
                let condition;
                for (let i in conditions) {
                    if ('CHATBOT' === conditions[i].type) {
                        condition = conditions[i];
                    }
                }

                if (!condition) {
                    return [];
                }

                let appIds = Object.keys(apps);
                let conditionValues = condition.values.slice();
                while (conditionValues.length > 0) {
                    if (conditionValues.includes('ALL')) {
                        conditionValues.splice(conditionValues.indexOf('ALL'), 1);
                    } else if (conditionValues.includes(LINE)) {
                        appIds = appIds.filter((appId) => LINE === apps[appId].type && !conditionValues.includes(appId));
                        conditionValues.splice(conditionValues.indexOf(LINE), 1);
                    } else if (conditionValues.includes(FACEBOOK)) {
                        appIds = appIds.filter((appId) => FACEBOOK === apps[appId].type && !conditionValues.includes(appId));
                        conditionValues.splice(conditionValues.indexOf(FACEBOOK), 1);
                    } else {
                        appIds = appIds.concat(conditionValues);
                        conditionValues.length = 0;
                    }
                }
                return appIds;
            })();

            if (0 === appIds.length) {
                $.notify('條件中至少需包含欲使用群發的目標機器人', { type: 'warning' });
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
                    time: isSendNow ? Date.now() : reserveTime,
                    isImmediately: isSendNow,
                    conditions: conditions
                };
                composes.push(compose);
            });

            let nextRequest = function(i) {
                if (i >= appIds.length) {
                    return Promise.resolve();
                }

                let appId = appIds[i];
                return api.appsComposes.insert(appId, userId, composes, true).then((resJsons) => {
                    resJsons.forEach((resJson) => {
                        let _appsComposes = resJson.data;
                        let _composes = _appsComposes[appId].composes;
                        Object.assign(appsComposes[appId].composes, _composes);
                    });
                }).then(() => {
                    return nextRequest(i + 1);
                });
            };

            $composeAddModal.find('#composeAddSubmitBtn').attr('disabled', true);
            // 如果是屬於草稿則不做立即發送動作
            // 將群發訊息存入資料庫，等待使用者再行編輯
            return nextRequest(0).then(() => {
                // 立即群發動作將資料包裝為 socket 資料
                // 使用 socket 發送至所有用戶端
                if (!isDraft && isSendNow) {
                    let socketBody = {
                        conditions: conditions,
                        composes: composes
                    };

                    return new Promise((resolve, reject) => {
                        socket.emit(SOCKET_EVENTS.PUSH_COMPOSES_TO_ALL, socketBody, (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                }
            }).then(() => {
                $composeAddModal.find('#composeAddSubmitBtn').removeAttr('disabled');
                $composeAddModal.modal('hide');
                if (isSendNow) {
                    $.notify('發送成功', { type: 'success' });
                } else {
                    $.notify('新增成功', { type: 'success' });
                }
                return loadComposes(nowSelectAppId);
            }).catch((err) => {
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
                                CHATBOT: '聊天機器人',
                                AGE_RANGE: '年齡範圍',
                                GENDER: '性別',
                                TAGS: '標籤',
                                ALL: '全部',
                                LINE: 'LINE',
                                FACEBOOK: 'Facebook'
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

                                if ('CHATBOT' === condition.type) {
                                    conditionContent = condition.values.map((value) => {
                                        let text = typeText[value];
                                        if (!text) {
                                            return apps[value].name;
                                        }
                                        return text;
                                    }).join(', ');
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
