/// <reference path='../../typings/client/index.d.ts' />

(function() {
    var nowSelectAppId = '';
    var appsData = {};
    var keywordreplies = {};
    var api = window.restfulAPI;

    var $jqDoc = $(document);
    var $keywordreplyAddModal = $('#keywordreply_add_modal');
    var $keywordreplyEditModal = $('#keywordreply_edit_modal');
    var $appDropdown = $('.app-dropdown');
    var $searchBar = $('.search-bar');

    var $openTableElem = null;
    var $draftTableElem = null;
    var $appSelector = null;

    const NO_PERMISSION_CODE = '3.16';

    var userId;
    try {
        var payload = window.jwt_decode(window.localStorage.getItem('jwt'));
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
    // ==========
    // 設定關鍵字新增 modal 相關 element 與事件
    $appSelector = $keywordreplyAddModal.find('.modal-body select[name="keywordreply-app-name"]');
    $keywordreplyAddModal.on('show.bs.modal', function() {
        $keywordreplyAddModal.find('input[name="keywordreply-keyword"]').val('');
        $keywordreplyAddModal.find('textarea[name="keywordreply-text"]').val('');
        $keywordreplyAddModal.find('input[name="keywordreply-is-draft"]').prop('checked', false);
        // 新增 modal 即將顯示事件發生時，將 App 清單更新
        $appSelector.empty();
        for (var appId in appsData) {
            var app = appsData[appId];
            $appSelector.append('<option value="' + appId + '">' + app.name + '</option>');
        }
    });
    $keywordreplyAddModal.find('button.btn-insert-submit').on('click', insertSubmit);
    // ==========

    // ==========
    // 設定關鍵字編輯 modal 相關 element 與事件
    $keywordreplyEditModal.on('show.bs.modal', function(event) {
        // 編輯 modal 即將顯示事件發生時，將欄位資料更新
        var targetRow = $(event.relatedTarget).parent().parent();
        var appId = targetRow.attr('data-title');
        var keywordreplyId = targetRow.prop('id');
        var targetData = keywordreplies[keywordreplyId];

        var $editForm = $keywordreplyEditModal.find('.modal-body form');
        $editForm.find('input[name="keywordreply-keyword"]').val(targetData.keyword);
        $editForm.find('textarea[name="keywordreply-text"]').val(targetData.text);

        // 如果是屬於草稿則顯示 checkbox 否則隱藏
        var checkboxIsDraft = $editForm.find('.form-check.checkbox-is-draft');
        checkboxIsDraft.find('input[name="keywordreply-is-draft"]').prop('checked', !targetData.status);
        if (!targetData.status) {
            checkboxIsDraft.show();
        } else {
            checkboxIsDraft.hide();
        }

        $keywordreplyEditModal.find('button.btn-update-submit').off('click').on('click', function() {
            $keywordreplyEditModal.find('button.btn-update-submit').attr('disabled', 'disabled');
            targetData.keyword = $editForm.find('input[name="keywordreply-keyword"]').val();
            targetData.text = $editForm.find('textarea[name="keywordreply-text"]').val();
            targetData.status = $editForm.find('input[name="keywordreply-is-draft"]').prop('checked') ? 0 : 1;
            targetData.updatedTime = Date.now();

            return api.appsKeywordreplies.update(appId, keywordreplyId, userId, targetData).then(function() {
                $keywordreplyEditModal.modal('hide');
                $.notify('修改成功！', { type: 'success' });
                $keywordreplyEditModal.find('button.btn-update-submit').removeAttr('disabled');
                return loadKeywordsReplies(appId, userId);
            }).catch((resJson) => {
                if (undefined === resJson.status) {
                    $keywordreplyEditModal.modal('hide');
                    $.notify('失敗', { type: 'danger' });
                    $keywordreplyEditModal.find('button.btn-update-submit').removeAttr('disabled');
                    return loadKeywordsReplies(appId, userId);
                }
                if (NO_PERMISSION_CODE === resJson.code) {
                    $keywordreplyEditModal.modal('hide');
                    $.notify('無此權限', { type: 'danger' });
                    $keywordreplyEditModal.find('button.btn-update-submit').removeAttr('disabled');
                    return loadKeywordsReplies(appId, userId);
                }
            });
        });
    });
    // ==========

    $openTableElem = $('#keywordreply_open_table tbody');
    $draftTableElem = $('#keywordreply_draft_table tbody');
    return api.apps.findAll(userId).then(function(respJson) {
        appsData = respJson.data;

        var $dropdownMenu = $appDropdown.find('.dropdown-menu');

        // 必須把訊息資料結構轉換為 chart 使用的陣列結構
        // 將所有的 messages 的物件全部塞到一個陣列之中
        nowSelectAppId = '';
        for (var appId in appsData) {
            var app = appsData[appId];
            if (app.isDeleted || app.type === api.apps.enums.type.CHATSHIER) {
                delete appsData[appId];
                continue;
            }
            $dropdownMenu.append('<a class="dropdown-item" id="' + appId + '">' + app.name + '</a>');
            $appDropdown.find('#' + appId).on('click', appSourceChanged);

            if (!nowSelectAppId) {
                nowSelectAppId = appId;
            }
        }

        if (nowSelectAppId) {
            $appDropdown.find('.dropdown-text').text(appsData[nowSelectAppId].name);
            loadKeywordsReplies(nowSelectAppId, userId);
            $jqDoc.find('button.inner-add').removeAttr('disabled'); // 資料載入完成，才開放USER按按鈕
        }
    });

    function appSourceChanged(ev) {
        nowSelectAppId = ev.target.id;
        $appDropdown.find('.dropdown-text').text(ev.target.text);
        loadKeywordsReplies(nowSelectAppId, userId);
    }

    function loadKeywordsReplies(appId, userId) {
        // 先取得使用者所有的 AppId 清單更新至本地端
        return api.appsKeywordreplies.findAll(appId, userId).then(function(resJson) {
            $openTableElem.empty();
            $draftTableElem.empty();

            let appsKeywordreplis = resJson.data;
            if (appsKeywordreplis && appsKeywordreplis[appId]) {
                keywordreplies = appsKeywordreplis[appId].keywordreplies;
                for (var keywordreplyId in keywordreplies) {
                    var keywordreply = keywordreplies[keywordreplyId];
                    if (keywordreply.isDeleted) {
                        continue;
                    }

                    var trGrop =
                    '<tr id="' + keywordreplyId + '" data-title="' + appId + '">' +
                        '<th data-title="' + keywordreply.keyword + '">' + keywordreply.keyword + '</th>' +
                        '<td data-title="' + keywordreply.text + '">' + keywordreply.text + '</td>' +
                        '<td>' + keywordreply.replyCount + '</td>' +
                        '<td>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-border btn-light fas fa-edit update" id="edit-btn" data-toggle="modal" data-target="#keywordreply_edit_modal" aria-hidden="true"></button>' +
                            '<button type="button" class="mb-1 mr-1 btn btn-danger fas fa-trash-alt remove" id="delete-btn"></button>' +
                        '</td>' +
                    '</tr>';
                    if (!keywordreply.status) {
                        $draftTableElem.append(trGrop);
                    } else {
                        $openTableElem.append(trGrop);
                    }
                }

                $jqDoc.find('td #delete-btn').off('click').on('click', function(event) {
                    var targetRow = $(event.target).parent().parent();
                    var appId = targetRow.attr('data-title');
                    var keywordreplyId = targetRow.prop('id');

                    return showDialog('確定要刪除嗎？').then(function(isOK) {
                        if (!isOK) {
                            return;
                        }

                        return api.appsKeywordreplies.remove(appId, keywordreplyId, userId).then(function() {
                            $.notify('刪除成功！', { type: 'success' });
                            return loadKeywordsReplies(appId, userId);
                        }).catch((resJson) => {
                            if (undefined === resJson.status) {
                                $.notify('失敗', { type: 'danger' });
                            }
                            if (NO_PERMISSION_CODE === resJson.code) {
                                $.notify('無此權限', { type: 'danger' });
                            }
                        });
                    });
                });
            }
        });
    }

    function insertSubmit() {
        $keywordreplyAddModal.find('button.btn-insert-submit').attr('disabled', 'disabled');
        var appId = $appSelector.find('option:selected').val();
        var keyword = $keywordreplyAddModal.find('input[name="keywordreply-keyword"]').val();
        var textContent = $keywordreplyAddModal.find('textarea[name="keywordreply-text"]').val();
        var isDraft = $keywordreplyAddModal.find('input[name="keywordreply-is-draft"]').prop('checked');
        var $errorMsgElem = $keywordreplyAddModal.find('.text-danger.error-msg');

        // ==========
        // 檢查資料有無輸入
        $errorMsgElem.empty().hide();
        if (!appId) {
            $errorMsgElem.text('請選擇目標App').show();
            return;
        } else if (!keyword) {
            $errorMsgElem.text('請輸入關鍵字').show();
            return;
        } else if (!textContent) {
            $errorMsgElem.text('請輸入關鍵字回覆的內容').show();
            return;
        }
        // ==========

        var keywordreply = {
            keyword: keyword,
            subKeywords: '',
            text: textContent,
            replyCount: 0,
            status: isDraft ? 0 : 1,
            createdTime: Date.now(),
            updatedTime: Date.now()
        };

        return api.appsKeywordreplies.insert(appId, userId, keywordreply).then(function(resJson) {
            $keywordreplyAddModal.modal('hide');
            $.notify('新增成功！', { type: 'success' });
            $appDropdown.find('#' + appId).click();
            $keywordreplyAddModal.find('button.btn-insert-submit').removeAttr('disabled');
            return loadKeywordsReplies(appId, userId);
        }).catch((resJson) => {
            if (undefined === resJson.status) {
                $keywordreplyAddModal.modal('hide');
                $keywordreplyAddModal.find('button.btn-insert-submit').removeAttr('disabled');
                $.notify('失敗', { type: 'danger' });
                return loadKeywordsReplies(appId, userId);
            }
            if (NO_PERMISSION_CODE === resJson.code) {
                $keywordreplyAddModal.modal('hide');
                $keywordreplyAddModal.find('button.btn-insert-submit').removeAttr('disabled');
                $.notify('無此權限', { type: 'danger' });
                return loadKeywordsReplies(appId, userId);
            }
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
