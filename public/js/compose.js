/// <reference path='../../typings/client/index.d.ts' />

(function() {
    let api = window.restfulAPI;
    let SOCKET_NAMESPACE = '/chatshier';
    let SOCKET_SERVER_URL = window.urlConfig.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;
    let socket = io(SOCKET_SERVER_URL);

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    let apps = {};
    let appsChatrooms = {};
    let appsFields = {};
    let appsComposes = {};

    let nowSelectAppId = '';

    let $jqDoc = $(document);
    let $appSelector = $('#appSelector');
    let $historyTableBody = $('#composesHistoryTable tbody');
    let $reservationTableBody = $('#composesReservationTable tbody');
    let $draftTableBody = $('#composesDraftTable tbody');

    const CHATSHIER = 'CHATSHIER';
    const NO_PERMISSION_CODE = '3.16';
    const MUST_BE_LATER_THAN_NOW = '15.5';

    const DEFAULT_CONDITION_TYPES = {
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
    $(document).on('click', '.remove.delete-btn', removeCompose);
    $(document).on('change paste keyup', '.search-bar', composesSearch);

    // 當有收到訊息發送的事件時更新 compose
    socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, function(data) {
        /** @type {ChatshierChatSocketBody} */
        let socketBody = data;
        let appId = socketBody.app_id;
        appId === nowSelectAppId && refreshComposes(nowSelectAppId);
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
            if (app.isDeleted ||
                app.type === CHATSHIER) {
                delete apps[appId];
                continue;
            }

            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" app-id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            nowSelectAppId = nowSelectAppId || appId;
        }

        if (nowSelectAppId) {
            $appSelector.find('.dropdown-text').text(apps[nowSelectAppId].name);
            refreshComposes(nowSelectAppId);
        }
        $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕

        return new Promise(function(resolve) {
            socket.emit(SOCKET_EVENTS.USER_REGISTRATION, userId, resolve);
        });
    });

    const ConditionComponent = (function() {
        class ConditionComponent {
            /**
             * @param {JQuery<HTMLElement>} $composeModal
             */
            constructor($composeModal) {
                this.$composeModal = $composeModal;
                this._appIds = [];
                this._conditionTypes = {};
                this._allFields = {};
                this._allTags = [];

                this.$conditionContainer = $composeModal.find('#conditionContainer');

                this.addConditionItem = this.addConditionItem.bind(this);
                this.generateConditionContent = this.generateConditionContent.bind(this);
                this.fieldSetsToConditionInput = this.fieldSetsToConditionInput.bind(this);
                this.removeConditionItem = this.removeConditionItem.bind(this);
                this.removeTag = this.removeTag.bind(this);
                this.conditionTypeChanged = this.conditionTypeChanged.bind(this);
                this.conditionContentChanged = this.conditionContentChanged.bind(this);

                $composeModal.on('click', '.condition-add-btn', this.addConditionItem);
                $composeModal.on('click', '.condition-remove-btn', this.removeConditionItem);
                $composeModal.on('click', '.condition-item .condition-types-menu .dropdown-item', this.conditionTypeChanged);
                $composeModal.on('click', '.condition-item .condition-content-menu .dropdown-item', this.conditionContentChanged);
                $composeModal.on('change', '.condition-item input.condition-value', this.conditionContentChanged);
                $composeModal.on('click', '.condition-item .tag-chip .remove-chip', this.removeTag);
            }

            set appIds(value) { this._appIds = value; }
            set conditionTypes(value) { this._conditionTypes = value; }
            set allFields(value) { this._allFields = value; }
            set allTags(value) { this._allTags = value; }

            /**
             * @param {MouseEvent} [ev]
             * @param {string} [type]
             */
            addConditionItem(ev, type, values, fieldId) {
                type = type || 'AGE_RANGE';
                let conditionType = DEFAULT_CONDITION_TYPES[type] || this._conditionTypes[type] || this._conditionTypes[fieldId];
                let options = {
                    type: type,
                    field: this._allFields[conditionType.field_id],
                    values: values
                };

                let $conditionItem = $(
                    '<div class="my-1 d-flex flex-wrap align-items-center condition-item">' +
                        '<div class="col-11 pl-0 pr-2 item-wrapper">' +
                            '<div class="col-12 px-0 dropdown condition-types">' +
                                '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                    '<span class="condition-value" value="' + type + '" field-id="' + conditionType.field_id + '">' + conditionType.text + '</span>' +
                                '</button>' +
                                '<div class="dropdown-menu condition-types-menu">' +
                                    (() => {
                                        return Object.keys(DEFAULT_CONDITION_TYPES).map((type) => {
                                            return '<a class="dropdown-item" value="' + type + '">' + DEFAULT_CONDITION_TYPES[type].text + '</a>';
                                        }).join('');
                                    })() +
                                    (Object.keys(this._conditionTypes).length > 0 ? '<div class="dropdown-divider"></div>' : '') +
                                    (() => {
                                        return Object.keys(this._conditionTypes).map((fieldId) => {
                                            return '<a class="dropdown-item" value="CUSTOM_FIELD" field-id="' + fieldId + '">' + this._conditionTypes[fieldId].text + '</a>';
                                        }).join('');
                                    })() +
                                '</div>' +
                            '</div>' +
                            '<div class="col-12 mt-2 px-0 text-center condition-content-wrapper">' +
                                generateConditionContent(options) +
                            '</div>' +
                        '</div>' +
                        '<i class="col-1 ml-auto p-2 fas fa-times-circle condition-remove-btn"></i>' +
                    '</div>'
                );
                if (this.$conditionContainer.children().length > 0) {
                    this.$conditionContainer.append('<hr />');
                }
                this.$conditionContainer.append($conditionItem);

                if ('TAGS' === type) {
                    this.enableTypeahead($conditionItem.find('.condition-content-wrapper'));
                    if (options.values && options.values.length > 0) {
                        let $tagsContainer = $conditionItem.find('.tags-container');
                        $tagsContainer.append(options.values.map((tag) => {
                            return (
                                '<div class="d-inline-flex align-items-center mx-2 my-1 tag-chip">' +
                                    '<span class="pt-2 pb-2 pl-2 chip-text" tag="' + tag + '">' + tag + '</span>' +
                                    '<i class="p-2 fas fa-times remove-chip"></i>' +
                                '</div>'
                            );
                        }).join(''));
                    }
                }

                this.refreshAvailable();
            }

            /**
             * @param {any} options
             */
            generateConditionContent(options) {
                options = options || {};
                let type = options.type;
                let field = options.field;
                let values = options.values || [];

                switch (type) {
                    case 'AGE_RANGE':
                        let ageDown = values[0] || '10';
                        let ageUp = values[1] || '50';
                        return (
                            '<div class="d-inline-block dropdown condition-content range range-down">' +
                                '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                    '<span class="condition-value" value="' + ageDown + '">' + ageDown + ' 歲</span>' +
                                '</button>' +
                                '<div class="dropdown-menu condition-content-menu">' +
                                    (() => {
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
                            '<span class="px-2">~</span>' +
                            '<div class="d-inline-block dropdown condition-content range range-up">' +
                                '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                    '<span class="condition-value" value="' + ageUp + '">' + ageUp + ' 歲</span>' +
                                '</button>' +
                                '<div class="dropdown-menu condition-content-menu">' +
                                    (() => {
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
                        let gender = values[0] ? values[0] : 'MALE';
                        let genderText = 'MALE' === gender ? '男' : '女';
                        return (
                            '<div class="dropdown condition-content">' +
                                '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                    '<span class="condition-value" value="' + gender + '">' + genderText + '</span>' +
                                '</button>' +
                                '<div class="dropdown-menu condition-content-menu">' +
                                    '<a class="dropdown-item" value="MALE">男</a>' +
                                    '<a class="dropdown-item" value="FEMALE">女</a>' +
                                '</div>' +
                            '</div>'
                        );
                    case 'TAGS':
                        return (
                            '<div class="condition-content">' +
                                '<input class="form-control typeahead" data-provide="typeahead" type="text" placeholder="請輸入標籤關鍵字" />' +
                            '</div>'
                        );
                    default:
                        if (field) {
                            return fieldSetsToConditionInput(field);
                        }
                        return '';
                }
            }

            /**
             * @param {any} field
             */
            fieldSetsToConditionInput(field) {
                let SETS_TYPES = api.appsFields.enums.setsType;

                switch (field.setsType) {
                    case SETS_TYPES.CHECKBOX:
                        return (
                            '<div class="d-inline-block dropdown condition-content">' +
                                '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                    '<span class="condition-value" value="true">是</span>' +
                                '</button>' +
                                '<div class="dropdown-menu condition-content-menu">' +
                                    '<a class="dropdown-item" value="true">是</a>' +
                                    '<a class="dropdown-item" value="false">否</a>' +
                                '</div>' +
                            '</div>'
                        );
                    case SETS_TYPES.NUMBER:
                        return (
                            '<div class="d-inline-block condition-content range">' +
                                '<input class="form-control condition-value" type="number" value="0" min="0" />' +
                            '</div>' +
                            '<span class="px-2">~</span>' +
                            '<div class="d-inline-block condition-content range">' +
                                '<input class="form-control condition-value" type="number" value="1" min="1" />' +
                            '</div>'
                        );
                    case SETS_TYPES.SELECT:
                    case SETS_TYPES.MULTI_SELECT:
                        return (
                            '<div class="d-inline-block dropdown condition-content">' +
                                '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                                    '<span class="condition-value" value="' + (field.sets[0] || '') + '">' + (field.sets[0] || '') + '</span>' +
                                '</button>' +
                                '<div class="dropdown-menu condition-content-menu">' +
                                    (() => {
                                        return field.sets.map((set) => {
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
            removeConditionItem(ev) {
                let $conditionItem = $(ev.target).parent();
                $conditionItem.prev('hr').remove();
                $conditionItem.remove();
                this.refreshAvailable();
            }

            /**
             * @param {MouseEvent} ev
             */
            removeTag(ev) {
                $(ev.target).parents('.tag-chip').remove();
                this.refreshAvailable();
            }

            /**
             * @param {MouseEvent} ev
             */
            conditionTypeChanged(ev) {
                let $target = $(ev.target).hasClass('dropdown-item') ? $(ev.target) : $(ev.target).parents('.dropdown-item');
                let typeValue = $target.attr('value');
                let typeFieldId = $target.attr('field-id');
                let typeText = $target.text();
                let $conditionTypes = $target.parents('.condition-types');

                let $conditionTypeValue = $conditionTypes.find('.condition-value');
                $conditionTypeValue.attr('value', typeValue).attr('field-id', typeFieldId).text(typeText);

                let $conditionContentWrapper = $conditionTypes.siblings('.condition-content-wrapper');
                $conditionContentWrapper.empty();
                $conditionTypes.parents('.item-wrapper').find('.tags-container').remove();

                let type = typeFieldId || typeValue;
                let conditionType = DEFAULT_CONDITION_TYPES[type] || this._conditionTypes[type];
                let options = {
                    type: type,
                    field: this._allFields[conditionType.field_id]
                };
                let $conditionContent = $(generateConditionContent(options));
                $conditionContentWrapper.append($conditionContent);
                this.refreshAvailable();

                if ('TAGS' === typeValue) {
                    this.enableTypeahead($conditionContentWrapper);
                }
            }

            /**
             * @param {MouseEvent} ev
             */
            conditionContentChanged(ev) {
                let $target = $(ev.target).hasClass('dropdown-item') ? $(ev.target) : $(ev.target).parents('.dropdown-item');
                let contentValue = $target.attr('value');
                let contentText = $target.text();
                let appId = $target.attr('app-id');

                let $conditionContent = $target.parents('.condition-content');
                $conditionContent.find('.condition-value').attr('value', contentValue).attr('app-id', appId || '').text(contentText);
                this.refreshAvailable();
            }

            /**
             * @param {JQuery<HTMLElement>} $conditionContentWrapper
             */
            enableTypeahead($conditionContentWrapper) {
                let $tagsContainer = $('<div class="my-2 tags-container"></div>');
                let $conditionItem = $conditionContentWrapper.parents('.item-wrapper');
                $conditionItem.append($tagsContainer);

                let $tagsTypeahead = $conditionContentWrapper.find('.typeahead');
                $tagsTypeahead.typeahead({
                    minLength: 1,
                    fitToElement: true,
                    showHintOnFocus: false,
                    items: 4,
                    source: this._allTags,
                    autoSelect: false,
                    afterSelect: () => {
                        let tag = $tagsTypeahead.val();
                        if (0 === $tagsContainer.find('[tag="' + tag + '"]').length) {
                            $tagsContainer.append(
                                '<div class="d-inline-flex align-items-center mx-2 my-1 tag-chip">' +
                                    '<span class="pt-2 pb-2 pl-2 chip-text" tag="' + tag + '">' + tag + '</span>' +
                                    '<i class="p-2 fas fa-times remove-chip"></i>' +
                                '</div>'
                            );
                            this.refreshAvailable();
                        }
                        $tagsTypeahead.val('');
                    }
                });
                $tagsTypeahead.on('keyup', (ev) => $(ev.target).data('typeahead').lookup());
            }

            refreshAvailable() {
                let appIds = this._appIds;
                let availableCount = 0;

                let conditions = this.retrieveConditions();
                let conditionsSets = conditions.reduce((output, condition) => {
                    let type = condition.type;
                    output[type] = output[type] || [];
                    output[type].push(condition);
                    return output;
                }, {});

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
                            for (let conditionType in conditionsSets) {
                                let _conditions = conditionsSets[conditionType];
                                let isAccept = !_conditions.length;

                                for (let i in _conditions) {
                                    let condition = _conditions[i];

                                    if ('AGE_RANGE' === conditionType) {
                                        if (!messager.age) {
                                            isAccept = isAccept || false;
                                        } else {
                                            let ageDown = condition.values[0];
                                            let ageUp = condition.values[1];
                                            isAccept = isAccept || (ageDown <= messager.age && ageUp >= messager.age);
                                        }
                                    } else if ('GENDER' === conditionType) {
                                        if (!messager.gender) {
                                            isAccept = isAccept || false;
                                        } else {
                                            let gender = condition.values[0];
                                            isAccept = isAccept || gender === messager.gender;
                                        }
                                    } else if ('TAGS' === conditionType) {
                                        if (!messager.tags || (messager.tags && 0 === messager.tags.length)) {
                                            isAccept = isAccept || false;
                                        } else {
                                            let tags = condition.values;
                                            let hasContainTag = false;
                                            for (let i in tags) {
                                                if (messager.tags.includes(tags[i])) {
                                                    hasContainTag = true;
                                                    break;
                                                }
                                            }
                                            isAccept = isAccept || hasContainTag;
                                        }
                                    } else if ('CUSTOM_FIELD' === conditionType) {
                                        let fieldId = condition.field_id;
                                        let customField = messager.custom_fields[fieldId];

                                        if (!customField) {
                                            isAccept = isAccept || false;
                                        } else {
                                            let field = this._allFields[fieldId];
                                            let customFieldValue = customField.value;
                                            let SETS_TYPES = api.appsFields.enums.setsType;

                                            switch (field.setsType) {
                                                case SETS_TYPES.SELECT:
                                                case SETS_TYPES.MULTI_SELECT:
                                                    isAccept = isAccept || customFieldValue.indexOf(condition.values[0]) >= 0;
                                                    break;
                                                case SETS_TYPES.NUMBER:
                                                    customFieldValue = parseFloat(customFieldValue);
                                                    let numberDown = parseFloat(condition.values[0]);
                                                    let numberUp = parseFloat(condition.values[1]);
                                                    isAccept = isAccept || (
                                                        !isNaN(customFieldValue) &&
                                                        customFieldValue >= numberDown &&
                                                        customFieldValue <= numberUp
                                                    );
                                                    break;
                                                case SETS_TYPES.CHECKBOX:
                                                    isAccept = isAccept ||
                                                        ((customFieldValue && 'true' === condition.values[0]) ||
                                                        (!customFieldValue && 'false' === condition.values[0]));
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                    }
                                }
                                isAvailable = isAccept;
                            }
                            isAvailable && availableCount++;
                        }
                    }
                }

                let $availableCount = this.$composeModal.find('#availableCount');
                $availableCount.text('有 ' + availableCount + ' 筆符合的發送對象').removeClass('d-none');
            }

            retrieveConditions() {
                let conditions = [];
                let $conditionItems = this.$composeModal.find('.condition-item');
                $conditionItems.each(function() {
                    let $conditionItem = $(this);
                    let $typeValues = $conditionItem.find('.condition-types .condition-value');

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
                        let $contentValues = $conditionItem.find('.condition-content .condition-value');
                        $contentValues.each(function() {
                            let value = $(this).val() || $(this).attr('value');
                            contentValues.push(value);
                        });
                    }

                    let condition = {
                        type: conditionType || '',
                        values: contentValues,
                        field_id: typeFieldId || ''
                    };
                    conditions.push(condition);
                });
                return conditions;
            }
        }

        return ConditionComponent;
    })();

    // #region Add modal 的處理全部寫在此閉包中
    (function() {
        let conditionTypes = {};

        let allFields = {};
        let allTags = [];
        let inputNum = 0; // 計算訊息的數量
        let deleteNum = 0;

        let $composeAddModal = $('#composeAddModal');
        let $composesAddDtPicker = $composeAddModal.find('#sendDatetimePicker');
        let $composesAddDtInput = $composesAddDtPicker.find('input[name="sendDatetime"]');
        let $appsDropdownMenu = $composeAddModal.find('#appsDropdown .dropdown-menu');
        let conditionCmp = new ConditionComponent($composeAddModal);

        $composeAddModal.on('show.bs.modal', resetAddModal);
        $composeAddModal.on('change', '#appsDropdown .dropdown-item .form-check-input', updateAppsDropdownText);
        $composeAddModal.on('click', '#saveAsDraftBtn', (ev) => insertSubmit(ev, true));
        $composeAddModal.on('click', '#composeAddSubmitBtn', insertSubmit);
        $composeAddModal.on('click', '#addComposeText', addComposeText);
        $composeAddModal.on('click', '.input-container .remove-btn', removeInput);

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
                            (ICONS[app.type] ? '<i class="' + ICONS[app.type] + '"></i>' : '') +
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

            conditionCmp.conditionTypes = conditionTypes;
            conditionCmp.allFields = allFields;
            conditionCmp.allTags = allTags;
            conditionCmp.$conditionContainer.empty();

            $composeAddModal.find('.error-msg').addClass('d-none');
            $composeAddModal.find('.error-input').addClass('d-none');
            $composeAddModal.find('.text-input').val('');
            $composeAddModal.find('#condition').remove();
            $composeAddModal.find('#send-now').prop('checked', true);
            $composeAddModal.find('#checkbox_value').prop('checked', false);
            $composeAddModal.find('#availableCount').empty().addClass('d-none');

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

            let appIds = [];
            $checkedInputs.each((i) => appIds.push($($checkedInputs[i]).attr('app-id')));
            conditionCmp.appIds = appIds;
            conditionCmp.refreshAvailable();
        }

        function insertSubmit(ev, isSaveAsDraft) {
            let isTextVaild = true;
            let $textInputs = $composeAddModal.find('#inputWarpper .text-input');
            $textInputs.each(function() {
                isTextVaild &= !!$(this).val();
            });

            if (!isTextVaild) {
                $.notify('請輸入群發的內容', { type: 'warning' });
                return;
            }

            let isDraft = !!isSaveAsDraft;
            let isSendNow = $('#send-now').prop('checked');
            let isReserveSend = $('#send-sometime').prop('checked');
            let conditions = conditionCmp.retrieveConditions();

            let appIds = [];
            let $checkedInputs = $appsDropdownMenu.find('input:checked');
            $checkedInputs.each((i) => appIds.push($($checkedInputs[i]).attr('app-id')));

            if (0 === appIds.length) {
                $.notify('至少需選擇一個目標機器人', { type: 'warning' });
                return;
            }

            let composesAddDtPickerData = $composesAddDtPicker.data('DateTimePicker');
            let reserveTime = composesAddDtPickerData
                ? composesAddDtPickerData.date().toDate().getTime()
                : new Date($composesAddDtInput.val()).getTime();

            if (isReserveSend && reserveTime < Date.now()) {
                $.notify('群發時間必須大於現在時間', { type: 'warning' });
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
                (!insertedAppsComposes[appId]) && (insertedAppsComposes[appId] = { composes: {} });
                (!appsComposes[appId]) && (appsComposes[appId] = { composes: {} });
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
                return refreshComposes(nowSelectAppId);
            }).catch((err) => {
                $composeAddModal.find('#composeAddSubmitBtn').removeAttr('disabled');

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

        function removeInput() {
            deleteNum++;
            if (inputNum - deleteNum < 4) {
                $('.error-msg').addClass('d-none');
            };
            $(this).parent().remove();
        }
    })();
    // #endregion

    // #region Edit modal 的處理全部寫在此閉包中
    (function() {
        let allFields = {};
        let allTags = [];
        let conditionTypes = {};

        let appId;
        let composeId;

        let $composeEditModal = $('#composeEditModal');
        let $composesEditDtPicker = $composeEditModal.find('#sendDatetimePicker');
        let $composesEditDtInput = $composesEditDtPicker.find('input[name="sendDatetime"]');
        let conditionCmp = new ConditionComponent($composeEditModal);

        $composeEditModal.on('show.bs.modal', initEditCompose);
        $composeEditModal.on('click', '#editSubmitBtn', updateCompose);

        if (!window.isMobileBrowser()) {
            $composesEditDtPicker.datetimepicker(datetimePickerInitOpts);
        } else {
            $composesEditDtInput.attr('type', 'datetime-local');
            $composesEditDtPicker.on('click', '.input-group-prepend', function() {
                $composesEditDtInput.focus();
            });
        }

        /**
         * @param {JQuery.Event} ev
         */
        function initEditCompose(ev) {
            let $composeRow = $(ev.relatedTarget).parents('.compose-row');

            appId = $composeRow.attr('app-id');
            composeId = $composeRow.attr('compose-id');
            let compose = appsComposes[appId].composes[composeId];

            let composesEditDtPickerData = $composesEditDtPicker.data('DateTimePicker');
            if (composesEditDtPickerData) {
                composesEditDtPickerData.date(new Date(compose.time));
            } else {
                $composesEditDtInput.val(toDatetimeLocal(new Date(compose.time)));
            }
            $composeEditModal.find('.compose-textarea').val(compose.text);
            $composeEditModal.find('.form-check-input[name="isDraft"]').attr('checked', !compose.status);

            conditionTypes = {};
            allFields = {};
            allTags.length = 0;

            for (let appId in apps) {
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

            conditionCmp.appIds = [appId];
            conditionCmp.conditionTypes = conditionTypes;
            conditionCmp.allFields = allFields;
            conditionCmp.allTags = allTags;
            conditionCmp.$conditionContainer.empty();

            let conditions = compose.conditions || [];
            for (let i in conditions) {
                let condition = conditions[i];
                conditionCmp.addConditionItem(null, condition.type, condition.values, condition.field_id);
            }

            conditionCmp.refreshAvailable();
        }

        function updateCompose() {
            let composeText = $composeEditModal.find('.compose-textarea').val();
            if (!composeText) {
                $.notify('請輸入群發的內容', { type: 'warning' });
                return;
            }

            let isDraft = $composeEditModal.find('.form-check-input[name="isDraft"]:checked').length > 0;
            let composesEditDtPickerData = $composesEditDtPicker.data('DateTimePicker');
            let reserveTime = composesEditDtPickerData
                ? composesEditDtPickerData.date().toDate().getTime()
                : new Date($composesEditDtInput.val()).getTime();

            let conditions = conditionCmp.retrieveConditions();
            let putCompose = {
                status: !isDraft,
                time: reserveTime,
                text: composeText,
                conditions: conditions
            };

            $composeEditModal.find('#editSubmitBtn').attr('disabled', true);
            return api.appsComposes.update(appId, composeId, userId, putCompose).then((resJson) => {
                $composeEditModal.find('#editSubmitBtn').removeAttr('disabled');
                $composeEditModal.modal('hide');

                let _appsComposes = resJson.data;
                let _composes = _appsComposes[appId].composes;
                Object.assign(appsComposes[appId].composes, _composes);

                $.notify('更新成功', { type: 'success' });
                return refreshComposes(nowSelectAppId);
            }).catch((err) => {
                $composeEditModal.find('#editSubmitBtn').removeAttr('disabled');

                if (NO_PERMISSION_CODE === err.code) {
                    $.notify('無此權限', { type: 'danger' });
                    return;
                }

                if (MUST_BE_LATER_THAN_NOW === err.code) {
                    $.notify('群發時間必須大於現在時間', { type: 'danger' });
                    return;
                }
                $.notify('更新失敗', { type: 'danger' });
            });
        }
    })();
    // #endregion

    function appSourceChanged() {
        nowSelectAppId = $(this).attr('app-id');
        $appSelector.find('.dropdown-text').text($(this).text());
        refreshComposes(nowSelectAppId);
    }

    function refreshComposes(appId) {
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
                '<tr class="compose-row" app-id="' + appId + '" compose-id="' + composeId + '">' +
                    '<td class="text-pre" id="text" data-title="' + compose.text.toLowerCase() + '">' + compose.text + '</td>' +
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
                        '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas ' + (isReservation || isDraft ? 'fa-edit' : 'fa-share-square') + ' update" id="edit-btn" data-toggle="modal" data-target="#composeEditModal" aria-hidden="true"></button>' +
                        (isReservation || isDraft ? '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove delete-btn"></button>' : '') +
                    '</td>' +
                '</tr>'
            );

            if (isDraft) {
                $draftTableBody.append($composeRow);
            } else if (isReservation) {
                $reservationTableBody.append($composeRow);
            } else if (isHistory) {
                $historyTableBody.append($composeRow);
            }
        }
    }

    /**
     * @param {any} options
     */
    function generateConditionContent(options) {
        options = options || {};
        let type = options.type;
        let field = options.field;
        let conditionValues = options.conditionValues || [];

        switch (type) {
            case 'AGE_RANGE':
                let ageDown = conditionValues[0] || '10';
                let ageUp = conditionValues[1] || '50';
                return (
                    '<div class="d-inline-block dropdown condition-content range range-down">' +
                        '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                            '<span class="condition-value" value="' + ageDown + '">' + ageDown + ' 歲</span>' +
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
                    '<span class="px-2">~</span>' +
                    '<div class="d-inline-block dropdown condition-content range range-up">' +
                        '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                            '<span class="condition-value" value="' + ageUp + '">' + ageUp + ' 歲</span>' +
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
                let gender = conditionValues[0] ? conditionValues[0] : 'MALE';
                let genderText = 'MALE' === gender ? '男' : '女';
                return (
                    '<div class="dropdown condition-content">' +
                        '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                            '<span class="condition-value" value="' + gender + '">' + genderText + '</span>' +
                        '</button>' +
                        '<div class="dropdown-menu condition-content-menu">' +
                            '<a class="dropdown-item" value="MALE">男</a>' +
                            '<a class="dropdown-item" value="FEMALE">女</a>' +
                        '</div>' +
                    '</div>'
                );
            case 'TAGS':
                return (
                    '<div class="condition-content">' +
                        '<input class="form-control typeahead" data-provide="typeahead" type="text" placeholder="請輸入標籤關鍵字" />' +
                    '</div>'
                );
            default:
                if (field) {
                    return fieldSetsToConditionInput(field);
                }
                return '';
        }
    }

    /**
     * @param {any} field
     */
    function fieldSetsToConditionInput(field) {
        let SETS_TYPES = api.appsFields.enums.setsType;

        switch (field.setsType) {
            case SETS_TYPES.CHECKBOX:
                return (
                    '<div class="dropdown condition-content">' +
                        '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                            '<span class="condition-value" value="true">是</span>' +
                        '</button>' +
                        '<div class="dropdown-menu condition-content-menu">' +
                            '<a class="dropdown-item" value="true">是</a>' +
                            '<a class="dropdown-item" value="false">否</a>' +
                        '</div>' +
                    '</div>'
                );
            case SETS_TYPES.NUMBER:
                return (
                    '<div class="d-inline-block condition-content range">' +
                        '<input class="form-control condition-value" type="number" value="0" min="0" />' +
                    '</div>' +
                    '<span class="px-2">~</span>' +
                    '<div class="d-inline-block condition-content range">' +
                        '<input class="form-control condition-value" type="number" value="1" min="1" />' +
                    '</div>'
                );
            case SETS_TYPES.SELECT:
            case SETS_TYPES.MULTI_SELECT:
                return (
                    '<div class="dropdown condition-content">' +
                        '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                            '<span class="condition-value" value="' + (field.sets[0] || '') + '">' + (field.sets[0] || '') + '</span>' +
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

    function composesSearch(ev) {
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
            $('.table > tbody > tr').hide();
            target.show();
        }
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

    function removeCompose(ev) {
        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }

            let $composeRow = $(ev.target).parents('.compose-row');
            let appId = $composeRow.attr('app-id');
            let composeId = $composeRow.attr('compose-id');

            return api.appsComposes.remove(appId, composeId, userId).then(function(resJson) {
                delete appsComposes[appId].composes[composeId];
                $composeRow.remove();
                $.notify('刪除成功！', { type: 'success' });
            }).catch((resJson) => {
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                    return;
                }

                $.notify('失敗', { type: 'danger' });
            });
        });
    }

    function toLocalTimeString(millisecond) {
        let date = new Date(millisecond);
        let localDate = date.toLocaleDateString();
        let localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let localTimeString = localDate + ' ' + localTime;
        return localTimeString;
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
