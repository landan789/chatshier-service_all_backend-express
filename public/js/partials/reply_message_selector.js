/// <reference path='../../../typings/client/index.d.ts' />

window.ReplyMessageSelector = (function() {
    let isMobile = ('function' === typeof window.isMobileBrowser) && window.isMobileBrowser();
    let api = window.restfulAPI;

    class ReplyMessageSelector {
        /**
         * @param {HTMLElement} insertAfterElem
         * @typedef {Object} SelectorOptions
         * @property {boolean} [isLabelHide]
         * @property {boolean} [isRemoveButtonShow]
         * @property {string} [appId]
         * @property {string} [userId]
         * @property {Chatshier.Models.AppsImagemaps} [appsImagemaps]
         * @property {Chatshier.Models.AppsTemplates} [appsTemplates]
         * @param {SelectorOptions} [options]
         */
        constructor(insertAfterElem, options) {
            options = options || {};
            this.isLabelHide = !!options.isLabelHide;
            this.isRemoveButtonShow = !!options.isRemoveButtonShow;
            this.appId = options.appId || '';
            this.userId = options.userId || '';
            this.appsImagemaps = options.appsImagemaps || {};
            this.appsTemplates = options.appsTemplates || {};

            /** @type {(replyType: 'text' | 'image' | 'imagemap' | 'template', selector: ReplyMessageSelector) => any} */
            this.onReplyItemChange = void 0;

            this.$selectContainer = $('<div class="card form-group"></div>');
            if (!this.isLabelHide) {
                let $containerLabel = $('<label class="font-weight-bold">回覆內容:</label>');
                $containerLabel.insertAfter(insertAfterElem);
                insertAfterElem = $containerLabel.get(0);
            }
            this.$selectContainer.insertAfter(insertAfterElem);
            this.reset();

            this.$selectContainer.on('click', '.reply-item', this._onClickReplyItem.bind(this));
            this.$selectContainer.on('click', '.upload-image-btn', () => {
                let $uploadImageBtn = this.$selectContainer.find('.upload-image-btn');
                let $fileInput = $uploadImageBtn.siblings('.image-ghost');
                $fileInput.trigger('click');
            });
            this.$selectContainer.on('change', '[name="replyImageFile"]', this._loadImageForPreview.bind(this));
            this.$selectContainer.on('click', '.btn-remove', this.destroy.bind(this));
        }

        get containerElement() {
            return this.$selectContainer && this.$selectContainer.get(0);
        }

        destroy() {
            this.$replyContentWrapper.remove();
            this.$selectContainer.remove();
            this.$selectContainer = this.$replyContentWrapper =
            this.appsImagemaps = this.appsTemplates = this.appId = this.userId =
            this.onReplyItemChange = void 0;
        }

        /**
         * @param {'text' | 'image' | 'imagemap' | 'template'} [replyType='text']
         */
        reset(replyType) {
            replyType = replyType || 'text';
            if (!this.$selectContainer) {
                return Promise.resolve();
            }

            this.$replyContentWrapper = $('<div class="w-100 card-body" id="replyContentWrapper"></div>');
            this.$selectContainer.html(
                '<div class="w-100 p-2 card-header d-flex align-items-center">' +
                    '<div class="w-100 btn-group reply-content-select" id="replyContentSelect">' +
                        '<button type="button" class="btn btn-light reply-item" reply-type="text" data-toggle="tooltip" data-placement="top" title="文字">' +
                            '<i class="fas fa-text-height"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-light reply-item" reply-type="image" data-toggle="tooltip" data-placement="top" title="圖像">' +
                            '<i class="fas fa-image"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-light reply-item" reply-type="imagemap" data-toggle="tooltip" data-placement="top" title="圖文訊息">' +
                            '<i class="fas fa-map"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-light reply-item" reply-type="template" data-toggle="tooltip" data-placement="top" title="模板訊息">' +
                            '<i class="fas fa-clipboard-list"></i>' +
                        '</button>' +
                    '</div>' +
                    (this.isRemoveButtonShow ? '<div class="btn-group">' +
                        '<button type="button" class="btn btn-outline-danger btn-sm btn-remove" style="width: 2rem; height: 2rem; border-radius: 50%;">' +
                            '<i class="fas fa-times"></i>' +
                        '</button>' +
                    '</div>' : '') +
                '</div>'
            );
            this.$selectContainer.append(this.$replyContentWrapper);
            this.$selectContainer.find('[data-toggle="tooltip"]').tooltip();

            let $replyItem = this.$selectContainer.find('.reply-item[reply-type="' + replyType + '"]');
            $replyItem.addClass('active').siblings().removeClass('active');
            return this._onClickReplyItem({ target: $replyItem.get(0) });
        }

        getJSON() {
            if (!this.$selectContainer) {
                return Promise.resolve({});
            }

            let replyType = this.$selectContainer.find('.reply-item.active').attr('reply-type');

            let $messageText = this.$replyContentWrapper.find('[name="messageText"]');
            let emojioneAreaData = $messageText.data('emojioneArea');
            let replyText = emojioneAreaData ? emojioneAreaData.getText() || '' : '';
            let replySrc = this.$replyContentWrapper.find('.image-container img').prop('src') || '';

            let json = {
                text: replyText,
                type: replyType,
                src: replySrc,
                originalFilePath: '',
                imagemap_id: '',
                template_id: ''
            };

            return Promise.resolve().then(() => {
                switch (replyType) {
                    case 'image':
                        /** @type {HTMLInputElement} */
                        let replyImageFile = this.$replyContentWrapper.find('input[name="replyImageFile"]').get(0);
                        let imageFile = replyImageFile.files.item(0);
                        replyImageFile.value = '';

                        if (!imageFile) {
                            return json;
                        }

                        return api.image.uploadFile(this.userId, imageFile).then((resJson) => {
                            json.src = resJson.data.url;
                            json.originalFilePath = resJson.data.originalFilePath;
                            return json;
                        });
                    case 'imagemap':
                        json.imagemap_id = this.$replyContentWrapper.find('.imagemap-select').val() || '';
                        break;
                    case 'template':
                        json.template_id = this.$replyContentWrapper.find('.template-select').val() || '';
                        break;
                    case 'text':
                    default:
                        break;
                }
                return json;
            });
        }

        getMessageText() {
            if (!this.$replyContentWrapper) {
                return '';
            }
            return this.$replyContentWrapper.find('[name="messageText"]').val() || '';
        }

        /**
         * @param {string} text
         */
        setMessageText(text) {
            if (!this.$replyContentWrapper) {
                return;
            }

            let $messageText = this.$replyContentWrapper.find('[name="messageText"]');
            let emojioneAreaData = $messageText.data('emojioneArea');
            emojioneAreaData.setText(text);
            return emojioneAreaData;
        }

        /**
         * @param {string} src
         */
        setImageSrc(src) {
            if (!this.$replyContentWrapper) {
                return;
            }

            let $imageContainer = this.$replyContentWrapper.find('.image-container');
            if (src) {
                $imageContainer.find('.image-icon-wrapper').remove();
            }
            return $imageContainer.find('img').prop('src', src);
        }

        /**
         * @param {string} imagemapId
         */
        setImageMap(imagemapId) {
            if (!this.$replyContentWrapper) {
                return;
            }
            return this.$replyContentWrapper.find('.imagemap-select').val(imagemapId);
        }

        setTemplate(templateId) {
            if (!this.$replyContentWrapper) {
                return;
            }
            return this.$replyContentWrapper.find('.template-select').val(templateId);
        }

        /**
         * @param {boolean} [shouldShow]
         */
        toggleImageMap(shouldShow) {
            let $imagemapBtn = this.$selectContainer.find('.btn[reply-type="imagemap"]');
            if (undefined === shouldShow) {
                $imagemapBtn.toggleClass('d-none');
            } else {
                shouldShow ? $imagemapBtn.removeClass('d-none') : $imagemapBtn.addClass('d-none');
            }

            if ($imagemapBtn.hasClass('active')) {
                let $replyItem = this.$selectContainer.find('.reply-item[reply-type="text"]');
                $replyItem.addClass('active').siblings().removeClass('active');
                return this._onClickReplyItem({ target: $replyItem.get(0) });
            }
        }

        /**
         * @param {boolean} [shouldShow]
         */
        toggleTemplate(shouldShow) {
            let $templateBtn = this.$selectContainer.find('.btn[reply-type="template"]');
            if (undefined === shouldShow) {
                $templateBtn.toggleClass('d-none');
            } else {
                shouldShow ? $templateBtn.removeClass('d-none') : $templateBtn.addClass('d-none');
            }

            if ($templateBtn.hasClass('active')) {
                let $replyItem = this.$selectContainer.find('.reply-item[reply-type="text"]');
                $replyItem.addClass('active').siblings().removeClass('active');
                return this._onClickReplyItem({ target: $replyItem.get(0) });
            }
        }

        _onClickReplyItem(ev) {
            let $evTarget = $(ev.target);
            let $contentBtn = $evTarget.hasClass('reply-item') ? $evTarget : $evTarget.parents('.reply-item');
            $contentBtn.addClass('active').siblings().removeClass('active');

            let appId = this.appId;
            let userId = this.userId;
            let replyType = $contentBtn.attr('reply-type');

            return Promise.resolve().then(() => {
                switch (replyType) {
                    case 'image':
                        return (
                            '<button type="button" class="btn btn-light btn-sm btn-border upload-image-btn">' +
                                '<i class="mr-1 fas fa-cloud-upload-alt fa-fw"></i>' +
                                '<span class="font-weight-bold">上傳圖像</span>' +
                            '</button>' +
                            '<input class="image-ghost d-none" type="file" name="replyImageFile" accept="image/png,image/jpg,image/jpeg" />' +
                            '<div class="position-relative mt-2 w-100 image-container" style="height: 16rem;">' +
                                '<div class="h-100 d-flex align-items-center image-icon-wrapper">' +
                                    '<i class="m-auto fas fa-image fa-4x text-light"></i>' +
                                '</div>' +
                                '<img class="image-fit" src="" alt="" />' +
                            '</div>'
                        );
                    case 'imagemap':
                        return Promise.resolve().then(() => {
                            if (!this.appsImagemaps[appId]) {
                                return api.appsImagemaps.findAll(appId, userId).then((resJson) => {
                                    let _appsImagemaps = resJson.data;
                                    this.appsImagemaps[appId] = { imagemaps: {} };
                                    if (!_appsImagemaps[appId]) {
                                        return this.appsImagemaps[appId].imagemaps;
                                    }
                                    Object.assign(this.appsImagemaps[appId].imagemaps, _appsImagemaps[appId].imagemaps);
                                    return this.appsImagemaps[appId].imagemaps;
                                });
                            }
                            return this.appsImagemaps[appId].imagemaps;
                        }).then((imagemaps) => {
                            return (
                                '<label class="w-100 col-form-label font-weight-bold">' +
                                    (this.isFacebookAlertShow ? '<p class="text-danger small facebook-warning">Facebook 的用戶尚未支援圖文訊息</p>' : '') +
                                    '<div class="mb-2 font-weight-bold">選擇已新增的圖文訊息:</div>' +
                                    '<select class="imagemap-select form-control" value="">' +
                                        '<option value="">未選擇</option>' +
                                        (() => {
                                            return Object.keys(imagemaps).map((imagemapId) => {
                                                let imagemap = imagemaps[imagemapId];
                                                return '<option value="' + imagemapId + '">' + imagemap.altText + '</option>';
                                            }).join('');
                                        })() +
                                    '</select>' +
                                '</label>'
                            );
                        });
                    case 'template':
                        return Promise.resolve().then(() => {
                            if (!this.appsTemplates[appId]) {
                                return api.appsTemplates.findAll(appId, userId).then((resJson) => {
                                    let _appsTemplates = resJson.data;
                                    this.appsTemplates[appId] = { templates: {} };
                                    if (!_appsTemplates[appId]) {
                                        return this.appsTemplates[appId].templates;
                                    }
                                    Object.assign(this.appsTemplates[appId].templates, _appsTemplates[appId].templates);
                                    return this.appsTemplates[appId].templates;
                                });
                            }
                            return this.appsTemplates[appId].templates;
                        }).then((templates) => {
                            return (
                                '<label class="w-100 col-form-label font-weight-bold">' +
                                    (this.isFacebookAlertShow ? '<p class="text-danger small facebook-warning">Facebook 的用戶尚未支援到模板訊息</p>' : '') +
                                    '<div class="mb-2 font-weight-bold">選擇已新增的模板訊息:</div>' +
                                    '<select class="template-select form-control" value="">' +
                                        '<option value="">未選擇</option>' +
                                        (() => {
                                            return Object.keys(templates).map((templateId) => {
                                                let template = templates[templateId];
                                                return '<option value="' + templateId + '">' + template.altText + '</option>';
                                            }).join('');
                                        })() +
                                    '</select>' +
                                '</label>'
                            );
                        });
                    case 'text':
                    default:
                        return '<textarea class="form-control message-text" name="messageText" style="resize: vertical" placeholder="在此輸入文字"></textarea>';
                }
            }).then((html) => {
                let $replyContentWrapper = this.$replyContentWrapper;
                $replyContentWrapper.html(html);

                if ('text' === replyType) {
                    $replyContentWrapper.addClass('p-0');

                    if (!isMobile) {
                        let $messageText = $replyContentWrapper.find('[name="messageText"]');
                        $messageText.emojioneArea({
                            placeholder: $messageText.attr('placeholder') || '',
                            searchPlaceholder: '搜尋',
                            buttonTitle: '',
                            autocomplete: false
                        });

                        let emojioneAreaData = $messageText.data('emojioneArea');
                        emojioneAreaData.setText('');
                    }
                } else {
                    $replyContentWrapper.removeClass('p-0');
                }
                ('function' === typeof this.onReplyItemChange) && this.onReplyItemChange(replyType, this);
            });
        }

        _loadImageForPreview(ev) {
            /** @type {HTMLInputElement} */
            let fileInput = ev.target;

            return new Promise((resolve, reject) => {
                let replyImageFile = fileInput.files.item(0);
                let fileReader = new FileReader();
                fileReader.onloadend = () => resolve(fileReader.result);
                fileReader.onerror = (err) => reject(err);
                fileReader.readAsDataURL(replyImageFile);
            }).then((imgBase64) => {
                return this.setImageSrc(imgBase64 || '');
            }).catch(() => {
                return $.notify('圖像載入失敗', { type: 'danger' });
            });
        }
    }

    return ReplyMessageSelector;
})();
