/// <reference path='../../../typings/client/index.d.ts' />

/**
 * 使用 swiper 建立橫向滑動功能
 * @link http://idangero.us/swiper/api/
 */
window.TemplateBuilder = (function() {
    const KILO_BYTE = 1024;
    const MEGA_BYTE = KILO_BYTE * 1024;
    const MAX_TEMPLATE_CARD = 10;
    const MAX_BUTTON_ACTION = 3;

    const validUrlPattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator

    const BUTTON_ACTIONS = Object.freeze({
        URL: 'URL',
        TEL: 'TEL',
        TEXT: 'TEXT',
        IMAGEMAP: 'IMAGEMAP',
        TEMPLATE: 'TEMPLATE',
        CONSUMER_FORM: 'CONSUMER_FORM',
        DONATION: 'DONATION',
        APPOINTMENT: 'APPOINTMENT',
        APPOINTMENT_LIST: 'APPOINTMENT_LIST'
    });

    const BUTTON_ACTIONS_DISPLAY_TEXT = Object.freeze({
        [BUTTON_ACTIONS.URL]: '前往連結',
        [BUTTON_ACTIONS.TEL]: '撥打電話',
        [BUTTON_ACTIONS.TEXT]: '發送文字',
        [BUTTON_ACTIONS.IMAGEMAP]: '發送指定圖文訊息',
        [BUTTON_ACTIONS.TEMPLATE]: '發送指定範本訊息',
        [BUTTON_ACTIONS.CONSUMER_FORM]: '填寫個人資料',
        [BUTTON_ACTIONS.DONATION]: '候選人捐款功能',
        [BUTTON_ACTIONS.APPOINTMENT]: '預約目錄',
        [BUTTON_ACTIONS.APPOINTMENT_LIST]: '顯示用戶個人已預約項目'
    });

    const ERRORS = Object.freeze({
        TEMPLATES_EMPTY: 'TEMPLATES_EMPTY',
        TITLE_AND_TEXT_IS_REQUIRED: 'TITLE_AND_TEXT_IS_REQUIRED',
        TEXT_IS_REQUIRED: 'TEXT_IS_REQUIRED',
        IMAGE_IS_REQUIRED: 'IMAGE_IS_REQUIRED',
        AT_LEAST_ONE_ACTION: 'AT_LEAST_ONE_ACTION',
        MUST_UPLOAD_A_IMAGE: 'MUST_UPLOAD_A_IMAGE',
        INVALID_URL: 'INVALID_URL',
        NOT_A_IMAGE: 'NOT_A_IMAGE',
        IMAGE_SIZE_TOO_LARGE: 'IMAGE_SIZE_TOO_LARGE',
        ACTIONS_COUNT_SHOULD_SAME: 'ACTIONS_COUNT_SHOULD_SAME',
        HAS_UNCHECKED_ACTION: 'HAS_UNCHECKED_ACTION'
    });

    const Swiper = window.Swiper;

    class ActionEditor {
        /**
         * @param {HTMLElement} parentElem
         * @param {any} params
         * @param {Chatshier.Models.TemplateAction} [action]
         */
        constructor(parentElem, params, action) {
            this.$parentElem = $(parentElem);
            params = params || {};

            /** @type {Chatshier.Models.Keywordreplies} */
            this._keywordreplies = params.keywordreplies || {};
            /** @type {string} */
            this._keywords = Object.keys(this._keywordreplies).map((keywordreplyId) => this._keywordreplies[keywordreplyId].keyword);

            /** @type {Chatshier.Models.Imagemaps} */
            this._imagemaps = params.imagemaps || {};

            /** @type {Chatshier.Models.Templates} */
            this._templates = params.templates || {};

            this.ButtonActions = params.enabledActions || BUTTON_ACTIONS;

            let hasAction = !!action;
            action = action || {};
            let actionData = ((actionDataStr) => {
                if ('string' !== typeof actionDataStr) {
                    return {};
                }

                try {
                    return JSON.parse(actionDataStr);
                } catch (ex) {
                    return {};
                }
            })(action.data);

            let buttonAction = '';
            if ('uri' === action.type && action.uri.startsWith('http')) {
                buttonAction = BUTTON_ACTIONS.URL;
            } else if ('uri' === action.type && action.uri.startsWith('tel')) {
                buttonAction = BUTTON_ACTIONS.TEL;
            } else if ('postback' === action.type && actionData.imagemapId) {
                buttonAction = BUTTON_ACTIONS.IMAGEMAP;
            } else if ('postback' === action.type && actionData.templateId) {
                buttonAction = BUTTON_ACTIONS.TEMPLATE;
            } else if ('message' === action.type) {
                buttonAction = BUTTON_ACTIONS.TEXT;
            } else if ('SEND_CONSUMER_FORM' === actionData.action) {
                buttonAction = BUTTON_ACTIONS.CONSUMER_FORM;
            } else if ('PAYMENT_CONFIRM' === actionData.action) {
                buttonAction = BUTTON_ACTIONS.DONATION;
            } else if ('SEND_APPOINTMENT_CATEGORIES' === actionData.action) {
                buttonAction = BUTTON_ACTIONS.APPOINTMENT;
            }

            this.$elem = $(
                '<form class="mb-2 p-2 card card-body animated fadeIn action-editor">' +
                    '<div class="mb-2 text-right finish-edit-container">' +
                        '<button type="button" class="btn btn-info btn-sm edit-btn d-none">' +
                            '<i class="fas fa-edit"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-success btn-sm confirm-btn">' +
                            '<i class="fas fa-check"></i>' +
                        '</button>' +
                        '<button type="button" class="ml-2 btn btn-danger btn-sm cancel-btn">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' +
                    '</div>' +

                    '<div class="text-center label-finish d-none" data-originLabel="' + (action.label || '') + '">' +
                        '<span class="text-primary label-text">' + (action.label || '') + ' (' + (BUTTON_ACTIONS_DISPLAY_TEXT[buttonAction] || '未選擇') + ')</span>' +
                    '</div>' +
                    '<div class="mb-2 input-container editable animated fadeIn">' +
                        '<input class="w-100 form-control swiper-no-swiping button-label" type="text" name="buttonLabel" placeholder="按鈕名稱" maxlength="20" value="' + (action.label || '') + '" />' +
                    '</div>' +
                    '<div class="mb-1 input-group select-container editable animated fadeIn">' +
                        '<div class="input-group-prepend">' +
                            '<span class="input-group-text">觸發動作</span>' +
                        '</div>' +
                        '<select class="form-control button-action" name="buttonAction" value="' + buttonAction + '">' +
                            '<option value="" disabled>未選擇</option>' +
                            Object.keys(this.ButtonActions).map((actionType) => {
                                return '<option value="' + actionType + '">' + BUTTON_ACTIONS_DISPLAY_TEXT[actionType] + '</option>';
                            }).join('') +
                        '</select>' +
                    '</div>' +
                    '<div class="mb-2 action-content editable animated fadeIn"></div>' +
                '</form>'
            );
            this.onDestroy = void 0;
            this.$parentElem.append(this.$elem);

            this.$elem.on('click', '.confirm-btn', this._finishEdit.bind(this));
            this.$elem.on('click', '.edit-btn, .label-finish', this._startEdit.bind(this));
            this.$elem.on('click', '.cancel-btn', this.destroy.bind(this));

            this.$buttonActionSelect = this.$elem.find('select.button-action');
            this.$buttonActionSelect.on('change', this._buttonActionChanged.bind(this));
            this.buttonAction = buttonAction;
            this._buttonActionChanged({ target: this.$buttonActionSelect.get(0) }, action);

            hasAction && this._finishEdit();
        }

        set buttonAction(buttonAction) {
            this.$buttonActionSelect.val(buttonAction || '');
        }

        get buttonAction() {
            return this.$buttonActionSelect.val();
        }

        set keywordreplies(_keywordreplies) {
            this._keywordreplies = _keywordreplies || {};
            this._keywords = Object.keys(this._keywordreplies).map((keywordreplyId) => this._keywordreplies[keywordreplyId].keyword);
        }

        set imagemaps(_imagemaps) {
            this._imagemaps = _imagemaps || {};
        }

        set templates(_templates) {
            this._templates = _templates || {};
        }

        destroy() {
            this.$elem.remove();
            delete this.$elem;
            delete this.$parentElem;

            delete this._keywordreplies;
            delete this._imagemaps;
            delete this._templates;

            ('function' === typeof this.onDestroy) && this.onDestroy(this);
        }

        /**
         * @param {Event} ev
         * @param {Chatshier.Models.TemplateAction} [action]
         */
        _buttonActionChanged(ev, action) {
            let buttonAction = ev.target.value;
            let $actionContent = this.$elem.find('.action-content');

            $actionContent.empty();
            if (!this.ButtonActions[buttonAction]) {
                return;
            }

            action = action || {};
            let actionData = action.data ? JSON.parse(action.data) : {};
            let inputDefaultValue;
            let selectDefaultValue;

            let $actionElem;

            switch (buttonAction) {
                case BUTTON_ACTIONS.URL:
                    inputDefaultValue = action.uri || '';
                    $actionElem = $(
                        '<div class="mt-2 input-group">' +
                            '<div class="input-group-prepend">' +
                                '<span class="input-group-text"><i class="fas fa-link"></i></span>' +
                            '</div>' +
                            '<input class="form-control swiper-no-swiping action-url-link" type="url" value="' + inputDefaultValue + '" data-prevValue="' + inputDefaultValue + '" placeholder="輸入按鈕連結" maxlength="1000" />' +
                        '</div>'
                    );
                    break;
                case BUTTON_ACTIONS.TEL:
                    inputDefaultValue = (action.uri || '').replace('tel:', '');
                    $actionElem = $(
                        '<div class="mt-2 input-group">' +
                            '<div class="input-group-prepend">' +
                                '<span class="input-group-text"><i class="fas fa-phone"></i></span>' +
                            '</div>' +
                            '<input class="form-control swiper-no-swiping action-tel-number" type="tel" value="' + inputDefaultValue + '" data-prevValue="' + inputDefaultValue + '" placeholder="輸入電話號碼" maxlength="10" />' +
                        '</div>'
                    );
                    break;
                case BUTTON_ACTIONS.TEXT:
                    $actionElem = $(this._generateTextInputHtml(action.text, 'action-single-text'));
                    break;
                case BUTTON_ACTIONS.IMAGEMAP:
                    selectDefaultValue = actionData.imagemapId || '';
                    $actionElem = $(
                        this._generateTextInputHtml(actionData.additionalText, 'action-imagemap-text', '輸入附加訊息文字 (選填)') +
                        '<div class="mt-2 input-group">' +
                            '<div class="input-group-prepend">' +
                                '<span class="input-group-text"><i class="fas fa-map"></i></span>' +
                            '</div>' +
                            '<select class="form-control action-imagemap-select" value="' + selectDefaultValue + '" data-prevValue="' + selectDefaultValue + '">' +
                                '<option value="" disabled>未選擇</option>' +
                                Object.keys(this._imagemaps).map((imagemapId) => {
                                    let imagemap = this._imagemaps[imagemapId];
                                    return '<option value="' + imagemapId + '">' + imagemap.altText + '</option>';
                                }).join('') +
                            '</select>' +
                        '</div>'
                    );
                    break;
                case BUTTON_ACTIONS.TEMPLATE:
                    selectDefaultValue = actionData.templateId || '';
                    $actionElem = $(
                        this._generateTextInputHtml(actionData.additionalText, 'action-template-text', '輸入附加訊息文字 (選填)') +
                        '<div class="mt-2 input-group">' +
                            '<div class="input-group-prepend">' +
                                '<span class="input-group-text"><i class="fas fa-clipboard-list"></i></span>' +
                            '</div>' +
                            '<select class="form-control action-template-select" value="' + selectDefaultValue + '" data-prevValue="' + selectDefaultValue + '">' +
                                '<option value="" disabled>未選擇</option>' +
                                Object.keys(this._templates).map((templateId) => {
                                    let template = this._templates[templateId];
                                    return '<option value="' + templateId + '">' + (template.name || template.altText) + '</option>';
                                }).join('') +
                            '</select>' +
                        '</div>'
                    );
                    break;
                case BUTTON_ACTIONS.APPOINTMENT:
                    break;
                default:
                    break;
            }

            if (!$actionElem) {
                return;
            }
            $actionContent.append($actionElem);
            undefined !== selectDefaultValue && $actionElem.find('select').val(selectDefaultValue);
        }

        _generateTextInputHtml(defaultText, className, placeholder) {
            placeholder = placeholder || '輸入訊息文字';
            className = className || '';
            defaultText = defaultText || '';
            return (
                '<div class="mt-1 textarea-container">' +
                    '<textarea class="form-control swiper-no-swiping text-input' + (className ? ' ' + className : '') + '" rows=4 style="resize: none" placeholder="' + placeholder + '">' + defaultText + '</textarea>' +
                '</div>'
            );
        }

        _startEdit() {
            this.$elem.removeClass('finished');
            this.$elem.find('input, select').removeAttr('readonly').removeAttr('disabled');
            this.$elem.find('.editable').removeClass('d-none');
            this.$elem.find('.confirm-btn').removeClass('d-none');
            this.$elem.find('.edit-btn').addClass('d-none');
            this.$elem.find('.label-finish').addClass('d-none');
        }

        _finishEdit() {
            let buttonLabel = this.$elem.find('input[name="buttonLabel"]').val();
            if (!buttonLabel) {
                $.notify('按鈕文字不可設定為空', { type: 'warning' });
                return;
            }

            if (!this._checkButtonContent()) {
                return;
            }

            this.$elem.addClass('finished');
            this.$elem.find('input, select').attr('readonly', true).attr('disabled', true);
            this.$elem.find('.editable').addClass('d-none');
            this.$elem.find('.confirm-btn').addClass('d-none');
            this.$elem.find('.edit-btn').removeClass('d-none');

            let $labelFinish = this.$elem.find('.label-finish');
            $labelFinish.data('originLabel', buttonLabel);
            $labelFinish.removeClass('d-none').find('.label-text').text(buttonLabel + ' (' + (BUTTON_ACTIONS_DISPLAY_TEXT[this.buttonAction] || '未選擇') + ')');
        }

        _checkButtonContent() {
            let $actionContent = this.$elem.find('.action-content');
            let buttonAction = this.buttonAction;
            if (buttonAction === BUTTON_ACTIONS.URL) {
                let $actionUrlLink = $actionContent.find('.action-url-link');
                let urlLink = $actionUrlLink.val();
                if (!urlLink) {
                    $.notify('連結不可設定為空', { type: 'warning' });
                    return false;
                }
                $actionUrlLink.data('prevValue', urlLink);
            } else if (buttonAction === BUTTON_ACTIONS.TEL) {
                let $actionTelNumber = $actionContent.find('.action-tel-number');
                let telNumber = $actionTelNumber.val();
                if (!(telNumber && /^0\d{9,}$/.test(telNumber))) {
                    $.notify('電話號碼格式錯誤', { type: 'warning' });
                    return false;
                }
                $actionTelNumber.data('prevValue', telNumber);
            }
            return true;
        }
    }

    class TemplateBuilder {
        /**
         * @param {HTMLElement} parentElem
         */
        constructor(parentElem) {
            this.enabledActions = Object.assign({}, BUTTON_ACTIONS);

            this._id = 'templateBuilder_' + Date.now();
            this.$parentElem = $(parentElem);
            this.$elem = $(
                '<div class="template-builder swiper-container" id="' + this._id + '">' +
                    '<div class="pb-5 swiper-wrapper"></div>' +
                    '<div class="swiper-pagination"></div>' +
                '</div>'
            );
            this.$parentElem.empty().append(this.$elem);

            this.$elem.on('click', '.add-action-btn', this._addActionEditor.bind(this));
            this.$elem.on('click', '.insert-template-card', () => this.insertTemplateCard());
            this.$elem.on('click', '.remove-template-card', this.removeTemplateCard.bind(this));
            this.$elem.on('click', '.template-image-input', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                $(ev.target).parents('.swiper-slide').find('.image-input[type="file"]').trigger('click');
            });
            this.$elem.on('blur', 'input[type="url"]', (ev) => {
                let url = ev.target.value;
                if (!url || (url && url.startsWith('http'))) {
                    return;
                }
                ev.target.value = 'http://' + url;
            });

            this.$elem.on('change', '.image-input[type="file"]', (ev) => {
                /** @type {HTMLInputElement} */
                let fileInput = ev.target;
                let imageFile = fileInput.files.item(0);

                return this._imageFileToBase64(imageFile).then((base64Url) => {
                    let $imageContainer = $(fileInput).parent().find('.image-container');
                    $imageContainer.find('.image-upload-btn').remove();
                    $imageContainer.find('img').attr('src', base64Url);
                });
            });

            this.templateSwiper = new Swiper(this.$elem.get(0), {
                loop: false,
                // allowTouchMove: false,
                slidesPerView: 'auto',
                spaceBetween: 8,
                threshold: 32,
                pagination: {
                    el: '#' + this._id + ' .swiper-pagination',
                    type: 'bullets',
                    clickable: true,
                    renderBullet: (i, className) => {
                        return '<span class="p-2 ' + className + '"></span>';
                    }
                }
            });
        }

        /**
         * @param {Chatshier.Models.Keywordreplies} _keywordreplies
         */
        set keywordreplies(_keywordreplies) {
            this._keywordreplies = _keywordreplies || {};
        }

        /**
         * @param {Chatshier.Models.Imagemaps} _imagemaps
         */
        set imagemaps(_imagemaps) {
            this._imagemaps = _imagemaps || {};
        }

        /**
         * @param {Chatshier.Models.Templates} _templates
         */
        set templates(_templates) {
            this._templates = _templates || {};
        }

        destroy() {
            this.templateSwiper.detachEvents();
            this.templateSwiper.removeAllSlides();
            this.templateSwiper.destroy(true, true);

            this.$elem.remove();
            this.$elem = this.templateSwiper = void 0;
        }

        /**
         * @param {Chatshier.Models.Template} [templateMessage]
         */
        initTemplate(templateMessage) {
            this.templateSwiper.removeAllSlides();

            templateMessage = templateMessage || {};
            let columns = (templateMessage.template && templateMessage.template.columns) || [];
            if (0 === columns.length) {
                this.insertTemplateCard(void 0, templateMessage.template);
            } else {
                for (let i = 0; i < columns.length; i++) {
                    this.insertTemplateCard(i, columns[i]);
                }
            }

            this.templateSwiper.slides.length < 10 && this.templateSwiper.appendSlide([
                '<div class="swiper-slide">' +
                    '<button type="button" class="ml-3 btn btn-light insert-template-card">' +
                        '<i class="fas fa-plus"></i>' +
                    '</button>' +
                '</div>'
            ]);
            this.templateSwiper.slideTo(0);
            this.templateSwiper.update();
        }

        /**
         * @param {number} [idx]
         * @param {Chatshier.Models.TemplateColumn} [column]
         */
        insertTemplateCard(idx, column) {
            if (!this.templateSwiper) {
                return;
            }
            idx = undefined === idx ? Math.max(0, this.templateSwiper.slides.length - 1) : idx;
            column = column || {};

            let canRemove = idx > 0;

            let templateCardId = 'templateCard' + Date.now();
            this.templateSwiper.addSlide(idx, [
                '<div class="swiper-slide p-2 card card-body template-card" id="' + templateCardId + '" data-index="' + idx + '">' +
                    '<div class="mb-2 d-flex align-items-center template-card-header">' +
                        '<div class="text-dark font-weight-bold">卡片 <span class="card-index">' + (idx + 1) + '</span></div>' +
                        (canRemove ? '<button type="button" class="ml-auto btn btn-danger btn-sm remove-template-card">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' : '') +
                    '</div>' +

                    '<input class="image-input d-none" type="file" accept="image/*" />' +
                    '<div class="position-relative mb-2 p-2 template-image-input">' +
                        '<div class="image-container">' +
                            (!column.thumbnailImageUrl
                                ? '<button type="button" class="image-upload-btn">' +
                                '<div><i class="fas fa-image"></i></div>' +
                                '<div>上傳圖片 <span class="small">(選填)</span></div>' +
                                '<div class="text-danger small">(圖片大小不能超過 ' + Math.floor(window.CHATSHIER.FILE.IMAGE_MAX_SIZE / MEGA_BYTE) + ' MB)</div>' +
                            '</button>' : '') +
                            '<img class="image-fit" src="' + ((column.thumbnailImageUrl) || '') + '" alt="" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="mb-2 input-group">' +
                        '<div class="input-group-prepend">' +
                            '<span class="input-group-text"><i class="fas fa-link"></i></span>' +
                        '</div>' +
                        '<input class="form-control swiper-no-swiping image-url-link" type="url" value="' + ((column.defaultAction && column.defaultAction.uri) || '') + '" placeholder="輸入圖片連結 (選填)" />' +
                    '</div>' +

                    '<div class="mb-2 input-container">' +
                        '<input class="w-100 form-control swiper-no-swiping template-title" placeholder="標題" maxlength="40" value="' + (column.title || '') + '" />' +
                    '</div>' +

                    '<div class="mb-2 input-container">' +
                        '<input class="w-100 form-control swiper-no-swiping template-text" placeholder="描述文字" maxlength="60" value="' + (column.text || '') + '" />' +
                    '</div>' +
                '</div>'
            ]);

            let $addActionBtn = $(
                '<button type="button" class="btn btn-light btn-block add-action-btn">' +
                    '<i class="mr-1 fas fa-plus fa-fw"></i>' +
                    '<span>新增按鈕</span>' +
                '</button>'
            );

            let actions = column.actions || [];
            let $actionsContainer = $('<div class="actions-container" id="actionsContainer" data-count="' + actions.length + '"></div>');
            let params = {
                keywordreplies: this._keywordreplies,
                imagemaps: this._imagemaps,
                templates: this._templates,
                enabledActions: this.enabledActions
            };

            actions.forEach((action) => {
                let actionEditor = new ActionEditor($actionsContainer.get(0), params, action);
                actionEditor.onDestroy = () => {
                    let actionCount = parseInt($actionsContainer.data('count'), 10);
                    $actionsContainer.data('count', --actionCount);
                    if (actionCount < MAX_BUTTON_ACTION) {
                        $addActionBtn.removeClass('d-none');
                    }
                };
                actionEditor.keywordreplies = this._keywordreplies;
                actionEditor.imagemaps = this._imagemaps;
                actionEditor.templates = this._templates;
            });
            $(this.templateSwiper.$el).find('#' + templateCardId).append($actionsContainer, $addActionBtn);
            if (actions.length >= MAX_BUTTON_ACTION) {
                $addActionBtn.addClass('d-none');
            }
            this.templateSwiper.slideTo(idx);

            let $insertTemplateCardBtn = this.$elem.find('.insert-template-card');
            if (this.templateSwiper.slides.length > MAX_TEMPLATE_CARD) {
                $insertTemplateCardBtn.addClass('d-none');
            }
        }

        removeTemplateCard(ev) {
            let $templateCard = $(ev.target).parents('.template-card');
            let idx = $templateCard.data('index');
            this.templateSwiper.removeSlide(idx);
            if (idx >= this.templateSwiper.slides.length - 1) {
                this.templateSwiper.slideTo(idx - 1);
            }

            this.$elem.find('.template-card').each((i, elem) => {
                let _$templateCard = $(elem);
                _$templateCard.data('index', i);
                _$templateCard.find('.card-index').text(i + 1);
            });

            let $insertTemplateCardBtn = this.$elem.find('.insert-template-card');
            if (this.templateSwiper.slides.length <= MAX_TEMPLATE_CARD) {
                $insertTemplateCardBtn.removeClass('d-none');
            }
            this.templateSwiper.update();
        }

        getTemplateJSON() {
            return Promise.resolve().then(() => {
                let $templateCards = this.$elem.find('.template-card');

                // 根據填入的內容自動決定範本訊息是什麼類型
                let template = {};
                try {
                    if (0 === $templateCards.length) {
                        return Promise.reject(new Error(ERRORS.TEMPLATES_EMPTY));
                    } else if (1 < $templateCards.length) {
                        template.type = 'carousel';
                        template.columns = [];

                        let actionCount = void 0;
                        let hasImage = void 0;
                        for (let i = 0; i < $templateCards.length; i++) {
                            let column = this._retrieveTemplateCard($($templateCards.get(i)), template.type);
                            if (undefined === actionCount) {
                                actionCount = column.actions.length;
                            }

                            if (actionCount !== column.actions.length) {
                                throw new Error(ERRORS.ACTIONS_COUNT_SHOULD_SAME);
                            }

                            if (undefined === hasImage) {
                                hasImage = !!column.thumbnailImageUrl;
                            }

                            if (hasImage !== !!column.thumbnailImageUrl) {
                                throw new Error(ERRORS.IMAGE_IS_REQUIRED);
                            }

                            template.columns.push(column);
                        }
                    } else {
                        template.type = 'buttons';
                        let column = this._retrieveTemplateCard($templateCards, template.type);
                        Object.assign(template, column);
                    }
                } catch (ex) {
                    return Promise.reject(ex);
                }

                /** @type {Chatshier.Models.Template} */
                let templateMesssage = {
                    altText: '',
                    type: 'template',
                    template: template
                };
                return templateMesssage;
            });
        }

        enableButtonAction(actionType) {
            if (!BUTTON_ACTIONS[actionType]) {
                return;
            }
            this.enabledActions[actionType] = BUTTON_ACTIONS[actionType];
        }

        disableButtonAction(actionType) {
            if (!BUTTON_ACTIONS[actionType]) {
                return;
            }
            delete this.enabledActions[actionType];
        }

        updateSwiper() {
            this.templateSwiper.update();
        }

        /**
         * @param {JQuery<Element>} $templateCard
         * @param {string} templateType
         */
        _retrieveTemplateCard($templateCard, templateType) {
            /** @type {Chatshier.Models.TemplateColumn} */
            let column = {};

            let templateTitle = $templateCard.find('.template-title').val() || '';
            let templateText = $templateCard.find('.template-text').val() || '';

            if ('carousel' === templateType && !(templateText && templateTitle)) {
                throw new Error(ERRORS.TITLE_AND_TEXT_IS_REQUIRED);
            } else if ('buttons' === templateType && !templateText) {
                throw new Error(ERRORS.TEXT_IS_REQUIRED);
            }
            templateTitle && (column.title = templateTitle);
            templateText && (column.text = templateText);

            let $actionEditors = $templateCard.find('.action-editor');
            if (0 === $actionEditors.length) {
                throw new Error(ERRORS.AT_LEAST_ONE_ACTION);
            }
            column.actions = [];

            for (let j = 0; j < $actionEditors.length; j++) {
                let $actionEditor = $($actionEditors.get(j));
                if (!$actionEditor.hasClass('finished')) {
                    throw new Error(ERRORS.HAS_UNCHECKED_ACTION);
                }

                let $actionContent = $actionEditor.find('.action-content');
                let buttonAction = $actionEditor.find('select[name="buttonAction"]').val();
                let buttonLabel = $actionEditor.find('.label-finish').data('originLabel');

                /** @type {Chatshier.Models.TemplateAction} */
                let action = {
                    label: buttonLabel
                };

                switch (buttonAction) {
                    case BUTTON_ACTIONS.URL:
                        action.type = 'uri';

                        let $actionUrlLink = $actionContent.find('.action-url-link');
                        action.uri = $actionEditor.hasClass('finished') ? $actionUrlLink.val() : $actionUrlLink.data('prevValue');
                        if (!(action.uri.startsWith('http://') || action.uri.startsWith('https://'))) {
                            action.uri = 'http://' + action.uri;
                        }
                        break;
                    case BUTTON_ACTIONS.TEL:
                        action.type = 'uri';
                        let $actionTelNumber = $actionContent.find('.action-tel-number');
                        action.uri = 'tel:' + ($actionEditor.hasClass('finished') ? $actionTelNumber.val() : $actionTelNumber.data('prevValue'));
                        break;
                    case BUTTON_ACTIONS.TEXT:
                        action.type = 'message';
                        action.text = $actionContent.find('.action-single-text').val() || '';
                        break;
                    case BUTTON_ACTIONS.IMAGEMAP:
                        action.type = 'postback';
                        let imagemapAdditionalText = $actionContent.find('.action-imagemap-text').val() || '';
                        let imagemapId = $actionContent.find('.action-imagemap-select').val() || '';
                        let imagemapPostback = {
                            action: 'SEND_IMAGEMAP',
                            imagemapId: imagemapId
                        };
                        imagemapAdditionalText && (imagemapPostback.additionalText = imagemapAdditionalText);
                        action.data = imagemapId ? JSON.stringify(imagemapPostback) : 'none';
                        break;
                    case BUTTON_ACTIONS.TEMPLATE:
                        action.type = 'postback';
                        let templateAdditionalText = $actionContent.find('.action-template-text').val() || '';
                        let templateId = $actionContent.find('.action-template-select').val() || '';
                        let templatePostback = {
                            action: 'SEND_TEMPLATE',
                            templateId: templateId
                        };
                        templateAdditionalText && (templatePostback.additionalText = templateAdditionalText);
                        action.data = templateId ? JSON.stringify(templatePostback) : 'none';
                        break;
                    case BUTTON_ACTIONS.CONSUMER_FORM:
                        action.type = 'postback';
                        action.data = JSON.stringify({ action: 'SEND_CONSUMER_FORM' });
                        break;
                    case BUTTON_ACTIONS.DONATION:
                        action.type = 'postback';
                        action.data = JSON.stringify({ action: 'PAYMENT_CONFIRM' });
                        break;
                    case BUTTON_ACTIONS.APPOINTMENT:
                        action.type = 'postback';
                        action.data = JSON.stringify({ action: 'SEND_APPOINTMENT_CATEGORIES' });
                        break;
                    case BUTTON_ACTIONS.APPOINTMENT_LIST:
                        action.type = 'postback';
                        action.data = JSON.stringify({ action: 'SEND_CONSUMER_APPOINTMENTS' });
                        break;
                    default:
                        action.type = 'postback';
                        action.data = 'none';
                        break;
                }

                column.actions.push(action);
            }

            /** @type {HTMLInputElement} */
            let imageFileInput = $templateCard.find('.image-input[type="file"]').get(0);
            let imageFile = imageFileInput && imageFileInput.files.item(0);
            let imageSrc = $templateCard.find('.image-container img').attr('src');
            imageSrc && (column.thumbnailImageUrl = imageFile || imageSrc);

            let url = $templateCard.find('.image-url-link').val();
            if (url) {
                if (!validUrlPattern.test(url)) {
                    throw new Error(ERRORS.INVALID_URL);
                }

                if (!imageFile && !imageSrc) {
                    throw new Error(ERRORS.MUST_UPLOAD_A_IMAGE);
                }

                column.defaultAction = {
                    type: 'uri',
                    uri: url
                };
            }

            return column;
        }

        /**
         * @param {File} imageFile
         * @returns {Promise<string>}
         */
        _imageFileToBase64(imageFile) {
            if (!imageFile) {
                return Promise.resolve('');
            }

            if (!imageFile.type.startsWith('image')) {
                return Promise.reject(new Error(ERRORS.NOT_A_IMAGE));
            }

            if (imageFile.size > window.CHATSHIER.FILE.IMAGE_MAX_SIZE) {
                $.notify('圖像檔案過大，檔案大小限制為: ' + Math.floor(window.CHATSHIER.FILE.IMAGE_MAX_SIZE / MEGA_BYTE) + ' MB');
                return Promise.reject(new Error(ERRORS.IMAGE_SIZE_TOO_LARGE));
            }

            return new Promise((resolve, reject) => {
                let fileReader = new FileReader();
                fileReader.onerror = reject;
                fileReader.onloadend = () => resolve(fileReader.result);
                fileReader.readAsDataURL(imageFile);
            });
        }

        /**
         * @param {Event} ev
         */
        _addActionEditor(ev) {
            let $targetBtn = $(ev.target);
            $targetBtn = $targetBtn.hasClass('add-action-btn') ? $targetBtn : $targetBtn.parents('.add-action-btn');

            let $actionsContainer = $targetBtn.siblings('#actionsContainer');
            let params = {
                keywordreplies: this._keywordreplies,
                imagemaps: this._imagemaps,
                templates: this._templates,
                enabledActions: this.enabledActions
            };
            let actionEditor = new ActionEditor($actionsContainer.get(0), params);
            actionEditor.onDestroy = () => {
                let actionCount = parseInt($actionsContainer.data('count'), 10);
                $actionsContainer.data('count', --actionCount);
                if (actionCount < MAX_BUTTON_ACTION) {
                    $targetBtn.removeClass('d-none');
                }
            };
            actionEditor.keywordreplies = this._keywordreplies;
            actionEditor.imagemaps = this._imagemaps;
            actionEditor.templates = this._templates;

            let actionCount = parseInt($actionsContainer.data('count'), 10);
            $actionsContainer.data('count', ++actionCount);
            if (actionCount >= MAX_BUTTON_ACTION) {
                $targetBtn.addClass('d-none');
            }
            return actionEditor;
        }
    }

    TemplateBuilder.BUTTON_ACTIONS = BUTTON_ACTIONS;
    TemplateBuilder.ERRORS = ERRORS;
    return TemplateBuilder;
})();
