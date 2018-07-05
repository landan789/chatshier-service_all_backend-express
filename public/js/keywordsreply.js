/// <reference path='../../typings/client/index.d.ts' />

var ReplyMessageSelector = (function() {
    var isMobile = ('function' === typeof window.isMobileBrowser) && window.isMobileBrowser();
    var api = window.restfulAPI;

    /**
     * @param {HTMLElement} insertAfterElem
     * @param {string} [appId]
     * @param {string} [userId]
     * @param {Chatshier.Models.AppsImagemaps} [appsImagemaps]
     * @param {Chatshier.Models.AppsTemplates} [appsTemplates]
     */
    function ReplyMessageSelector(insertAfterElem, appId, userId, appsImagemaps, appsTemplates) {
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
    }

    /**
     * @param {'text' | 'image' | 'imagemap' | 'template'} [replyType='text']
     */
    ReplyMessageSelector.prototype.reset = function(replyType) {
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

        var $replyItem = this.$selectContainer.find('.reply-item[reply-type="' + replyType + '"]');
        $replyItem.addClass('active').siblings().removeClass('active');
        return this._onClickReplyItem({ target: $replyItem.get(0) });
    };

    ReplyMessageSelector.prototype._onClickReplyItem = function(ev) {
        var $evTarget = $(ev.target);
        var $contentBtn = $evTarget.hasClass('reply-item') ? $evTarget : $evTarget.parents('.reply-item');
        $contentBtn.addClass('active').siblings().removeClass('active');

        var appId = this.appId;
        var userId = this.userId;
        var replyType = $contentBtn.attr('reply-type');

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
                                var _appsImagemaps = resJson.data;
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
                                            var imagemap = imagemaps[imagemapId];
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
                                var _appsTemplates = resJson.data;
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
                                            var template = templates[templateId];
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
            var $replyContentWrapper = this.$replyContentWrapper;
            $replyContentWrapper.html(html);

            if (!isMobile && 'text' === replyType) {
                var $messageText = this.$replyContentWrapper.find('[name="messageText"]');
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
    };

    ReplyMessageSelector.prototype.getJSON = function() {
        var replyType = this.$selectContainer.find('.reply-item.active').attr('reply-type');
        var replyText = this.$replyContentWrapper.find('[name="messageText"]').val() || '';

        var json = {
            text: replyText,
            type: replyType,
            src: '',
            originalFilePath: '',
            imagemap_id: '',
            template_id: ''
        };

        return Promise.resolve().then(() => {
            switch (replyType) {
                case 'image':
                    /** @type {HTMLInputElement} */
                    var replyImageFile = this.$replyContentWrapper.find('input[name="replyImageFile"]').get(0);
                    var imageFile = replyImageFile.files.item(0);
                    replyImageFile.value = '';

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
    };

    ReplyMessageSelector.prototype.getMessageText = function() {
        return this.$replyContentWrapper.find('[name="messageText"]').val() || '';
    };

    ReplyMessageSelector.prototype.setMessageText = function(text) {
        return this.$replyContentWrapper.find('[name="messageText"]').val(text);
    };

    ReplyMessageSelector.prototype.setImageSrc = function(src) {
        return this.$replyContentWrapper.find('.image-container img').prop('src', src);
    };

    ReplyMessageSelector.prototype.setImageMap = function(imagemapId) {
        return this.$replyContentWrapper.find('.imagemap-select').val(imagemapId);
    };

    ReplyMessageSelector.prototype.setTemplate = function(templateId) {
        return this.$replyContentWrapper.find('.template-select').val(templateId);
    };

    return ReplyMessageSelector;
})();

(function() {
    var nowSelectAppId = '';
    /** @type {Chatshier.Models.Apps} */
    var apps = {};
    /** @type {Chatshier.Models.AppsKeywordreplies} */
    var appsKeywordreplies = {};

    var api = window.restfulAPI;

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    var $jqDoc = $(document);
    var $appDropdown = $('.app-dropdown');
    var $searchBar = $('.search-bar');

    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $searchBar.on('keyup', function(ev) {
        var searchText = $(this).val().toLocaleLowerCase();
        if (!searchText) {
            $('tbody > tr > :not([data-title*="' + searchText + '"])').parent().removeAttr('style');
            return;
        }
        var code = ev.keyCode || ev.which;
        if (13 === code) {
            // enter鍵
            var target = $('tbody > tr > [data-title*="' + searchText + '"]').parent();
            if (0 === target.length) {
                $('tbody > tr ').hide();
            } else {
                $('.table>tbody > tr').hide();
                target.show();
            }
        }
    });

    $jqDoc.on('click', '.keywordreply-row .remove-btn', removeKeywordreply);

    // 停用所有 form 的提交
    $jqDoc.on('submit', 'form', function(ev) { return ev.preventDefault(); });

    (function() {
        var modalAppId;
        var modalKeywordreplyId;
        /** @type {Chatshier.Models.Keywordreply} */
        var modalKeywordreply;

        var $keywordreplyModal = $('#keywordreplyModal');
        var $appSelector = $keywordreplyModal.find('.modal-body select[name="keywordreplyAppName"]');
        var replyMessageSelect = new ReplyMessageSelector(document.getElementById('rowOfKeyword'));
        replyMessageSelect.userId = userId;

        replyMessageSelect.onReplyItemChange = function(replyType) {
            if (!modalKeywordreply) {
                return;
            }

            'text' === replyType && modalKeywordreply.text && replyMessageSelect.setMessageText(modalKeywordreply.text);
            'image' === replyType && modalKeywordreply.src && replyMessageSelect.setImageSrc(modalKeywordreply.src);
            'imagemap' === replyType && modalKeywordreply.imagemap_id && replyMessageSelect.setImageMap(modalKeywordreply.imagemap_id);
            'template' === replyType && modalKeywordreply.template_id && replyMessageSelect.setTemplate(modalKeywordreply.template_id);
        };

        $keywordreplyModal.find('[data-toggle="tooltip"]').tooltip();
        $appSelector.on('change', function() {
            var modalAppId = $appSelector.val();
            replyMessageSelect.appId = modalAppId;
            replyMessageSelect.reset();
        });

        // ==========
        // 設定關鍵字新增 modal 相關 element 與事件
        $keywordreplyModal.on('show.bs.modal', function(ev) {
            var $relatedBtn = $(ev.relatedTarget);
            var $keywordreplyForm = $keywordreplyModal.find('.modal-body form');
            var $isDraftCbx = $keywordreplyForm.find('input[name="keywordreplyIsDraft"]');

            if ($relatedBtn.hasClass('insert-btn')) {
                // 新增 modal 即將顯示事件發生時，將 App 清單更新
                $appSelector.empty();
                for (var _appId in apps) {
                    var app = apps[_appId];
                    $appSelector.append('<option value="' + _appId + '">' + app.name + '</option>');
                }

                modalAppId = nowSelectAppId;
                modalKeywordreplyId = modalKeywordreply = void 0;
                $appSelector.val(modalAppId);
                $appSelector.parents('.form-group').removeClass('d-none');

                $keywordreplyForm.find('input[name="keywordreplyKeyword"]').val('');
                $keywordreplyForm.find('textarea[name="keywordreplyText"]').val('');
                $isDraftCbx.prop('checked', false);
                $isDraftCbx.parents('.form-group').removeClass('d-none');

                replyMessageSelect.appId = modalAppId;
                replyMessageSelect.reset('text');

                $keywordreplyModal.find('#insertSubmitBtn').removeClass('d-none');
                $keywordreplyModal.find('#updateSubmitBtn').addClass('d-none');
                return;
            }

            // 設定關鍵字編輯 modal 相關 element 與事件
            // 編輯 modal 即將顯示事件發生時，將欄位資料更新
            var $targetRow = $relatedBtn.parents('tr');
            modalAppId = $targetRow.attr('app-id');
            modalKeywordreplyId = $targetRow.attr('keywordreply-id');
            modalKeywordreply = appsKeywordreplies[modalAppId].keywordreplies[modalKeywordreplyId];
            $appSelector.val(modalAppId);
            $appSelector.parents('.form-group').addClass('d-none');

            var keywordreply = modalKeywordreply;
            $keywordreplyForm.find('input[name="keywordreplyKeyword"]').val(keywordreply.keyword);
            $keywordreplyForm.find('textarea[name="keywordreplyText"]').val(keywordreply.text);

            // 如果是屬於草稿則顯示 checkbox 否則隱藏
            $isDraftCbx.prop('checked', !keywordreply.status);
            if (!keywordreply.status) {
                $isDraftCbx.parents('.form-group').removeClass('d-none');
            } else {
                $isDraftCbx.parents('.form-group').addClass('d-none');
            }

            replyMessageSelect.appId = modalAppId;
            replyMessageSelect.reset(keywordreply.type);

            $keywordreplyModal.find('#updateSubmitBtn').removeClass('d-none');
            $keywordreplyModal.find('#insertSubmitBtn').addClass('d-none');
        });

        $keywordreplyModal.on('hide.bs.modal', function() {
            var modalAppId = $appSelector.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        $keywordreplyModal.on('click', '.upload-image-btn', function() {
            var $uploadImageBtn = $(this);
            var $fileInput = $uploadImageBtn.siblings('.image-ghost');
            $fileInput.trigger('click');
        });

        $keywordreplyModal.on('click', '#insertSubmitBtn', insertKeywordreply);
        $keywordreplyModal.on('click', '#updateSubmitBtn', updateKeywordreply);
        $keywordreplyModal.on('change', '[name="replyImageFile"]', loadImageForPreview);

        function insertKeywordreply() {
            var $insertSubmitBtn = $keywordreplyModal.find('#insertSubmitBtn');
            $insertSubmitBtn.attr('disabled', true);

            var appId = $appSelector.val();
            var filePath = '';

            return replyMessageSelect.getJSON().then((json) => {
                var keyword = $keywordreplyModal.find('input[name="keywordreplyKeyword"]').val() || '';
                var isDraft = $keywordreplyModal.find('input[name="keywordreplyIsDraft"]').prop('checked');

                var keywordreply = {
                    keyword: keyword,
                    subKeywords: [],
                    status: !isDraft
                };
                Object.assign(keywordreply, json);

                filePath = keywordreply.originalFilePath;
                var postKeywordreply = Object.assign({}, keywordreply);
                delete postKeywordreply.originalFilePath;

                // ==========
                // 檢查必填資料有無正確輸入
                var $errorMsgElem = $keywordreplyModal.find('.text-danger.error-msg').empty();
                $errorMsgElem.addClass('d-none');
                if (!appId) {
                    $errorMsgElem.text('請選擇目標App').removeClass('d-none');
                    return;
                } else if (!keywordreply.keyword) {
                    $errorMsgElem.text('請輸入關鍵字').removeClass('d-none');
                    return;
                }
                // ==========

                return api.appsKeywordreplies.insert(appId, userId, postKeywordreply);
            }).then(function(resJson) {
                var _appsKeywordreplies = resJson.data;
                if (!appsKeywordreplies[appId]) {
                    appsKeywordreplies[appId] = { keywordreplies: {} };
                }
                Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);

                var keywordreplyId = Object.keys(appsKeywordreplies[appId].keywordreplies).shift() || '';
                if (filePath && keywordreplyId) {
                    var fileName = filePath.split('/').pop();
                    var toPath = '/apps/' + appId + '/keywordreplies/' + keywordreplyId + '/src/' + fileName;
                    return api.image.moveFile(userId, filePath, toPath);
                }
            }).then(() => {
                $insertSubmitBtn.removeAttr('disabled');
                $keywordreplyModal.modal('hide');
                $.notify('新增成功！', { type: 'success' });
                return loadKeywordsReplies(appId, userId);
            }).catch((resJson) => {
                $insertSubmitBtn.removeAttr('disabled');
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                } else {
                    $.notify('新增失敗', { type: 'danger' });
                }
                return loadKeywordsReplies(appId, userId);
            });
        }

        function updateKeywordreply() {
            var $updateSubmitBtn = $keywordreplyModal.find('#updateSubmitBtn');
            $updateSubmitBtn.attr('disabled', 'disabled');

            var appId = modalAppId;
            var keywordreplyId = modalKeywordreplyId;
            var filePath = '';

            return replyMessageSelect.getJSON().then((json) => {
                var keyword = $keywordreplyModal.find('input[name="keywordreplyKeyword"]').val() || '';
                var isDraft = $keywordreplyModal.find('input[name="keywordreplyIsDraft"]').prop('checked');

                filePath = json.originalFilePath;
                var putKeywordreply = {
                    keyword: keyword,
                    subKeywords: [],
                    status: !isDraft
                };
                Object.assign(putKeywordreply, json);
                delete putKeywordreply.originalFilePath;

                return api.appsKeywordreplies.update(appId, keywordreplyId, userId, putKeywordreply);
            }).then((resJson) => {
                var _appsKeywordreplies = resJson.data;
                if (!appsKeywordreplies[appId]) {
                    appsKeywordreplies[appId] = { keywordreplies: {} };
                }
                Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);

                if (filePath && keywordreplyId) {
                    var fileName = filePath.split('/').pop();
                    var toPath = '/apps/' + appId + '/keywordreplies/' + keywordreplyId + '/src/' + fileName;
                    return api.image.moveFile(userId, filePath, toPath);
                }
            }).then(() => {
                $updateSubmitBtn.removeAttr('disabled');
                $keywordreplyModal.modal('hide');
                $.notify('修改成功！', { type: 'success' });
                return loadKeywordsReplies(appId, userId);
            }).catch((resJson) => {
                $updateSubmitBtn.removeAttr('disabled');
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                } else {
                    $.notify('修改失敗', { type: 'danger' });
                }
                return loadKeywordsReplies(appId, userId);
            });
        }

        function loadImageForPreview(ev) {
            /** @type {HTMLInputElement} */
            var fileInput = ev.target;

            return new Promise((resolve, reject) => {
                var replyImageFile = fileInput.files.item(0);
                var fileReader = new FileReader();
                fileReader.onloadend = () => resolve(fileReader.result);
                fileReader.onerror = (err) => reject(err);
                fileReader.readAsDataURL(replyImageFile);
            }).then((imgBase64) => {
                var $previewImageContainer = $(fileInput).siblings('.image-container');
                var $previewImage = $previewImageContainer.find('img');
                $previewImage.prop('src', imgBase64);
            }).catch(() => {
                return $.notify('載入失敗', { type: 'danger' });
            });
        }
    })();

    var $openTableElem = $('#keywordreply_open_table tbody');
    var $draftTableElem = $('#keywordreply_draft_table tbody');
    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in apps) {
            var app = apps[appId];
            if (app.isDeleted ||
                app.type === api.apps.TYPES.CHATSHIER) {
                delete apps[appId];
                continue;
            }
            $dropdownMenu.append(
                '<a class="px-3 dropdown-item" id="' + appId + '">' +
                    '<i class="' + ICONS[app.type] + '"></i>' +
                    app.name +
                '</a>'
            );
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(apps[nowSelectAppId].name);
            loadKeywordsReplies(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged() {
        var $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadKeywordsReplies(nowSelectAppId, userId);
    }

    function loadKeywordsReplies(appId, userId) {
        return Promise.resolve().then(() => {
            if (!appsKeywordreplies[appId]) {
                // 先取得使用者所有的 AppId 清單更新至本地端
                return api.appsKeywordreplies.findAll(appId, userId).then((resJson) => {
                    var _appsKeywordreplies = resJson.data;
                    appsKeywordreplies[appId] = { keywordreplies: {} };
                    if (!_appsKeywordreplies[appId]) {
                        return appsKeywordreplies[appId].keywordreplies;
                    }
                    Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);
                    return appsKeywordreplies[appId].keywordreplies;
                });
            }
            return appsKeywordreplies[appId].keywordreplies;
        }).then((keywordreplies) => {
            $openTableElem.empty();
            $draftTableElem.empty();

            for (var keywordreplyId in keywordreplies) {
                var keywordreply = keywordreplies[keywordreplyId];

                var keywordreplyRow = (
                    '<tr class="keywordreply-row" app-id="' + appId + '" keywordreply-id="' + keywordreplyId + '">' +
                        '<td data-title="' + keywordreply.keyword + '">' + keywordreply.keyword + '</td>' +
                        (function() {
                            if ('text' === keywordreply.type) {
                                return '<td class="text-pre" data-title="' + keywordreply.text + '">' + keywordreply.text + '</td>';
                            } else if ('image' === keywordreply.type) {
                                return (
                                    '<td class="text-pre">' +
                                        '<label>圖像</label>' +
                                        '<div class="position-relative image-container" style="width: 6rem; height: 6rem;">' +
                                            '<img class="image-fit" src="' + keywordreply.src + '" alt="" />' +
                                        '</div>' +
                                    '</td>'
                                );
                            } else if ('imagemap' === keywordreply.type) {
                                return '<td class="text-pre" data-title="圖文訊息">圖文訊息</td>';
                            } else if ('template' === keywordreply.type) {
                                return '<td class="text-pre" data-title="模板訊息">模板訊息</td>';
                            }
                            return '<td class="text-pre" data-title=""></td>';
                        })() +
                        '<td>' + keywordreply.replyCount + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update-btn" data-toggle="modal" data-target="#keywordreplyModal" aria-hidden="true"></button>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove-btn"></button>' +
                        '</td>' +
                    '</tr>'
                );

                if (!keywordreply.status) {
                    $draftTableElem.append(keywordreplyRow);
                } else {
                    $openTableElem.append(keywordreplyRow);
                }
            }
        });
    }

    function removeKeywordreply(ev) {
        var $targetRow = $(ev.target).parents('tr');
        var appId = $targetRow.attr('app-id');
        var keywordreplyId = $targetRow.attr('keywordreply-id');

        return showDialog('確定要刪除嗎？').then(function(isOK) {
            if (!isOK) {
                return;
            }

            return api.appsKeywordreplies.remove(appId, keywordreplyId, userId).then(function() {
                delete appsKeywordreplies[appId].keywordreplies[keywordreplyId];
                $.notify('刪除成功！', { type: 'success' });
                return loadKeywordsReplies(appId, userId);
            }).catch((resJson) => {
                if (NO_PERMISSION_CODE === resJson.code) {
                    $.notify('無此權限', { type: 'danger' });
                    return;
                }
                $.notify('刪除失敗', { type: 'danger' });
            });
        });
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
})();
