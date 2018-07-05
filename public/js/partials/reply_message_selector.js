/// <reference path='../../../typings/client/index.d.ts' />

window.ReplyMessageSelector = (function() {
    let isMobile = ('function' === typeof window.isMobileBrowser) && window.isMobileBrowser();
    let api = window.restfulAPI;

    class ReplyMessageSelector {
        /**
         * @param {HTMLElement} insertAfterElem
         * @param {string} [appId]
         * @param {string} [userId]
         * @param {Chatshier.Models.AppsImagemaps} [appsImagemaps]
         * @param {Chatshier.Models.AppsTemplates} [appsTemplates]
         */
        constructor(insertAfterElem, appId, userId, appsImagemaps, appsTemplates) {
            this.appId = appId || '';
            this.userId = userId || '';

            /** @type {Chatshier.Models.AppsImagemaps} */
            this.appsImagemaps = appsImagemaps || {};
            /** @type {Chatshier.Models.AppsTemplates} */
            this.appsTemplates = appsTemplates || {};

            /** @type {(replyType: 'text' | 'image' | 'imagemap' | 'template') => any} */
            this.onReplyItemChange = void 0;

            this.$selectContainer = $('<div class="form-group"></div>');
            this.$selectContainer.insertAfter(insertAfterElem);
            this.reset();

            this.$selectContainer.on('click', '.reply-item', this._onClickReplyItem.bind(this));
            this.$selectContainer.on('click', '.upload-image-btn', () => {
                let $uploadImageBtn = this.$selectContainer.find('.upload-image-btn');
                let $fileInput = $uploadImageBtn.siblings('.image-ghost');
                $fileInput.trigger('click');
            });
            this.$selectContainer.on('change', '[name="replyImageFile"]', this._loadImageForPreview.bind(this));
        }

        /**
         * @param {'text' | 'image' | 'imagemap' | 'template'} [replyType='text']
         */
        reset(replyType) {
            replyType = replyType || 'text';

            this.$replyContentWrapper = $('<div class="w-100 input-container" id="replyContentWrapper"></div>');
            this.$selectContainer.html(
                '<label class="font-weight-bold">回覆內容:</label>' +
                '<div class="w-100 mb-2 btn-group reply-content-select" id="replyContentSelect">' +
                    '<button type="button" class="btn btn-info reply-item" reply-type="text" data-toggle="tooltip" data-placement="top" title="文字">' +
                        '<i class="fas fa-text-height fa-2x"></i>' +
                    '</button>' +
                    '<button type="button" class="btn btn-info reply-item" reply-type="image" data-toggle="tooltip" data-placement="top" title="圖像">' +
                        '<i class="fas fa-image fa-2x"></i>' +
                    '</button>' +
                    '<button type="button" class="btn btn-info reply-item" reply-type="imagemap" data-toggle="tooltip" data-placement="top" title="圖文訊息">' +
                        '<i class="fas fa-map fa-2x"></i>' +
                    '</button>' +
                    '<button type="button" class="btn btn-info reply-item" reply-type="template" data-toggle="tooltip" data-placement="top" title="模板訊息">' +
                        '<i class="fas fa-clipboard-list fa-2x"></i>' +
                    '</button>' +
                '</div>'
            );
            this.$selectContainer.append(this.$replyContentWrapper);
            this.$selectContainer.find('[data-toggle="tooltip"]').tooltip();

            let $replyItem = this.$selectContainer.find('.reply-item[reply-type="' + replyType + '"]');
            $replyItem.addClass('active').siblings().removeClass('active');
            return this._onClickReplyItem({ target: $replyItem.get(0) });
        }

        getJSON() {
            let replyType = this.$selectContainer.find('.reply-item.active').attr('reply-type');
            let replyText = this.$replyContentWrapper.find('[name="messageText"]').val() || '';
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
            return this.$replyContentWrapper.find('[name="messageText"]').val() || '';
        }

        setMessageText(text) {
            return this.$replyContentWrapper.find('[name="messageText"]').val(text);
        }

        setImageSrc(src) {
            return this.$replyContentWrapper.find('.image-container img').prop('src', src);
        }

        setImageMap(imagemapId) {
            return this.$replyContentWrapper.find('.imagemap-select').val(imagemapId);
        }

        setTemplate(templateId) {
            return this.$replyContentWrapper.find('.template-select').val(templateId);
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
                                '<img class="image-fit" src="/image/upload.png" alt="" />' +
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

                if (!isMobile && 'text' === replyType) {
                    let $messageText = this.$replyContentWrapper.find('[name="messageText"]');
                    $messageText.emojioneArea({
                        placeholder: $messageText.attr('placeholder') || '',
                        searchPlaceholder: '搜尋',
                        buttonTitle: '',
                        autocomplete: false
                    });
                    $messageText.data('emojioneArea').setText('');
                }

                ('function' === typeof this.onReplyItemChange) && this.onReplyItemChange(replyType);
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
                let $previewImageContainer = $(fileInput).siblings('.image-container');
                let $previewImage = $previewImageContainer.find('img');
                $previewImage.prop('src', imgBase64 || '');
            }).catch(() => {
                return $.notify('載入失敗', { type: 'danger' });
            });
        }
    }

    return ReplyMessageSelector;
})();
