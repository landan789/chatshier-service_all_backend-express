/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var nowSelectAppId = '';
    /** @type {Chatshier.Models.Apps} */
    var apps = {};
    /** @type {Chatshier.Models.AppsImagemaps} */
    var appsImagemaps = {};
    /** @type {Chatshier.Models.AppsKeywordreplies} */
    var appsKeywordreplies = {};
    /** @type {Chatshier.Models.AppsTemplates} */
    var appsTemplates = {};

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

    (function() {
        var modalAppId;
        var modalKeywordreplyId;
        /** @type {Chatshier.Models.Keywordreply} */
        var modalKeywordreply;

        var $keywordreplyModal = $('#keywordreplyModal');
        var $appSelector = $keywordreplyModal.find('.modal-body select[name="keywordreplyAppName"]');

        $keywordreplyModal.find('[data-toggle="tooltip"]').tooltip();

        // ==========
        // 設定關鍵字新增 modal 相關 element 與事件
        $keywordreplyModal.on('show.bs.modal', function(ev) {
            var $relatedBtn = $(ev.relatedTarget);

            // 新增 modal 即將顯示事件發生時，將 App 清單更新
            $appSelector.empty();
            for (var _appId in apps) {
                var app = apps[_appId];
                $appSelector.append('<option value="' + _appId + '">' + app.name + '</option>');
            }

            if ($relatedBtn.hasClass('insert-btn')) {
                modalAppId = nowSelectAppId;
                modalKeywordreplyId = modalKeywordreply = void 0;
                $appSelector.val(modalAppId);

                $keywordreplyModal.find('input[name="keywordreplyKeyword"]').val('');
                $keywordreplyModal.find('textarea[name="keywordreplyText"]').val('');
                $keywordreplyModal.find('input[name="keywordreplyIsDraft"]').prop('checked', false);

                var $replyContentSelect = $keywordreplyModal.find('#replyContentSelect');
                $replyContentSelect.find('.reply-item').removeClass('active');
                $replyContentSelect.find('.reply-item[reply-type="text"]').addClass('active').trigger('click');

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

            var targetData = modalKeywordreply;
            var $keywordreplyForm = $keywordreplyModal.find('.modal-body form');
            $keywordreplyForm.find('input[name="keywordreplyKeyword"]').val(targetData.keyword);
            $keywordreplyForm.find('textarea[name="keywordreplyText"]').val(targetData.text);

            // 如果是屬於草稿則顯示 checkbox 否則隱藏
            var checkboxIsDraft = $keywordreplyForm.find('.checkbox-is-draft');
            checkboxIsDraft.find('input[name="keywordreplyIsDraft"]').prop('checked', !targetData.status);
            if (!targetData.status) {
                checkboxIsDraft.show();
            } else {
                checkboxIsDraft.hide();
            }

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

        $keywordreplyModal.on('click', '#replyContentSelect .reply-item', function() {
            var $contentBtn = $(this);
            $contentBtn.addClass('active').siblings().removeClass('active');

            var appId = $appSelector.val();
            var replyType = $contentBtn.attr('reply-type');

            return Promise.resolve().then(() => {
                switch (replyType) {
                    case 'image':
                        return (
                            '<button type="button" class="btn btn-light btn-sm btn-border upload-image-btn">' +
                                '<i class="fas fa-upload fa-fw"></i>' +
                                '<span class="font-weight-bold">上傳圖片</span>' +
                            '</button>' +
                            '<input class="image-ghost d-none" type="file" name="replyImageFile" accept="image/png,image/jpg,image/jpeg" />' +
                            '<div class="mt-2 w-100 bg-light preview-image-container" style="height: 16rem;">' +
                                '<img class="m-auto preview-image" src="' + (modalKeywordreply ? modalKeywordreply.src : '') + '" alt="" />' +
                            '</div>'
                        );
                    case 'imagemap':
                        return Promise.resolve().then(() => {
                            if (!appsImagemaps[appId]) {
                                return api.appsImagemaps.findAll(appId, userId).then((resJson) => {
                                    var _appsImagemaps = resJson.data;
                                    appsImagemaps[appId] = { imagemaps: {} };
                                    if (!_appsImagemaps[appId]) {
                                        return appsImagemaps[appId].imagemaps;
                                    }
                                    Object.assign(appsImagemaps[appId].imagemaps, _appsImagemaps[appId].imagemaps);
                                    return appsImagemaps[appId].imagemaps;
                                });
                            }
                            return appsImagemaps[appId].imagemaps;
                        }).then((imagemaps) => {
                            return (
                                '<label class="font-weight-bold">' +
                                    '<span class="font-weight-bold">選擇已新增的圖文訊息</span>' +
                                    '<select class="imagemap-select form-control" value="">' +
                                        '<option value="">未選擇</option>' +
                                        (function() {
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
                            if (!appsTemplates[appId]) {
                                return api.appsTemplates.findAll(appId, userId).then((resJson) => {
                                    var _appsTemplates = resJson.data;
                                    appsTemplates[appId] = { templates: {} };
                                    if (!_appsTemplates[appId]) {
                                        return appsTemplates[appId].templates;
                                    }
                                    Object.assign(appsTemplates[appId].templates, _appsTemplates[appId].templates);
                                    return appsTemplates[appId].templates;
                                });
                            }
                            return appsTemplates[appId].templates;
                        }).then((templates) => {
                            return (
                                '<label class="font-weight-bold">' +
                                    '<span class="font-weight-bold">選擇已新增的模板訊息</span>' +
                                    '<select class="template-select form-control" value="">' +
                                        '<option value="">未選擇</option>' +
                                        (function() {
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
                        return '<textarea class="form-control" name="keywordreplyText" style="resize: vertical"></textarea>';
                }
            }).then((html) => {
                var $replyContentWrapper = $keywordreplyModal.find('#replyContentWrapper');
                $replyContentWrapper.html(html);
            });
        });

        $keywordreplyModal.on('click', '#insertSubmitBtn', insertKeywordreply);
        $keywordreplyModal.on('click', '#updateSubmitBtn', updateKeywordreply);
        $keywordreplyModal.on('change', '[name="replyImageFile"]', loadImageForPreview);

        function insertKeywordreply() {
            var $insertSubmitBtn = $keywordreplyModal.find('#insertSubmitBtn');
            $insertSubmitBtn.attr('disabled', true);

            var appId = $appSelector.val();
            var filePath = '';

            return getModalKeywordreply(appId).then((keywordreply) => {
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
                if (appsKeywordreplies[appId]) {
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

            return getModalKeywordreply(appId).then((keywordreply) => {
                filePath = keywordreply.originalFilePath;
                var putKeywordreply = Object.assign({}, keywordreply);
                delete putKeywordreply.originalFilePath;

                return api.appsKeywordreplies.update(appId, keywordreplyId, userId, putKeywordreply);
            }).then((resJson) => {
                var _appsKeywordreplies = resJson.data;
                if (appsKeywordreplies[appId]) {
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
                var $previewImageContainer = $(fileInput).siblings('.preview-image-container');
                var $previewImage = $previewImageContainer.find('.preview-image');
                $previewImage.prop('src', imgBase64);
            }).catch(() => {
                return $.notify('載入失敗', { type: 'danger' });
            });
        }

        function getModalKeywordreply() {
            var keyword = $keywordreplyModal.find('input[name="keywordreplyKeyword"]').val() || '';
            var isDraft = $keywordreplyModal.find('input[name="keywordreplyIsDraft"]').prop('checked');
            var replyType = $keywordreplyModal.find('#replyContentSelect .reply-item.active').attr('reply-type');
            var replyText = $keywordreplyModal.find('textarea[name="keywordreplyText"]').val() || '';

            var keywordreply = {
                keyword: keyword,
                subKeywords: [],
                text: replyText,
                type: replyType,
                status: !isDraft,
                originalFilePath: ''
            };

            return Promise.resolve().then(() => {
                switch (replyType) {
                    case 'image':
                        /** @type {HTMLInputElement} */
                        var replyImageFile = $keywordreplyModal.find('input[name="replyImageFile"]').get(0);
                        var imageFile = replyImageFile.files.item(0);
                        replyImageFile.value = '';

                        return api.image.uploadFile(userId, imageFile).then((resJson) => {
                            keywordreply.src = resJson.data.url;
                            keywordreply.originalFilePath = resJson.data.originalFilePath;
                            return keywordreply;
                        });
                    case 'imagemap':
                        keywordreply.imagemap_id = $keywordreplyModal.find('.imagemap-select').val();
                        break;
                    case 'template':
                        keywordreply.template_id = $keywordreplyModal.find('.template-select').val();
                        break;
                    case 'text':
                    default:
                        break;
                }
                return keywordreply;
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

                var trGrop = (
                    '<tr class="keywordreply-row" app-id="' + appId + '" keywordreply-id="' + keywordreplyId + '">' +
                        '<td data-title="' + keywordreply.keyword + '">' + keywordreply.keyword + '</td>' +
                        '<td class="text-pre" data-title="' + keywordreply.text + '">' + keywordreply.text + '</td>' +
                        '<td>' + keywordreply.replyCount + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update-btn" data-toggle="modal" data-target="#keywordreply_edit_modal" aria-hidden="true"></button>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove-btn"></button>' +
                        '</td>' +
                    '</tr>'
                );

                if (!keywordreply.status) {
                    $draftTableElem.append(trGrop);
                } else {
                    $openTableElem.append(trGrop);
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
