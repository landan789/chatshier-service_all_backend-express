/// <reference path='../../../typings/client/index.d.ts' />

/**
 * 使用 swiper 建立橫向滑動功能
 * @link http://idangero.us/swiper/api/
 */
window.TemplateBuilder = (function() {
    let chatshierCfg = window.chatshier && window.chatshier.config;

    const MAX_TEMPLATE_CARD = 10;
    const MAX_BUTTON_ACTION = 3;
    const BUTTON_ACTIONS = Object.freeze({
        URL: 'URL',
        KEYWORD: 'KEYWORD',
        IMAGE: 'IMAGE',
        TEMPLATE: 'TEMPLATE',
        IMAGEMAP: 'IMAGEMAP',
        TEL: 'TEL'
    });

    const ERRORS = Object.freeze({
        TEMPLATES_EMPTY: 'TEMPLATES_EMPTY',
        TITLE_AND_TEXT_IS_REQUIRED: 'TITLE_AND_TEXT_IS_REQUIRED',
        TEXT_IS_REQUIRED: 'TEXT_IS_REQUIRED',
        AT_LEAST_ONE_ACTION: 'AT_LEAST_ONE_ACTION',
        MUST_UPLOAD_A_IMAGE: 'MUST_UPLOAD_A_IMAGE',
        INVALID_URL: 'INVALID_URL'
    });

    const Swiper = window.Swiper;

    class ActionEditor {
        constructor() {
            this.$elem = $(
                '<form class="mb-2 p-2 card card-body action-editor">' +
                    '<div class="text-center label-finish d-none">' +
                        '<span class="text-primary label-text"></span>' +
                    '</div>' +
                    '<div class="mb-2 input-container editable">' +
                        '<input class="w-100 form-control button-label" type="text" name="buttonLabel" placeholder="按鈕名稱" maxlength="20" />' +
                    '</div>' +
                    '<div class="mb-1 input-group select-container editable">' +
                        '<div class="input-group-prepend">' +
                            '<span class="input-group-text">觸發動作</span>' +
                        '</div>' +
                        '<select class="form-control button-action" name="buttonAction" value="">' +
                            '<option value="" disabled>未選擇</option>' +
                            '<option value="' + BUTTON_ACTIONS.URL + '">前往連結</option>' +
                            '<option value="' + BUTTON_ACTIONS.KEYWORD + '">進行關鍵字回覆</option>' +
                            '<option value="' + BUTTON_ACTIONS.IMAGE + '">發送圖片</option>' +
                            '<option value="' + BUTTON_ACTIONS.TEMPLATE + '">發送指定模板訊息</option>' +
                            '<option value="' + BUTTON_ACTIONS.IMAGEMAP + '">發送指定圖文訊息</option>' +
                            '<option value="' + BUTTON_ACTIONS.TEL + '">撥打電話</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="mb-2 action-content editable"></div>' +

                    '<div class="mb-2 text-right finish-edit-container">' +
                        '<button type="button" class="btn btn-danger btn-sm cancel-btn">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' +
                        '<button type="button" class="ml-2 btn btn-success btn-sm confirm-btn">' +
                            '<i class="fas fa-check"></i>' +
                        '</button>' +
                        '<button type="button" class="ml-2 btn btn-info btn-sm edit-btn d-none">' +
                            '<i class="fas fa-edit"></i>' +
                        '</button>' +
                    '</div>' +
                '</form>'
            );
            this.onDestroy = void 0;

            this.$elem.on('click', '.confirm-btn', this._finishEdit.bind(this));
            this.$elem.on('click', '.edit-btn', this._startEdit.bind(this));
            this.$elem.on('click', '.cancel-btn', this.destroy.bind(this));

            this.$buttonActionSelect = this.$elem.find('select.button-action');
            this.$buttonActionSelect.on('change', (ev) => {
                let buttonAction = ev.target.value;
                let $actionContent = this.$elem.find('.action-content');

                let actionElemsHtml = '';
                switch (buttonAction) {
                    case BUTTON_ACTIONS.URL:
                        actionElemsHtml = (
                            '<div class="mt-2 input-group">' +
                                '<div class="input-group-prepend">' +
                                    '<span class="input-group-text"><i class="fas fa-link"></i></span>' +
                                '</div>' +
                                '<input class="form-control action-url-link" type="url" value="" placeholder="輸入按鈕連結" maxlength="1000" />' +
                            '</div>'
                        );
                        break;
                    case BUTTON_ACTIONS.TEL:
                        actionElemsHtml = (
                            '<div class="mt-2 input-group">' +
                                '<div class="input-group-prepend">' +
                                    '<span class="input-group-text"><i class="fas fa-phone"></i></span>' +
                                '</div>' +
                                '<input class="form-control action-tel-number" type="tel" value="" placeholder="輸入電話號碼" maxlength="10" />' +
                            '</div>'
                        );
                        break;
                    default:
                        break;
                }
                $actionContent.html(actionElemsHtml);
            });
        }

        set buttonAction(value) {
            this.$buttonActionSelect.val(value || '');
        }

        get buttonAction() {
            return this.$buttonActionSelect.val();
        }

        destroy() {
            this.$elem.remove();
            this.$elem = void 0;
            ('function' === typeof this.onDestroy) && this.onDestroy(this);
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
                return $.notify('按鈕文字不可設定為空', { type: 'warning' });
            }

            this.$elem.addClass('finished');
            this.$elem.find('input, select').attr('readonly', true).attr('disabled', true);
            this.$elem.find('.editable').addClass('d-none');
            this.$elem.find('.confirm-btn').addClass('d-none');
            this.$elem.find('.edit-btn').removeClass('d-none');

            let $labelFinish = this.$elem.find('.label-finish');
            $labelFinish.removeClass('d-none').find('.label-text').text(buttonLabel);
        }
    }

    class TemplateBuilder {
        /**
         * @param {HTMLElement} parentElem
         */
        constructor(parentElem) {
            this._id = 'templateBuilder_' + Date.now();
            this.$parentElem = $(parentElem);
            this.$elem = $(
                '<div class="template-builder swiper-container" id="' + this._id + '">' +
                    '<div class="pb-5 swiper-wrapper"></div>' +
                    '<div class="swiper-pagination"></div>' +
                '</div>'
            );
            this.$parentElem.empty().append(this.$elem);
            this._apiUserId = '';

            this.$elem.on('click', '.add-action-btn', this._addActionEditor.bind(this));
            this.$elem.on('click', '.insert-template-card', () => this.insertTemplateCard());
            this.$elem.on('click', '.remove-template-card', this.removeTemplateCard.bind(this));
            this.$elem.on('click', '.template-image-input', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                $(ev.target).parents('.swiper-slide').find('.image-input[type="file"]').trigger('click');
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
                allowTouchMove: false,
                slidesPerView: 'auto',
                spaceBetween: 8,
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

        destroy() {
            this.templateSwiper.detachEvents();
            this.templateSwiper.removeAllSlides();
            this.templateSwiper.destroy(true, true);

            this.$elem.remove();
            this.$elem = this.templateSwiper = void 0;
        }

        /**
         * @param {any[]} [templates]
         */
        initTemplates(templates) {
            if (!(templates instanceof Array)) {
                templates = [];
            }

            this.templateSwiper.removeAllSlides();
            if (0 === templates.length) {
                this.insertTemplateCard();
            } else {
                for (let i = 0; i < templates.length; i++) {
                    this.insertTemplateCard(i, templates[i]);
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

        insertTemplateCard(idx, template) {
            if (!this.templateSwiper) {
                return;
            }
            idx = idx || Math.max(0, this.templateSwiper.slides.length - 1);

            let canRemove = idx > 0;
            this.templateSwiper.addSlide(idx, [
                '<div class="swiper-slide p-2 card card-body template-card" data-index="' + idx + '">' +
                    '<div class="mb-2 d-flex align-items-center template-card-header">' +
                        '<div class="text-dark font-weight-bold">卡片 <span class="card-index">' + (idx + 1) + '</span></div>' +
                        (canRemove ? '<button type="button" class="ml-auto btn btn-danger btn-sm remove-template-card">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' : '') +
                    '</div>' +

                    '<input class="image-input d-none" type="file" accept="image/*" />' +
                    '<div class="position-relative mb-2 p-2 template-image-input">' +
                        '<div class="image-container">' +
                            '<button type="button" class="image-upload-btn">' +
                                '<div><i class="fas fa-image"></i></div>' +
                                '<div>上傳圖片</div>' +
                            '</button>' +
                            '<img class="image-fit" src="" alt="" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="mb-2 input-group">' +
                        '<div class="input-group-prepend">' +
                            '<span class="input-group-text"><i class="fas fa-link"></i></span>' +
                        '</div>' +
                        '<input class="form-control image-url-link" type="url" value="" placeholder="輸入圖片連結" />' +
                    '</div>' +

                    '<div class="mb-2 input-container">' +
                        '<input class="w-100 form-control template-title" placeholder="標題" maxlength="40" />' +
                    '</div>' +

                    '<div class="mb-2 input-container">' +
                        '<input class="w-100 form-control template-text" placeholder="副標題" maxlength="60" />' +
                    '</div>' +

                    '<div class="buttons-container" id="buttonsContainer"></div>' +
                    '<button type="button" class="btn btn-light btn-block add-action-btn" data-count="0">' +
                        '<i class="mr-1 fas fa-plus fa-fw"></i>' +
                        '<span>新增按鈕</span>' +
                    '</button>' +
                '</div>'
            ]);
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

                // 根據填入的內容自動決定模板訊息是什麼類型
                let template = {};
                try {
                    if (0 === $templateCards.length) {
                        return Promise.reject(new Error(ERRORS.TEMPLATES_EMPTY));
                    } else if (1 < $templateCards.length) {
                        template.type = 'carousel';
                        template.columns = [];

                        for (let i = 0; i < $templateCards.length; i++) {
                            let column = this._retrieveTemplateCard($($templateCards.get(i)), template.type);
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

            let $actionEditors = $templateCard.find('.action-editor.finished');
            if (0 === $actionEditors.length) {
                throw new Error(ERRORS.AT_LEAST_ONE_ACTION);
            }
            column.actions = [];

            for (let j = 0; j < $actionEditors.length; j++) {
                let $actionEditor = $($actionEditors.get(j));
                let $actionContent = $actionEditor.find('.action-content');
                let buttonAction = $actionEditor.find('select[name="buttonAction"]').val();
                let buttonLabel = $actionEditor.find('.label-finish .label-text').text();

                /** @type {Chatshier.Models.TemplateAction} */
                let action = {
                    label: buttonLabel
                };

                switch (buttonAction) {
                    case BUTTON_ACTIONS.URL:
                        action.type = 'uri';
                        action.uri = $actionContent.find('.action-url-link').val();
                        if (!(action.uri.startsWith('http://') || action.uri.startsWith('https://'))) {
                            action.uri = 'http://' + action.uri;
                        }
                        break;
                    case BUTTON_ACTIONS.TEL:
                        action.type = 'uri';
                        action.uri = 'tel:' + $actionContent.find('.action-tel-number').val();
                        break;
                    case BUTTON_ACTIONS.KEYWORD:
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

            let imageActionUrl = $templateCard.find('.image-url-link').val();
            if (imageActionUrl) {
                if (!imageActionUrl.startsWith('http')) {
                    throw new Error(ERRORS.INVALID_URL);
                } else if (!imageFile && !imageSrc) {
                    throw new Error(ERRORS.MUST_UPLOAD_A_IMAGE);
                }

                column.defaultAction = {
                    type: 'uri',
                    uri: imageActionUrl
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
                return Promise.reject(new Error('NOT_A_IMAGE'));
            }

            let kiloByte = 1024;
            let megaByte = kiloByte * 1024;
            if (imageFile.size > chatshierCfg.imageFileMaxSize) {
                $.notify('圖像檔案過大，檔案大小限制為: ' + (Math.floor(chatshierCfg.imageFileMaxSize / megaByte)) + ' MB');
                return Promise.reject(new Error('IMAGE_SIZE_TOO_LARGE'));
            }

            return new Promise((resolve, reject) => {
                let fileReader = new FileReader();
                fileReader.onerror = reject;
                fileReader.onloadend = () => resolve(fileReader.result);
                fileReader.readAsDataURL(imageFile);
            });
        }

        _addActionEditor(ev) {
            let $targetBtn = $(ev.target);
            $targetBtn = $targetBtn.hasClass('add-action-btn') ? $targetBtn : $targetBtn.parents('.add-action-btn');

            let actionEditor = new ActionEditor();
            actionEditor.onDestroy = () => {
                let actionCount = parseInt($targetBtn.data('count'), 10);
                $targetBtn.data('count', --actionCount);
                if (actionCount < MAX_BUTTON_ACTION) {
                    $targetBtn.removeClass('d-none');
                }
            };
            actionEditor.$elem.insertBefore($targetBtn);
            actionEditor.buttonAction = '';

            let actionCount = parseInt($targetBtn.data('count'), 10);
            $targetBtn.data('count', ++actionCount);
            if (actionCount >= MAX_BUTTON_ACTION) {
                $targetBtn.addClass('d-none');
            }
        }
    }

    TemplateBuilder.ERRORS = ERRORS;
    return TemplateBuilder;
})();
