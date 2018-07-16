/// <reference path='../../typings/client/index.d.ts' />

const ConditionSelector = (function() {
    const CONDITION_TYPES = Object.freeze({
        AGE_RANGE: 'AGE_RANGE',
        GENDER: 'GENDER',
        EMAIL: 'EMAIL',
        PHONE: 'PHONE',
        ADDRESS: 'ADDRESS',
        TAGS: 'TAGS',
        CUSTOM_FIELD: 'CUSTOM_FIELD'
    });

    const DEFAULT_CONDITIONS = Object.freeze({
        AGE_RANGE: {
            type: CONDITION_TYPES.AGE_RANGE,
            text: '年齡',
            field_id: ''
        },
        GENDER: {
            type: CONDITION_TYPES.GENDER,
            text: '性別',
            field_id: ''
        },
        EMAIL: {
            type: CONDITION_TYPES.EMAIL,
            text: '電子郵件',
            field_id: ''
        },
        PHONE: {
            type: CONDITION_TYPES.PHONE,
            text: '電話',
            field_id: ''
        },
        ADDRESS: {
            type: CONDITION_TYPES.ADDRESS,
            text: '地址',
            field_id: ''
        },
        TAGS: {
            type: CONDITION_TYPES.TAGS,
            text: '標籤',
            field_id: ''
        }
    });

    const TEXT_MATCH_WAYS = Object.freeze({
        INCLUDES: 'INCLUDES',
        FULL_MATCH: 'FULL_MATCH',
        STARTS_WITH: 'STARTS_WITH',
        ENDS_WITH: 'ENDS_WITH'
    });

    const MATCH_WAYS_DISPLAY_TEXT = Object.freeze({
        [TEXT_MATCH_WAYS.INCLUDES]: '含有文字',
        [TEXT_MATCH_WAYS.FULL_MATCH]: '完全符合',
        [TEXT_MATCH_WAYS.STARTS_WITH]: '以此開頭',
        [TEXT_MATCH_WAYS.ENDS_WITH]: '以此結尾'
    });

    const CHATSHIER = 'CHATSHIER';

    let api = window.restfulAPI;

    class ConditionSelector {
        /**
         * @param {JQuery<HTMLElement>} $composeModal
         */
        constructor($composeModal) {
            this.$composeModal = $composeModal;
            this._appIds = [];
            this._conditionTypes = {};
            this._allFields = {};
            this._allTags = [];

            /** @type {Chatshier.Models.Apps} */
            this.apps = {};
            /** @type {Chatshier.Models.AppsChatrooms} */
            this.appsChatrooms = {};

            this.$conditionContainer = $composeModal.find('#conditionContainer');

            this.addConditionItem = this.addConditionItem.bind(this);
            this.generateConditionContent = this.generateConditionContent.bind(this);
            this.fieldSetsToConditionInput = this.fieldSetsToConditionInput.bind(this);
            this.removeConditionItem = this.removeConditionItem.bind(this);
            this.removeTag = this.removeTag.bind(this);
            this.refreshAvailable = this.refreshAvailable.bind(this);

            $composeModal.on('click', '.condition-add-btn', this.addConditionItem);
            $composeModal.on('click', '.condition-remove-btn', this.removeConditionItem);
            $composeModal.on('click', '.condition-item .condition-types-menu .dropdown-item', this._conditionTypeChanged.bind(this));
            $composeModal.on('click', '.condition-item .condition-content-menu .dropdown-item', this._conditionContentChanged.bind(this));
            $composeModal.on('change', '.condition-item input.condition-value', this._conditionContentChanged.bind(this));
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
            type = type || CONDITION_TYPES.AGE_RANGE;
            let conditionType = DEFAULT_CONDITIONS[type] || this._conditionTypes[type] || this._conditionTypes[fieldId];
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
                                    return Object.keys(DEFAULT_CONDITIONS).map((type) => {
                                        return '<a class="dropdown-item" value="' + type + '">' + DEFAULT_CONDITIONS[type].text + '</a>';
                                    }).join('');
                                })() +
                                (Object.keys(this._conditionTypes).length > 0 ? '<div class="dropdown-divider"></div>' : '') +
                                (() => {
                                    return Object.keys(this._conditionTypes).map((fieldId) => {
                                        return '<a class="dropdown-item" value="' + CONDITION_TYPES.CUSTOM_FIELD + '" field-id="' + fieldId + '">' + this._conditionTypes[fieldId].text + '</a>';
                                    }).join('');
                                })() +
                            '</div>' +
                        '</div>' +
                        '<div class="col-12 mt-2 px-0 text-center condition-content-wrapper">' +
                            this.generateConditionContent(options) +
                        '</div>' +
                    '</div>' +
                    '<i class="col-1 ml-auto p-2 fas fa-times-circle condition-remove-btn"></i>' +
                '</div>'
            );
            if (this.$conditionContainer.children().length > 0) {
                this.$conditionContainer.append('<hr />');
            }
            this.$conditionContainer.append($conditionItem);

            if (CONDITION_TYPES.TAGS === type) {
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
         * @typedef ContentOptions
         * @property {CONDITION_TYPES} type
         * @property {Chatshier.Models.Field} field
         * @property {any[]} values
         * @param {ContentOptions} options
         */
        generateConditionContent(options) {
            options = options || {};
            let type = options.type;
            let field = options.field;
            let conditionValues = options.values || [];

            switch (type) {
                case CONDITION_TYPES.AGE_RANGE:
                    let ageDown = conditionValues[0] || '10';
                    let ageUp = conditionValues[1] || '50';
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
                case CONDITION_TYPES.GENDER:
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
                case CONDITION_TYPES.EMAIL:
                case CONDITION_TYPES.ADDRESS:
                case CONDITION_TYPES.PHONE:
                    return this._generateTextCondition(conditionValues[0], conditionValues[1]);
                case CONDITION_TYPES.TAGS:
                    return (
                        '<div class="condition-content">' +
                            '<input class="form-control typeahead" data-provide="typeahead" type="text" placeholder="請輸入標籤關鍵字" />' +
                        '</div>'
                    );
                case CONDITION_TYPES.CUSTOM_FIELD:
                default:
                    return field ? this.fieldSetsToConditionInput(field, conditionValues) : '';
            }
        }

        /**
         * @param {Chatshier.Models.Field} field
         * @param {any[]} [values]
         */
        fieldSetsToConditionInput(field, values) {
            values = values || [];
            let SETS_TYPES = api.appsFields.SETS_TYPES;

            switch (field.setsType) {
                case SETS_TYPES.CHECKBOX:
                    return this._generateCheckboxCondition(values[0]);
                case SETS_TYPES.NUMBER:
                    return this._generateNumberCondition(values[0], values[1]);
                case SETS_TYPES.SELECT:
                case SETS_TYPES.MULTI_SELECT:
                    return this._generateSelectCondition(field, values[0]);
                case SETS_TYPES.TEXT:
                    return this._generateTextCondition(values[0], values[1]);
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
                if (condition.field_id) {
                    let fieldId = condition.field_id;
                    output[fieldId] = output[fieldId] || [];
                    output[fieldId].push(condition);
                } else {
                    output[type] = output[type] || [];
                    output[type].push(condition);
                }
                return output;
            }, {});

            let textValidation = {
                [TEXT_MATCH_WAYS.INCLUDES]: (src, dest) => src.includes(dest),
                [TEXT_MATCH_WAYS.FULL_MATCH]: (src, dest) => (src === dest),
                [TEXT_MATCH_WAYS.STARTS_WITH]: (src, dest) => src.startsWith(dest),
                [TEXT_MATCH_WAYS.ENDS_WITH]: (src, dest) => src.endsWith(dest)
            };

            for (let i in appIds) {
                let appId = appIds[i];
                let app = this.apps[appId];
                if (!app || (app && CHATSHIER === app.type) || !this.appsChatrooms[appId]) {
                    continue;
                }

                let chatrooms = this.appsChatrooms[appId].chatrooms;
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

                        let isAvailable = true;
                        for (let conditionType in conditionsSets) {
                            let _conditions = conditionsSets[conditionType];
                            let isAccept = !_conditions.length;

                            for (let i in _conditions) {
                                let condition = _conditions[i];

                                if (CONDITION_TYPES.AGE_RANGE === conditionType) {
                                    if (!messager.age) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let ageDown = condition.values[0];
                                        let ageUp = condition.values[1];
                                        isAccept = isAccept || (ageDown <= messager.age && ageUp >= messager.age);
                                    }
                                } else if (CONDITION_TYPES.GENDER === conditionType) {
                                    if (!messager.gender) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let gender = condition.values[0];
                                        isAccept = isAccept || gender === messager.gender;
                                    }
                                } else if (CONDITION_TYPES.EMAIL === conditionType) {
                                    if (!messager.email) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let matchText = condition.values[0] || '';
                                        let matchWay = condition.values[1];
                                        if (matchText && matchWay) {
                                            isAccept = textValidation[matchWay] ? textValidation[matchWay](messager.email, matchText) : false;
                                        }
                                    }
                                } else if (CONDITION_TYPES.PHONE === conditionType) {
                                    if (!messager.phone) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let matchText = condition.values[0] || '';
                                        let matchWay = condition.values[1];
                                        if (matchText && matchWay) {
                                            isAccept = textValidation[matchWay] ? textValidation[matchWay](messager.phone, matchText) : false;
                                        }
                                    }
                                } else if (CONDITION_TYPES.ADDRESS === conditionType) {
                                    if (!messager.address) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let matchText = condition.values[0] || '';
                                        let matchWay = condition.values[1];
                                        if (matchText && matchWay) {
                                            isAccept = textValidation[matchWay] ? textValidation[matchWay](messager.address, matchText) : false;
                                        }
                                    }
                                } else if (CONDITION_TYPES.TAGS === conditionType) {
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
                                } else {
                                    let fieldId = condition.field_id;
                                    let customField = messager.custom_fields[fieldId];

                                    if (!(customField && customField.value)) {
                                        isAccept = isAccept || false;
                                    } else {
                                        let field = this._allFields[fieldId];
                                        let customFieldValue = customField.value || [];
                                        let SETS_TYPES = api.appsFields.SETS_TYPES;

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
                                            case SETS_TYPES.TEXT:
                                                let matchText = condition.values[0] || '';
                                                let matchWay = condition.values[1];
                                                if (matchText && matchWay) {
                                                    isAccept = textValidation[matchWay] ? textValidation[matchWay](customFieldValue, matchText) : false;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                }
                            }
                            isAvailable = isAvailable && isAccept;
                        }
                        isAvailable && availableCount++;
                    }
                }
            }

            let $availableCount = this.$composeModal.find('#availableCount');
            $availableCount.text('有 ' + availableCount + ' 筆符合的發送對象').removeClass('d-none');
            return availableCount;
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
                if (CONDITION_TYPES.TAGS === conditionType) {
                    let $tags = $conditionItem.find('.tags-container .chip-text');
                    $tags.each(function() {
                        let tag = $(this).text();
                        contentValues.push(tag);
                    });
                } else {
                    let $contentValues = $conditionItem.find('.condition-content .condition-value');
                    $contentValues.each(function() {
                        let value = $(this).val() || $(this).attr('value') || '';
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

        /**
         * @param {MouseEvent} ev
         */
        _conditionTypeChanged(ev) {
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
            let conditionType = DEFAULT_CONDITIONS[type] || this._conditionTypes[type];
            let options = {
                type: type,
                field: this._allFields[conditionType.field_id]
            };
            let $conditionContent = $(this.generateConditionContent(options));
            $conditionContentWrapper.append($conditionContent);
            this.refreshAvailable();

            if (CONDITION_TYPES.TAGS === typeValue) {
                this.enableTypeahead($conditionContentWrapper);
            }
        }

        /**
         * @param {MouseEvent} ev
         */
        _conditionContentChanged(ev) {
            let $target = $(ev.target).hasClass('dropdown-item') ? $(ev.target) : $(ev.target).parents('.dropdown-item');
            let contentValue = $target.attr('value');
            let contentText = $target.text();
            let appId = $target.attr('app-id');

            let $conditionContent = $target.parents('.condition-content');
            $conditionContent.find('.condition-value').attr('value', contentValue).attr('app-id', appId || '').text(contentText);
            this.refreshAvailable();
        }

        _generateTextCondition(defaultText, defaultWay) {
            return (
                '<div class="d-inline-block condition-content range">' +
                    '<input class="form-control condition-value" type="text" maxlength="50" placeholder="輸入條件文字" value="' + (defaultText || '') + '" />' +
                '</div>' +
                '<span class="px-2">-</span>' +
                '<div class="d-inline-block condition-content range">' +
                    '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                        '<span class="condition-value" value="' + (defaultWay || TEXT_MATCH_WAYS.INCLUDES) + '">' + MATCH_WAYS_DISPLAY_TEXT[defaultWay || TEXT_MATCH_WAYS.INCLUDES] + '</span>' +
                    '</button>' +
                    '<div class="dropdown-menu condition-content-menu">' +
                        (function() {
                            return Object.keys(TEXT_MATCH_WAYS).map(function(way) {
                                return (
                                    '<a class="dropdown-item" value="' + way + '">' +
                                        '<span>' + MATCH_WAYS_DISPLAY_TEXT[way] + '</span>' +
                                    '</a>'
                                );
                            }).join('');
                        })() +
                    '</div>' +
                '</div>'
            );
        }

        /**
         * @param {Chatshier.Models.Field} field
         * @param {string} seletedValue
         */
        _generateSelectCondition(field, seletedValue) {
            return (
                '<div class="dropdown condition-content">' +
                    '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                        '<span class="condition-value" value="' + (seletedValue || field.sets[0] || '') + '">' + (seletedValue || field.sets[0] || '') + '</span>' +
                    '</button>' +
                    '<div class="dropdown-menu condition-content-menu">' +
                        (() => {
                            return field.sets.map((set) => {
                                if (!set) {
                                    return '';
                                }
                                return (
                                    '<a class="dropdown-item" value="' + set + '">' +
                                        '<span>' + (set) + '</span>' +
                                    '</a>'
                                );
                            }).join('');
                        })() +
                    '</div>' +
                '</div>'
            );
        }

        _generateNumberCondition(lowerNum, upperNum) {
            return (
                '<div class="d-inline-block condition-content range">' +
                    '<input class="form-control condition-value" type="number" value="' + (lowerNum || '0') + '" min="0" />' +
                '</div>' +
                '<span class="px-2">~</span>' +
                '<div class="d-inline-block condition-content range">' +
                    '<input class="form-control condition-value" type="number" value="' + (upperNum || '1') + '" min="1" />' +
                '</div>'
            );
        }

        _generateCheckboxCondition(seletedValue) {
            return (
                '<div class="dropdown condition-content">' +
                    '<button class="btn btn-light btn-block btn-border dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                        '<span class="condition-value" value="' + (seletedValue || 'true') + '">' + ('true' === seletedValue ? '是' : '否') + '</span>' +
                    '</button>' +
                    '<div class="dropdown-menu condition-content-menu">' +
                        '<a class="dropdown-item" value="true">是</a>' +
                        '<a class="dropdown-item" value="false">否</a>' +
                    '</div>' +
                '</div>'
            );
        }
    }

    ConditionSelector.CONDITION_TYPES = CONDITION_TYPES;
    ConditionSelector.MATCH_WAYS_DISPLAY_TEXT = MATCH_WAYS_DISPLAY_TEXT;
    return ConditionSelector;
})();

(function() {
    const CONDITION_TYPES_DISPLAY_TEXT = Object.freeze({
        AGE_RANGE: '年齡範圍',
        GENDER: '性別',
        EMAIL: '電子郵件',
        PHONE: '電話',
        ADDRESS: '地址',
        TAGS: '標籤',
        CUSTOM_FIELD: 'CUSTOM_FIELD'
    });

    const SOCKET_NAMESPACE = '/chatshier';
    const SOCKET_SERVER_URL = window.urlConfig.apiUrl.replace('..', window.location.origin) + SOCKET_NAMESPACE;
    const SOCKET_EVENTS = window.SOCKET_EVENTS;
    const socket = io(SOCKET_SERVER_URL);

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    let api = window.restfulAPI;
    /** @type {Chatshier.Models.Apps} */
    let apps = {};
    /** @type {Chatshier.Models.AppsChatrooms} */
    let appsChatrooms = {};
    /** @type {Chatshier.Models.AppsFields} */
    let appsFields = {};
    /** @type {Chatshier.Models.AppsComposes} */
    let appsComposes = {};

    let nowSelectAppId = '';

    let $jqDoc = $(document);
    let $historyTableBody = $('#composesHistoryTable tbody');
    let $reservationTableBody = $('#composesReservationTable tbody');
    let $draftTableBody = $('#composesDraftTable tbody');
    let $appsDropdown = $('#appsDropdown');

    const CHATSHIER = 'CHATSHIER';
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
    $(document).on('click', '.remove.delete-btn', removeCompose);
    $(document).on('change paste keyup', '.search-bar', composesSearch);

    // 停用所有 form 的提交
    $(document).on('submit', 'form', function(ev) { return ev.preventDefault(); });
    $appsDropdown.on('click', '.dropdown-item', appSourceChanged);

    // 當有收到訊息發送的事件時更新 compose
    socket.on(SOCKET_EVENTS.EMIT_MESSAGE_TO_CLIENT, function(data) {
        /** @type {ChatshierChatSocketBody} */
        let socketBody = data;
        let appId = socketBody.app_id;
        appId === nowSelectAppId && refreshComposes(nowSelectAppId);
    });

    // #region modal 的處理全部寫在此閉包中
    (function() {
        const ReplyMessageSelector = window.ReplyMessageSelector;

        /** @type {string} */
        let modalComposeId;
        /** @type {Chatshier.Models.Compose} */
        let modalCompose;

        let conditionTypes = {};

        /** @type {Chatshier.Models.Fields} */
        let allFields = {};
        /** @type {string[]} */
        let allTags = [];
        let composeContents = [];

        let $composeModal = $('#composeModal');
        let $composesDtPicker = $composeModal.find('#sendDatetimePicker');
        let $composesDtInput = $composesDtPicker.find('input[name="sendDatetime"]');
        let $appsSelector = $composeModal.find('#appsSelector');
        let $appsSelectorMenu = $appsSelector.find('.dropdown-menu');
        let conditionSelector = new ConditionSelector($composeModal);

        $composeModal.on('show.bs.modal', initComposeModal);
        $composeModal.on('click', '#saveAsDraftBtn', (ev) => replaceCompose(ev, true));
        $composeModal.on('click', '#composeInsertBtn', replaceCompose);
        $composeModal.on('click', '#composeUpdateBtn', (ev) => replaceCompose(ev, $composeModal.find('[name="isDraft"]').prop('checked')));
        $composeModal.on('click', '#addComposeContent', addComposeContent);
        $appsSelector.on('change', '.dropdown-item .form-check-input', updateAvailable);

        if (!window.isMobileBrowser()) {
            $composesDtPicker.datetimepicker(datetimePickerInitOpts);
        } else {
            $composesDtInput.attr('type', 'datetime-local');
            $composesDtPicker.on('click', '.input-group-prepend', $composesDtInput.focus);
        }

        function prepareApps(appIds) {
            conditionTypes = {};
            allFields = {};
            allTags.length = 0;

            conditionSelector.apps = apps;
            conditionSelector.appsChatrooms = appsChatrooms;
            $appsSelectorMenu.empty();

            for (let i in appIds) {
                let appId = appIds[i];
                let app = apps[appId];
                $appsSelectorMenu.append(
                    '<div class="form-check dropdown-item">' +
                        '<label class="form-check-label">' +
                            '<input class="form-check-input mr-2" type="checkbox" app-id="' + appId + '"' + (appId === nowSelectAppId ? ' checked="true"' : '') + ' />' +
                            (ICONS[app.type] ? '<i class="' + ICONS[app.type] + '"></i>' : '') +
                            '<span>' + app.name + '</span>' +
                        '</label>' +
                    '</div>'
                );

                if (appsFields[appId]) {
                    let _fields = appsFields[appId].fields;

                    for (let fieldId in _fields) {
                        let field = _fields[fieldId];
                        if (api.appsFields.TYPES.CUSTOM !== field.type) {
                            continue;
                        }

                        allFields[fieldId] = field;
                        conditionTypes[fieldId] = {
                            type: ConditionSelector.CONDITION_TYPES.CUSTOM_FIELD,
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
        }

        function initComposeModal(ev) {
            let $relatedBtn = $(ev.relatedTarget);

            let $composeRow = $relatedBtn.parents('.compose-row');
            let appId = nowSelectAppId;
            if ($composeRow.length > 0) {
                appId = $composeRow.attr('app-id');
                modalComposeId = $composeRow.attr('compose-id');
                modalCompose = appsComposes[appId].composes[modalComposeId] || {};
            } else {
                modalComposeId = modalCompose = void 0;
            }

            let isInsert = $relatedBtn.hasClass('insert');
            if (isInsert) {
                prepareApps(Object.keys(apps));
            } else {
                prepareApps([appId]);
            }

            conditionSelector.conditionTypes = conditionTypes;
            conditionSelector.allFields = allFields;
            conditionSelector.allTags = allTags;
            conditionSelector.$conditionContainer.empty();

            while (composeContents.length > 1) {
                let composeContent = composeContents.pop();
                composeContent.destroy();
                composeContent = void 0;
            }
            0 === composeContents.length && addComposeContent();

            let composesDtPickerData = $composesDtPicker.data('DateTimePicker');
            let $saveAsDraftBtn = $composeModal.find('#saveAsDraftBtn');
            let $composeInsertBtn = $composeModal.find('#composeInsertBtn');
            let $composeUpdateBtn = $composeModal.find('#composeUpdateBtn');
            let $rowOfSaveAsDraft = $composeModal.find('#rowOfSaveAsDraft');
            $composeModal.find('.error-message').addClass('d-none');

            if ($relatedBtn.hasClass('insert')) {
                $appsSelector.parents('.form-group').removeClass('d-none');
                $saveAsDraftBtn.removeClass('d-none');
                $composeInsertBtn.removeClass('d-none');
                $composeUpdateBtn.addClass('d-none');
                $rowOfSaveAsDraft.addClass('d-none');
                $composeModal.find('.option-message').removeClass('d-none');

                $composeModal.find('#availableCount').empty().addClass('d-none');

                // 顯示新增視窗時，快速設定傳送時間預設為 5 分鐘後
                let reserveDateTime = Date.now() + (5 * 60 * 1000);
                if (modalCompose) {
                    let conditions = modalCompose.conditions || [];
                    for (let i in conditions) {
                        let condition = conditions[i];
                        conditionSelector.addConditionItem(void 0, condition.type, condition.values, condition.field_id);
                    }

                    reserveDateTime = new Date(modalCompose.time).getTime();
                    let isReservation = reserveDateTime > Date.now();
                    $composeModal.find(isReservation ? '#reservationCbx' : '#sendNowCbx').prop('checked', true);
                } else {
                    $composeModal.find('#sendNowCbx').prop('checked', true);
                }

                if (composesDtPickerData) {
                    composesDtPickerData.date(new Date(reserveDateTime));
                } else {
                    $composesDtInput.val(toDatetimeLocal(new Date(reserveDateTime)));
                }

                for (let i in composeContents) {
                    composeContents[i].appId = appId;
                    composeContents[i].reset(modalCompose && modalCompose.type);
                }
                updateAvailable();
                return;
            }

            $appsSelector.parents('.form-group').addClass('d-none');
            $saveAsDraftBtn.addClass('d-none');
            $composeInsertBtn.addClass('d-none');
            $composeUpdateBtn.removeClass('d-none');
            $rowOfSaveAsDraft.removeClass('d-none');
            $composeModal.find('.option-message').addClass('d-none');

            let conditions = modalCompose.conditions || [];
            for (let i in conditions) {
                let condition = conditions[i];
                conditionSelector.addConditionItem(void 0, condition.type, condition.values, condition.field_id);
            }

            $composeModal.find('#reservationCbx').prop('checked', true);
            let reserveDateTime = new Date(modalCompose.time).getTime();
            if (composesDtPickerData) {
                composesDtPickerData.date(new Date(reserveDateTime));
            } else {
                $composesDtInput.val(toDatetimeLocal(new Date(reserveDateTime)));
            }

            $composeModal.find('[name="isDraft"]').prop('checked', !modalCompose.status);
            for (let i in composeContents) {
                composeContents[i].appId = appId;
                composeContents[i].reset(modalCompose.type);
                composeContents[i].toggleImageMap('FACEBOOK' !== apps[appId].type);
                composeContents[i].toggleTemplate('FACEBOOK' !== apps[appId].type);
            }
            updateAvailable();
        }

        function updateAvailable() {
            let $checkedInputs = $appsSelectorMenu.find('input:checked');
            $appsSelectorMenu.parent().find('.dropdown-value').text('已選擇的機器人 (' + $checkedInputs.length + ')');

            let appIds = [];
            let isIncludeFacebook = false;
            $checkedInputs.each((i, elem) => {
                let appId = elem.getAttribute('app-id');
                appIds.push(appId);

                if ('FACEBOOK' === apps[appId].type) {
                    isIncludeFacebook = true;
                }
            });

            for (let i in composeContents) {
                let content = composeContents[i];
                // 目前 Facebook 無法實作圖文訊息及模板訊息的發送
                // 會顯示警告訊息告知 Facebook 無法收到圖文訊息及模板訊息的發送
                content.isFacebookAlertShow = isIncludeFacebook;
                // 由於每個機器人都各自設定的圖文訊息及模板訊息
                // 因此當要發送給多個機器人時，目前暫無法選擇各自的圖文訊息去發送
                // TODO: 每個機器人可選擇各自的圖文訊息或模板訊息去發送
                content.toggleImageMap(!isIncludeFacebook && 1 === appIds.length);
                content.toggleTemplate(!isIncludeFacebook && 1 === appIds.length);
                content.appId = appIds[appIds.length - 1];
            }

            conditionSelector.appIds = appIds;
            conditionSelector.refreshAvailable();
        }

        function replaceCompose(ev, isSaveAsDraft) {
            let isDraft = !!isSaveAsDraft;
            let isSendNow = $('#sendNowCbx').prop('checked');
            let isReserveSend = $('#reservationCbx').prop('checked');
            let conditions = conditionSelector.retrieveConditions();

            let appIds = [];
            let $checkedInputs = $appsSelectorMenu.find('input:checked');
            $checkedInputs.each((i) => appIds.push($($checkedInputs[i]).attr('app-id')));

            if (0 === appIds.length) {
                $.notify('至少需選擇一個目標機器人', { type: 'warning' });
                return Promise.resolve();
            }

            let composesDtPickerData = $composesDtPicker.data('DateTimePicker');
            let reserveTime = composesDtPickerData
                ? composesDtPickerData.date().toDate().getTime()
                : new Date($composesDtInput.val()).getTime();

            if (isReserveSend && reserveTime < Date.now()) {
                $.notify('預約的群發時間必須大於現在時間', { type: 'warning' });
                return Promise.resolve();
            }

            if (isSendNow && 0 === conditionSelector.refreshAvailable()) {
                $.notify('沒有可群發的對象', { type: 'warning' });
                return Promise.resolve();
            }

            let $saveAsDraftBtn = $composeModal.find('#saveAsDraftBtn');
            let $composeInsertBtn = $composeModal.find('#composeInsertBtn');
            let $composeUpdateBtn = $composeModal.find('#composeUpdateBtn');
            $saveAsDraftBtn.attr('disabled', true);
            $composeInsertBtn.attr('disabled', true);
            $composeUpdateBtn.attr('disabled', true);

            let imageFilePaths = [];
            return Promise.all(composeContents.map((composeContent) => {
                return composeContent.getJSON().then((message) => {
                    let isDataVaild = (
                        ('text' === message.type && message.text) ||
                        ('image' === message.type && message.src) ||
                        ('imagemap' === message.type && message.imagemap_id) ||
                        ('template' === message.type && message.template_id)
                    );

                    if (!isDataVaild) {
                        $.notify('群發內容不能為空', { type: 'warning' });
                        return Promise.reject(new Error('INVAILD_DATA'));
                    }

                    imageFilePaths.push(message.originalFilePath);
                    let compose = {
                        status: !isDraft,
                        time: isSendNow ? Date.now() - 60000 : reserveTime,
                        isImmediately: isSendNow && !isDraft,
                        conditions: conditions
                    };

                    let _compose = Object.assign(compose, message);
                    delete _compose.originalFilePath;
                    return _compose;
                });
            })).then((composes) => {
                if (isSendNow && !isDraft && !window.confirm('將會發送給所有用戶，你確定嗎？')) {
                    return Promise.reject(new Error('USER_CANCEL'));
                }

                let nextRequest = function(i) {
                    if (i >= appIds.length) {
                        return Promise.resolve();
                    }

                    let appId = appIds[i];
                    return Promise.all(composes.map((compose, i) => {
                        let _modalComposeId = modalComposeId;
                        return Promise.resolve().then(() => {
                            if (_modalComposeId) {
                                return api.appsComposes.update(appId, _modalComposeId, userId, compose);
                            }
                            return api.appsComposes.insert(appId, userId, compose).then((resJson) => {
                                let _appsComposes = resJson.data;
                                _modalComposeId = Object.keys(_appsComposes[appId].composes).shift() || '';
                                return resJson;
                            });
                        }).then((resJson) => {
                            let _appsComposes = resJson.data;
                            !appsComposes[appId] && (appsComposes[appId] = { composes: {} });
                            Object.assign(appsComposes[appId].composes, _appsComposes[appId].composes);

                            if (imageFilePaths[i] && _modalComposeId) {
                                let fileName = imageFilePaths[i].split('/').pop();
                                let toPath = '/apps/' + appId + '/composes/' + _modalComposeId + '/src/' + fileName;
                                return api.image.moveFile(userId, imageFilePaths[i], toPath).then(() => resJson);
                            }
                            return resJson;
                        });
                    })).then(() => {
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
                    $saveAsDraftBtn.removeAttr('disabled');
                    $composeInsertBtn.removeAttr('disabled');
                    $composeUpdateBtn.removeAttr('disabled');

                    $composeModal.modal('hide');
                    $.notify('處理成功', { type: 'success' });
                    return refreshComposes(nowSelectAppId);
                });
            }).catch((err) => {
                $saveAsDraftBtn.removeAttr('disabled');
                $composeInsertBtn.removeAttr('disabled');
                $composeUpdateBtn.removeAttr('disabled');

                if ((err && 'INVAILD_DATA' === err.message) ||
                    (err && 'USER_CANCEL' === err.message)) {
                    return;
                }

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

        function addComposeContent() {
            if (composeContents.length >= 3) {
                $('.error-message').removeClass('d-none');
                return;
            }

            let insertAfterElem;
            if (0 === composeContents.length) {
                insertAfterElem = $composeModal.find('#rowOfComposeContent').get(0);
            } else {
                insertAfterElem = composeContents[composeContents.length - 1].containerElement;
            }

            let options = {
                isLabelHide: true,
                isRemoveButtonShow: composeContents.length > 0,
                userId: userId,
                onReplyItemChange: (replyType, _selector) => {
                    if (!modalCompose) {
                        return;
                    }

                    'text' === replyType && modalCompose.text && _selector.setMessageText(modalCompose.text);
                    'image' === replyType && modalCompose.src && _selector.setImageSrc(modalCompose.src);
                    'imagemap' === replyType && modalCompose.imagemap_id && _selector.setImageMap(modalCompose.imagemap_id);
                    'template' === replyType && modalCompose.template_id && _selector.setTemplate(modalCompose.template_id);
                }
            };

            if (composeContents.length >= 1) {
                let lastContent = composeContents[composeContents.length - 1];
                options.appId = lastContent.appId;
                options.appsImagemaps = lastContent.appsImagemaps;
                options.appsTemplates = lastContent.appsTemplates;
            }

            let replyMessageSelect = new ReplyMessageSelector(insertAfterElem, options);
            composeContents.push(replyMessageSelect);
        }
    })();
    // #endregion

    return Promise.all([
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
        let $dropdownMenu = $appsDropdown.find('.dropdown-menu');
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
            $appsDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            refreshComposes(nowSelectAppId);
        }
        $jqDoc.find('.btn.insert').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕

        return new Promise(function(resolve) {
            socket.emit(SOCKET_EVENTS.USER_REGISTRATION, userId, resolve);
        });
    });

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
                    (function() {
                        if ('text' === compose.type) {
                            return '<td class="text-pre search-source">' + compose.text + '</td>';
                        } else if ('image' === compose.type) {
                            return (
                                '<td class="text-pre">' +
                                    '<label class="search-source">圖像</label>' +
                                    '<div class="position-relative image-container" style="width: 6rem; height: 6rem;">' +
                                        '<img class="image-fit" src="' + compose.src + '" alt="" />' +
                                    '</div>' +
                                '</td>'
                            );
                        } else if ('imagemap' === compose.type) {
                            return '<td class="text-pre search-source">圖文訊息</td>';
                        } else if ('template' === compose.type) {
                            return '<td class="text-pre search-source">模板訊息</td>';
                        }
                        return '<td class="text-pre"></td>';
                    })() +
                    '<td class="search-source" id="time">' + toLocalTimeString(compose.time) + '</td>' +
                    '<td>' +
                        (function generateConditionsCol(conditions) {
                            if (0 === conditions.length) {
                                return '<span class="search-source">無</span>';
                            }

                            return conditions.map((condition) => {
                                let conditionText = CONDITION_TYPES_DISPLAY_TEXT[condition.type] || '無';
                                let conditionContent = condition.values.join(', ');

                                if (condition.field_id) {
                                    let field = appsFields[appId].fields[condition.field_id];
                                    if (!field) {
                                        return '';
                                    }
                                    conditionText = field.text || '無此自定義條件';

                                    if (api.appsFields.SETS_TYPES.TEXT === field.setsType) {
                                        conditionContent = condition.values.map((value) => {
                                            return ConditionSelector.MATCH_WAYS_DISPLAY_TEXT[value] || value;
                                        }).join(', ');
                                    } else if (api.appsFields.SETS_TYPES.CHECKBOX === field.setsType) {
                                        conditionContent = condition.values.map((value) => {
                                            return 'true' === value ? '是' : '否';
                                        }).join(', ');
                                    }
                                }

                                switch (condition.type) {
                                    case ConditionSelector.CONDITION_TYPES.GENDER:
                                        conditionContent = condition.values.map((value) => {
                                            return 'MALE' === value ? '男' : ('FEMALE' === value ? '女' : '未選擇');
                                        }).join(', ');
                                        break;
                                    case ConditionSelector.CONDITION_TYPES.ADDRESS:
                                    case ConditionSelector.CONDITION_TYPES.PHONE:
                                    case ConditionSelector.CONDITION_TYPES.EMAIL:
                                        conditionContent = condition.values.map((value) => {
                                            return ConditionSelector.MATCH_WAYS_DISPLAY_TEXT[value] || value;
                                        }).join(', ');
                                        break;
                                    default:
                                        break;
                                }
                                return (
                                    '<div class="condition-col search-source">' +
                                        conditionText + ': ' + conditionContent +
                                    '<div>'
                                );
                            }).join('');
                        })(compose.conditions || []) +
                    '</td>' +
                    '<td>' +
                        '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas' + (isReservation || isDraft ? ' fa-edit update' : ' fa-share-square insert') + '" data-toggle="modal" data-target="#composeModal" aria-hidden="true"></button>' +
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

    function appSourceChanged() {
        nowSelectAppId = $(this).attr('app-id');
        $appsDropdown.find('.dropdown-text').text($(this).text());
        refreshComposes(nowSelectAppId);
    }

    function composesSearch(ev) {
        if (!ev.target.value) {
            $('.compose-row').removeClass(['d-none', 'matched']);
            return;
        }

        let code = ev.keyCode || ev.which;
        // 按下 enter 鍵才進行搜尋
        if (13 !== code) {
            return;
        }

        let searchText = ev.target.value.toLocaleLowerCase();
        let $searchSrcs = $('.search-source');
        $searchSrcs.each((i, elem) => {
            let isMatch = elem.textContent.toLocaleLowerCase().includes(searchText);
            let $targetRow = $(elem).parents('tr');

            if (isMatch) {
                $targetRow.removeClass('d-none').addClass('matched');
            } else if (!$targetRow.hasClass('matched')) {
                $targetRow.addClass('d-none');
            }
        });
    }

    /**
     * @param {string} textContent
     * @returns {Promise<boolean>}
     */
    function showDialog(textContent) {
        return new Promise(function(resolve) {
            $('#textContent').text(textContent);

            let isOK = false;
            let $dialogModal = $('#dialog_modal');

            $dialogModal.off('click', '.btn-primary').on('click', '.btn-primary', function() {
                isOK = true;
                $dialogModal.modal('hide');
            });

            $dialogModal.off('hidden.bs.modal').on('hidden.bs.modal', function() {
                resolve(isOK);
            });

            $dialogModal.modal({ backdrop: false, show: true });
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
