/// <reference path='../../typings/client/index.d.ts' />

(function() {
    let nowSelectAppId = '';
    /** @type {Chatshier.Models.Apps} */
    let apps = {};
    /** @type {Chatshier.Models.AppsKeywordreplies} */
    let appsKeywordreplies = {};

    let api = window.restfulAPI;

    const ICONS = {
        LINE: 'fab fa-line fa-fw line-color',
        FACEBOOK: 'fab fa-facebook-messenger fa-fw fb-messsenger-color'
    };

    let $jqDoc = $(document);
    let $appDropdown = $('.app-dropdown');
    let $searchBar = $('.search-bar');

    const NO_PERMISSION_CODE = '3.16';

    let userId;
    try {
        let payload = window.jwt_decode(window.localStorage.getItem('jwt'));
        userId = payload.uid;
    } catch (ex) {
        userId = '';
    }

    $searchBar.on('keyup', function(ev) {
        let searchText = $(this).val().toLocaleLowerCase();
        if (!searchText) {
            $('tbody > tr > :not([data-title*="' + searchText + '"])').parent().removeAttr('style');
            return;
        }
        let code = ev.keyCode || ev.which;
        if (13 === code) {
            // enter鍵
            let target = $('tbody > tr > [data-title*="' + searchText + '"]').parent();
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
        let $keywordreplyModal = $('#keywordreplyModal');
        let $modalAppSelect = $keywordreplyModal.find('.modal-body select[name="keywordreplyAppName"]');

        let ReplyMessageSelector = window.ReplyMessageSelector;
        let replyMessageSelect = new ReplyMessageSelector($keywordreplyModal.find('#rowOfKeyword').get(0));
        replyMessageSelect.userId = userId;

        let modalAppId;
        let modalKeywordreplyId;
        /** @type {Chatshier.Models.Keywordreply} */
        let modalKeywordreply;

        replyMessageSelect.onReplyItemChange = (replyType, _selector) => {
            if (!modalKeywordreply) {
                return;
            }

            'text' === replyType && modalKeywordreply.text && _selector.setMessageText(modalKeywordreply.text);
            'image' === replyType && modalKeywordreply.src && _selector.setImageSrc(modalKeywordreply.src);
            'imagemap' === replyType && modalKeywordreply.imagemap_id && _selector.setImageMap(modalKeywordreply.imagemap_id);
            'template' === replyType && modalKeywordreply.template_id && _selector.setTemplate(modalKeywordreply.template_id);
        };

        $modalAppSelect.on('change', function() {
            replyMessageSelect.appId = modalAppId = $modalAppSelect.val();
            replyMessageSelect.reset();

            let shouldShow = 'FACEBOOK' !== apps[modalAppId].type;
            replyMessageSelect.toggleImageMap(shouldShow);
            replyMessageSelect.toggleTemplate(shouldShow);
        });

        // ==========
        // 設定關鍵字新增 modal 相關 element 與事件
        $keywordreplyModal.on('show.bs.modal', initKeywordreplyModal);
        $keywordreplyModal.on('hide.bs.modal', function() {
            let modalAppId = $modalAppSelect.val();
            if (nowSelectAppId !== modalAppId) {
                $appDropdown.find('#' + modalAppId).trigger('click');
            }
        });

        $keywordreplyModal.on('click', '#insertSubmitBtn', insertKeywordreply);
        $keywordreplyModal.on('click', '#updateSubmitBtn', updateKeywordreply);

        function initKeywordreplyModal(ev) {
            let $relatedBtn = $(ev.relatedTarget);
            let $keywordreplyForm = $keywordreplyModal.find('.modal-body form');
            let $isDraftCbx = $keywordreplyForm.find('input[name="keywordreplyIsDraft"]');

            if ($relatedBtn.hasClass('insert-btn')) {
                // 新增 modal 即將顯示事件發生時，將 App 清單更新
                $modalAppSelect.empty();
                for (let _appId in apps) {
                    let app = apps[_appId];
                    $modalAppSelect.append('<option value="' + _appId + '">' + app.name + '</option>');
                }

                modalAppId = nowSelectAppId;
                modalKeywordreplyId = modalKeywordreply = void 0;
                $modalAppSelect.val(modalAppId);
                $modalAppSelect.parents('.form-group').removeClass('d-none');

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
            let $targetRow = $relatedBtn.parents('tr');
            modalAppId = $targetRow.attr('app-id');
            modalKeywordreplyId = $targetRow.attr('keywordreply-id');
            modalKeywordreply = appsKeywordreplies[modalAppId].keywordreplies[modalKeywordreplyId];
            $modalAppSelect.val(modalAppId);
            $modalAppSelect.parents('.form-group').addClass('d-none');

            let keywordreply = modalKeywordreply;
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
        }

        function insertKeywordreply() {
            let $insertSubmitBtn = $keywordreplyModal.find('#insertSubmitBtn');
            $insertSubmitBtn.attr('disabled', true);

            let appId = $modalAppSelect.val();
            let filePath = '';

            return replyMessageSelect.getJSON().then((message) => {
                let keyword = $keywordreplyModal.find('input[name="keywordreplyKeyword"]').val() || '';
                let isDraft = $keywordreplyModal.find('input[name="keywordreplyIsDraft"]').prop('checked');

                filePath = message.originalFilePath;
                let keywordreply = {
                    keyword: keyword,
                    subKeywords: [],
                    status: !isDraft
                };
                let postKeywordreply = Object.assign({}, keywordreply, message);
                delete postKeywordreply.originalFilePath;

                // ==========
                // 檢查必填資料有無正確輸入
                let $errorMsgElem = $keywordreplyModal.find('.text-danger.error-msg').empty();
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
                let _appsKeywordreplies = resJson.data;
                if (!appsKeywordreplies[appId]) {
                    appsKeywordreplies[appId] = { keywordreplies: {} };
                }
                Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);

                let keywordreplyId = Object.keys(appsKeywordreplies[appId].keywordreplies).shift() || '';
                if (filePath && keywordreplyId) {
                    let fileName = filePath.split('/').pop();
                    let toPath = '/apps/' + appId + '/keywordreplies/' + keywordreplyId + '/src/' + fileName;
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
            });
        }

        function updateKeywordreply() {
            let $updateSubmitBtn = $keywordreplyModal.find('#updateSubmitBtn');
            $updateSubmitBtn.attr('disabled', 'disabled');

            let appId = modalAppId;
            let keywordreplyId = modalKeywordreplyId;
            let filePath = '';

            return replyMessageSelect.getJSON().then((message) => {
                let keyword = $keywordreplyModal.find('input[name="keywordreplyKeyword"]').val() || '';
                let isDraft = $keywordreplyModal.find('input[name="keywordreplyIsDraft"]').prop('checked');

                filePath = message.originalFilePath;
                let putKeywordreply = {
                    keyword: keyword,
                    subKeywords: [],
                    status: !isDraft
                };
                Object.assign(putKeywordreply, message);
                delete putKeywordreply.originalFilePath;

                return api.appsKeywordreplies.update(appId, keywordreplyId, userId, putKeywordreply);
            }).then((resJson) => {
                let _appsKeywordreplies = resJson.data;
                if (!appsKeywordreplies[appId]) {
                    appsKeywordreplies[appId] = { keywordreplies: {} };
                }
                Object.assign(appsKeywordreplies[appId].keywordreplies, _appsKeywordreplies[appId].keywordreplies);

                if (filePath && keywordreplyId) {
                    let fileName = filePath.split('/').pop();
                    let toPath = '/apps/' + appId + '/keywordreplies/' + keywordreplyId + '/src/' + fileName;
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
    })();

    let $openTableElem = $('#keywordreply_open_table tbody');
    let $draftTableElem = $('#keywordreply_draft_table tbody');
    return api.apps.findAll(userId).then(function(respJson) {
        apps = respJson.data;

        let $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (let appId in apps) {
            let app = apps[appId];
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
        let $dropdownItem = $(this);
        nowSelectAppId = $dropdownItem.attr('id');
        $appDropdown.find('.dropdown-text').text($dropdownItem.text());
        return loadKeywordsReplies(nowSelectAppId, userId);
    }

    function loadKeywordsReplies(appId, userId) {
        return Promise.resolve().then(() => {
            if (!appsKeywordreplies[appId]) {
                // 先取得使用者所有的 AppId 清單更新至本地端
                return api.appsKeywordreplies.findAll(appId, userId).then((resJson) => {
                    let _appsKeywordreplies = resJson.data;
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

            for (let keywordreplyId in keywordreplies) {
                let keywordreply = keywordreplies[keywordreplyId];

                let keywordreplyRow = (
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
        let $targetRow = $(ev.target).parents('tr');
        let appId = $targetRow.attr('app-id');
        let keywordreplyId = $targetRow.attr('keywordreply-id');

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
})();
